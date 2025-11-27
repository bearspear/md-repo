import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import matter from 'gray-matter';

export interface EpubMetadata {
  title: string;
  author?: string;
  language?: string;
  description?: string;
  publisher?: string;
  date?: string;
  rights?: string;
  identifier?: string;
  coverImage?: string; // Base64 or URL
}

export interface EpubChapter {
  id: string;
  title: string;
  content: string; // HTML content
  level: number;
}

export interface EpubOptions {
  splitByHeading: 'h1' | 'h2' | 'none';
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'serif' | 'sans-serif' | 'georgia' | 'palatino' | 'bookerly';
  theme: 'light' | 'dark' | 'sepia';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  textAlign: 'left' | 'justify';
}

@Injectable({
  providedIn: 'root'
})
export class EpubExportService {

  private defaultOptions: EpubOptions = {
    splitByHeading: 'h1',
    includeTableOfContents: true,
    includeCoverPage: true,
    fontSize: 'medium',
    fontFamily: 'georgia',
    theme: 'light',
    lineHeight: 'normal',
    textAlign: 'justify'
  };

  constructor() {
    // Configure marked with syntax highlighting
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        }
      })
    );
  }

  /**
   * Export markdown content as EPUB
   */
  async exportToEpub(
    markdownContent: string,
    metadata: EpubMetadata,
    options: Partial<EpubOptions> = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    // Parse frontmatter if present
    const parsed = matter(markdownContent);
    const content = parsed.content;
    const frontmatter = parsed.data;

    // Merge frontmatter with provided metadata
    const finalMetadata: EpubMetadata = {
      title: metadata.title || frontmatter['title'] || 'Untitled',
      author: metadata.author || frontmatter['author'] || 'Unknown Author',
      language: metadata.language || frontmatter['language'] || 'en',
      description: metadata.description || frontmatter['description'] || '',
      publisher: metadata.publisher || frontmatter['publisher'] || '',
      date: metadata.date || frontmatter['date'] || new Date().toISOString().split('T')[0],
      rights: metadata.rights || frontmatter['rights'] || '',
      identifier: metadata.identifier || `urn:uuid:${this.generateUUID()}`,
      coverImage: metadata.coverImage || frontmatter['cover']
    };

    // Convert markdown to HTML
    let htmlContent = await marked(content);

    // Sanitize HTML for XHTML compatibility
    htmlContent = this.sanitizeHtmlForXhtml(htmlContent);

    // Split into chapters
    const chapters = this.splitIntoChapters(htmlContent, opts.splitByHeading);

    // Create EPUB package
    const zip = new JSZip();

    // Add mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // Add META-INF container
    zip.file('META-INF/container.xml', this.generateContainerXml());

    // Add OEBPS content
    const oebps = zip.folder('OEBPS');
    if (!oebps) throw new Error('Failed to create OEBPS folder');

    // Add stylesheet
    oebps.file('styles.css', this.generateStylesheet(opts));

    // Add cover page if requested
    if (opts.includeCoverPage) {
      oebps.file('cover.xhtml', this.generateCoverPage(finalMetadata));
    }

    // Add table of contents if requested
    if (opts.includeTableOfContents) {
      oebps.file('toc.xhtml', this.generateTocPage(chapters));
    }

    // Add chapter files
    chapters.forEach((chapter, index) => {
      oebps.file(`chapter${index + 1}.xhtml`, this.generateChapterXhtml(chapter, index + 1));
    });

    // Add navigation document (EPUB 3)
    oebps.file('nav.xhtml', this.generateNavDocument(chapters, opts));

    // Add NCX (for EPUB 2 compatibility)
    oebps.file('toc.ncx', this.generateNcx(chapters, finalMetadata, opts));

    // Add content.opf (package document)
    oebps.file('content.opf', this.generateContentOpf(chapters, finalMetadata, opts));

    // Generate and save the EPUB file
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const filename = this.sanitizeFilename(finalMetadata.title) + '.epub';
    saveAs(blob, filename);
  }

  /**
   * Split HTML content into chapters based on heading level
   */
  private splitIntoChapters(html: string, splitBy: 'h1' | 'h2' | 'none'): EpubChapter[] {
    if (splitBy === 'none') {
      return [{
        id: 'chapter1',
        title: 'Content',
        content: html,
        level: 1
      }];
    }

    const chapters: EpubChapter[] = [];
    const headingTag = splitBy;
    const regex = new RegExp(`(<${headingTag}[^>]*>.*?</${headingTag}>)`, 'gi');

    // Split by heading tags
    const parts = html.split(regex);

    let currentChapter: EpubChapter | null = null;
    let chapterIndex = 0;

    for (const part of parts) {
      const headingMatch = part.match(new RegExp(`<${headingTag}[^>]*>(.*?)</${headingTag}>`, 'i'));

      if (headingMatch) {
        // Start new chapter
        if (currentChapter) {
          chapters.push(currentChapter);
        }

        chapterIndex++;
        const title = this.stripHtmlTags(headingMatch[1]);
        currentChapter = {
          id: `chapter${chapterIndex}`,
          title: title || `Chapter ${chapterIndex}`,
          content: part,
          level: splitBy === 'h1' ? 1 : 2
        };
      } else if (part.trim()) {
        if (currentChapter) {
          currentChapter.content += part;
        } else {
          // Content before first heading
          if (part.trim()) {
            chapterIndex++;
            currentChapter = {
              id: `chapter${chapterIndex}`,
              title: 'Introduction',
              content: part,
              level: 1
            };
            chapters.push(currentChapter);
            currentChapter = null;
          }
        }
      }
    }

    // Add last chapter
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    // If no chapters were created, create a single chapter
    if (chapters.length === 0) {
      chapters.push({
        id: 'chapter1',
        title: 'Content',
        content: html,
        level: 1
      });
    }

    return chapters;
  }

  /**
   * Generate container.xml for META-INF
   */
  private generateContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  /**
   * Generate the main stylesheet
   */
  private generateStylesheet(options: EpubOptions): string {
    const fontSizeMap = {
      small: '0.9em',
      medium: '1em',
      large: '1.2em'
    };

    const fontFamilyMap = {
      serif: '"Times New Roman", Times, serif',
      'sans-serif': '"Helvetica Neue", Helvetica, Arial, sans-serif',
      georgia: 'Georgia, "Times New Roman", serif',
      palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
      bookerly: '"Bookerly", "Georgia", "Times New Roman", serif'
    };

    const lineHeightMap = {
      compact: '1.4',
      normal: '1.6',
      relaxed: '1.8'
    };

    const themeColors = {
      light: {
        background: '#ffffff',
        text: '#1a1a1a',
        heading: '#000000',
        link: '#0066cc',
        blockquote: '#4a4a4a',
        codeBg: '#f6f8fa',
        codeText: '#24292e',
        border: '#e0e0e0'
      },
      dark: {
        background: '#1a1a1a',
        text: '#e0e0e0',
        heading: '#ffffff',
        link: '#6db3f2',
        blockquote: '#b0b0b0',
        codeBg: '#2d2d2d',
        codeText: '#e6e6e6',
        border: '#404040'
      },
      sepia: {
        background: '#f4ecd8',
        text: '#5b4636',
        heading: '#3d2914',
        link: '#704214',
        blockquote: '#6b5344',
        codeBg: '#e8e0cc',
        codeText: '#4a3728',
        border: '#d4c4a8'
      }
    };

    const theme = themeColors[options.theme];

    return `/* EPUB Stylesheet - Enhanced Typography */
@page {
  margin: 1in;
}

body {
  font-family: ${fontFamilyMap[options.fontFamily]};
  font-size: ${fontSizeMap[options.fontSize]};
  line-height: ${lineHeightMap[options.lineHeight]};
  margin: 1em;
  padding: 0;
  background-color: ${theme.background};
  color: ${theme.text};
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  orphans: 2;
  widows: 2;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.2;
  color: ${theme.heading};
  page-break-after: avoid;
}

h1 {
  font-size: 2em;
  text-align: center;
  margin-top: 2em;
  page-break-before: always;
}

h2 {
  font-size: 1.5em;
  border-bottom: 1px solid ${theme.border};
  padding-bottom: 0.3em;
}

h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; }
h5 { font-size: 1em; }
h6 { font-size: 0.9em; }

p {
  margin: 0.8em 0;
  text-align: ${options.textAlign};
  text-indent: 1.5em;
  hyphens: auto;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
}

p:first-of-type,
h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
blockquote + p {
  text-indent: 0;
}

/* Drop cap for first paragraph of chapters */
section > p:first-of-type::first-letter {
  float: left;
  font-size: 3.5em;
  line-height: 0.8;
  padding-right: 0.1em;
  margin-top: 0.1em;
  font-weight: bold;
  color: ${theme.heading};
}

a {
  color: ${theme.link};
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

blockquote {
  margin: 1.5em 2em;
  padding: 0.5em 1em;
  border-left: 4px solid ${theme.border};
  font-style: italic;
  color: ${theme.blockquote};
  background-color: ${options.theme === 'dark' ? '#2a2a2a' : options.theme === 'sepia' ? '#e8e0cc' : '#f9f9f9'};
}

code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.85em;
  background-color: ${theme.codeBg};
  color: ${theme.codeText};
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

pre {
  background-color: ${theme.codeBg};
  color: ${theme.codeText};
  padding: 1em;
  overflow-x: auto;
  border-radius: 5px;
  margin: 1em 0;
  border: 1px solid ${theme.border};
}

pre code {
  background: none;
  padding: 0;
  font-size: 0.9em;
}

ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.4em 0;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid ${theme.border};
  padding: 0.6em;
  text-align: left;
}

th {
  background-color: ${theme.codeBg};
  font-weight: bold;
  color: ${theme.heading};
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
}

figure {
  margin: 1.5em 0;
  text-align: center;
}

figcaption {
  font-size: 0.9em;
  font-style: italic;
  color: ${theme.blockquote};
  margin-top: 0.5em;
}

hr {
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 2em 0;
}

/* Small caps for abbreviations */
abbr {
  font-variant: small-caps;
  text-transform: lowercase;
  letter-spacing: 0.05em;
}

/* Cover page styles */
.cover {
  text-align: center;
  page-break-after: always;
  padding: 2em;
}

.cover h1 {
  font-size: 2.5em;
  margin-top: 30%;
  margin-bottom: 0.5em;
  color: ${theme.heading};
}

.cover .author {
  font-size: 1.3em;
  font-style: italic;
  margin-top: 2em;
  color: ${theme.text};
}

.cover .date {
  margin-top: 3em;
  font-size: 0.9em;
  color: ${theme.blockquote};
}

.cover .publisher {
  margin-top: 1em;
  font-size: 0.85em;
  color: ${theme.blockquote};
}

.cover .description {
  margin-top: 3em;
  font-size: 0.95em;
  font-style: italic;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  color: ${theme.blockquote};
}

/* TOC styles */
.toc {
  page-break-after: always;
}

.toc h1 {
  text-align: center;
  margin-bottom: 2em;
  color: ${theme.heading};
}

.toc ol {
  list-style-type: none;
  padding-left: 0;
}

.toc li {
  margin: 0.7em 0;
  padding: 0.3em 0;
  border-bottom: 1px dotted ${theme.border};
}

.toc a {
  text-decoration: none;
  color: ${theme.link};
}

.toc a:hover {
  text-decoration: underline;
}

/* Footnotes */
.footnote {
  font-size: 0.85em;
  vertical-align: super;
}

.footnotes {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid ${theme.border};
  font-size: 0.9em;
}

/* Syntax Highlighting - Theme-aware */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em;
  background: ${theme.codeBg};
  color: ${theme.codeText};
}

${options.theme === 'dark' ? `
/* Dark theme syntax colors */
.hljs-comment,
.hljs-quote {
  color: #8b949e;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-addition {
  color: #ff7b72;
}

.hljs-number,
.hljs-string,
.hljs-meta .hljs-meta-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp {
  color: #a5d6ff;
}

.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #d2a8ff;
}

.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type {
  color: #79c0ff;
}

.hljs-symbol,
.hljs-bullet,
.hljs-subst,
.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-link {
  color: #79c0ff;
}

.hljs-built_in,
.hljs-deletion {
  color: #7ee787;
}
` : `
/* Light/Sepia theme syntax colors */
.hljs-comment,
.hljs-quote {
  color: #6a737d;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-addition {
  color: #d73a49;
}

.hljs-number,
.hljs-string,
.hljs-meta .hljs-meta-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp {
  color: #032f62;
}

.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #6f42c1;
}

.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type {
  color: #005cc5;
}

.hljs-symbol,
.hljs-bullet,
.hljs-subst,
.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-link {
  color: #005cc5;
}

.hljs-built_in,
.hljs-deletion {
  color: #22863a;
}
`}

.hljs-formula {
  background: ${theme.codeBg};
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

/* Print optimizations */
@media print {
  body {
    font-size: 12pt;
  }

  pre, code {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}`;
  }

  /**
   * Generate cover page XHTML
   */
  private generateCoverPage(metadata: EpubMetadata): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${metadata.language}">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeXml(metadata.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section class="cover" epub:type="titlepage">
    <h1>${this.escapeXml(metadata.title)}</h1>
    ${metadata.author ? `<p class="author">by ${this.escapeXml(metadata.author)}</p>` : ''}
    ${metadata.date ? `<p class="date">${this.escapeXml(metadata.date)}</p>` : ''}
  </section>
</body>
</html>`;
  }

  /**
   * Generate table of contents page
   */
  private generateTocPage(chapters: EpubChapter[]): string {
    const tocItems = chapters.map((chapter, index) =>
      `    <li><a href="chapter${index + 1}.xhtml">${this.escapeXml(chapter.title)}</a></li>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section class="toc" epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
${tocItems}
    </ol>
  </section>
</body>
</html>`;
  }

  /**
   * Generate chapter XHTML file
   */
  private generateChapterXhtml(chapter: EpubChapter, index: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="chapter" id="${chapter.id}">
    ${chapter.content}
  </section>
</body>
</html>`;
  }

  /**
   * Generate EPUB 3 navigation document
   */
  private generateNavDocument(chapters: EpubChapter[], options: EpubOptions): string {
    const navItems: string[] = [];

    if (options.includeCoverPage) {
      navItems.push('      <li><a href="cover.xhtml">Cover</a></li>');
    }

    if (options.includeTableOfContents) {
      navItems.push('      <li><a href="toc.xhtml">Table of Contents</a></li>');
    }

    chapters.forEach((chapter, index) => {
      navItems.push(`      <li><a href="chapter${index + 1}.xhtml">${this.escapeXml(chapter.title)}</a></li>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Navigation</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${navItems.join('\n')}
    </ol>
  </nav>
</body>
</html>`;
  }

  /**
   * Generate NCX file for EPUB 2 compatibility
   */
  private generateNcx(chapters: EpubChapter[], metadata: EpubMetadata, options: EpubOptions): string {
    const navPoints: string[] = [];
    let playOrder = 1;

    if (options.includeCoverPage) {
      navPoints.push(`    <navPoint id="navpoint-cover" playOrder="${playOrder++}">
      <navLabel><text>Cover</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`);
    }

    if (options.includeTableOfContents) {
      navPoints.push(`    <navPoint id="navpoint-toc" playOrder="${playOrder++}">
      <navLabel><text>Table of Contents</text></navLabel>
      <content src="toc.xhtml"/>
    </navPoint>`);
    }

    chapters.forEach((chapter, index) => {
      navPoints.push(`    <navPoint id="navpoint-${index + 1}" playOrder="${playOrder++}">
      <navLabel><text>${this.escapeXml(chapter.title)}</text></navLabel>
      <content src="chapter${index + 1}.xhtml"/>
    </navPoint>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${this.escapeXml(metadata.title)}</text>
  </docTitle>
  <navMap>
${navPoints.join('\n')}
  </navMap>
</ncx>`;
  }

  /**
   * Generate content.opf (package document)
   */
  private generateContentOpf(chapters: EpubChapter[], metadata: EpubMetadata, options: EpubOptions): string {
    // Manifest items
    const manifestItems: string[] = [
      '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
      '    <item id="css" href="styles.css" media-type="text/css"/>'
    ];

    if (options.includeCoverPage) {
      manifestItems.push('    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
    }

    if (options.includeTableOfContents) {
      manifestItems.push('    <item id="toc-page" href="toc.xhtml" media-type="application/xhtml+xml"/>');
    }

    chapters.forEach((chapter, index) => {
      manifestItems.push(`    <item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`);
    });

    // Spine items
    const spineItems: string[] = [];

    if (options.includeCoverPage) {
      spineItems.push('    <itemref idref="cover"/>');
    }

    if (options.includeTableOfContents) {
      spineItems.push('    <itemref idref="toc-page"/>');
    }

    chapters.forEach((chapter, index) => {
      spineItems.push(`    <itemref idref="chapter${index + 1}"/>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${metadata.identifier}</dc:identifier>
    <dc:title>${this.escapeXml(metadata.title)}</dc:title>
    <dc:language>${metadata.language}</dc:language>
    ${metadata.author ? `<dc:creator>${this.escapeXml(metadata.author)}</dc:creator>` : ''}
    ${metadata.description ? `<dc:description>${this.escapeXml(metadata.description)}</dc:description>` : ''}
    ${metadata.publisher ? `<dc:publisher>${this.escapeXml(metadata.publisher)}</dc:publisher>` : ''}
    ${metadata.date ? `<dc:date>${metadata.date}</dc:date>` : ''}
    ${metadata.rights ? `<dc:rights>${this.escapeXml(metadata.rights)}</dc:rights>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
${manifestItems.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.join('\n')}
  </spine>
</package>`;
  }

  /**
   * Utility: Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Utility: Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Utility: Strip HTML tags from string
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Utility: Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
  }

  /**
   * Utility: Sanitize HTML for XHTML compatibility
   * Fixes common issues like unclosed tags, self-closing tags, etc.
   */
  private sanitizeHtmlForXhtml(html: string): string {
    // Use DOMParser to fix malformed HTML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

      // Get the cleaned HTML from the body
      const cleanedHtml = doc.body.firstElementChild?.innerHTML || html;

      // Convert back to XHTML-compatible format
      let result = cleanedHtml;

      // Fix void elements to be self-closing (XHTML requirement)
      // Handle tags that may or may not already have />
      result = result.replace(/<br\s*\/?>/gi, '<br/>');
      result = result.replace(/<hr\s*\/?>/gi, '<hr/>');

      // Fix img tags - capture attributes and ensure self-closing
      result = result.replace(/<img\s+([^>]*?)\s*\/?>/gi, (match, attrs) => {
        // Remove any trailing slash from attrs
        attrs = attrs.replace(/\/\s*$/, '').trim();
        return `<img ${attrs}/>`;
      });

      // Fix input tags - capture attributes and ensure self-closing
      result = result.replace(/<input\s+([^>]*?)\s*\/?>/gi, (match, attrs) => {
        // Remove any trailing slash from attrs
        attrs = attrs.replace(/\/\s*$/, '').trim();
        return `<input ${attrs}/>`;
      });

      // Fix meta tags
      result = result.replace(/<meta\s+([^>]*?)\s*\/?>/gi, (match, attrs) => {
        attrs = attrs.replace(/\/\s*$/, '').trim();
        return `<meta ${attrs}/>`;
      });

      // Fix link tags
      result = result.replace(/<link\s+([^>]*?)\s*\/?>/gi, (match, attrs) => {
        attrs = attrs.replace(/\/\s*$/, '').trim();
        return `<link ${attrs}/>`;
      });

      return result;
    } catch (e) {
      // If parsing fails, return original with basic fixes
      return html;
    }
  }
}
