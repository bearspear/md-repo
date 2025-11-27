const EPub = require('epub2').default;
const TurndownService = require('turndown');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs').promises;

class EpubImporter {
  constructor() {
    // Configure Turndown for better Markdown output
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });

    // Add custom rules for better conversion
    this.turndown.addRule('preserveLineBreaks', {
      filter: 'br',
      replacement: () => '\n'
    });

    // Handle images
    this.turndown.addRule('images', {
      filter: 'img',
      replacement: (content, node) => {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        return `![${alt}](${src})`;
      }
    });
  }

  /**
   * Import an EPUB file and convert to Markdown
   * @param {string} filePath - Path to the EPUB file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Converted document data
   */
  async importEpub(filePath, options = {}) {
    const {
      extractImages = true,
      preserveChapterStructure = true,
      includeMetadata = true
    } = options;

    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);

      epub.on('error', (err) => {
        reject(new Error(`Failed to parse EPUB: ${err.message}`));
      });

      epub.on('end', async () => {
        try {
          const result = await this.processEpub(epub, {
            extractImages,
            preserveChapterStructure,
            includeMetadata,
            epubPath: filePath
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      epub.parse();
    });
  }

  /**
   * Process parsed EPUB data
   */
  async processEpub(epub, options) {
    const metadata = this.extractMetadata(epub);
    const chapters = await this.extractChapters(epub, options);
    const images = options.extractImages ? await this.extractImages(epub) : [];

    console.log(`[EPUB Import] Found ${images.length} images in EPUB`);

    // Build Markdown content
    let markdown = '';

    // Add YAML frontmatter if metadata is available
    if (options.includeMetadata && Object.keys(metadata).length > 0) {
      markdown += this.buildFrontmatter(metadata);
    }

    // Add title as H1 if available
    if (metadata.title) {
      markdown += `# ${metadata.title}\n\n`;
    }

    // Add chapters
    for (const chapter of chapters) {
      if (options.preserveChapterStructure && chapter.title) {
        markdown += `## ${chapter.title}\n\n`;
      }
      markdown += chapter.content + '\n\n';
    }

    return {
      markdown: markdown.trim(),
      metadata,
      images,
      chapterCount: chapters.length,
      title: metadata.title || 'Imported EPUB'
    };
  }

  /**
   * Extract metadata from EPUB
   */
  extractMetadata(epub) {
    const metadata = {};

    if (epub.metadata) {
      if (epub.metadata.title) metadata.title = epub.metadata.title;
      if (epub.metadata.creator) metadata.author = epub.metadata.creator;
      if (epub.metadata.publisher) metadata.publisher = epub.metadata.publisher;
      if (epub.metadata.language) metadata.language = epub.metadata.language;
      if (epub.metadata.date) metadata.date = epub.metadata.date;
      if (epub.metadata.description) metadata.description = epub.metadata.description;
      if (epub.metadata.ISBN) metadata.isbn = epub.metadata.ISBN;
      if (epub.metadata.subject) {
        metadata.tags = Array.isArray(epub.metadata.subject)
          ? epub.metadata.subject
          : [epub.metadata.subject];
      }
    }

    return metadata;
  }

  /**
   * Extract and convert chapters to Markdown
   */
  async extractChapters(epub, options) {
    const chapters = [];
    const flow = epub.flow || [];

    for (const item of flow) {
      if (!item.id) continue;

      try {
        const chapterData = await this.getChapterContent(epub, item.id);
        if (chapterData) {
          const markdown = this.htmlToMarkdown(chapterData.content);
          if (markdown.trim()) {
            chapters.push({
              id: item.id,
              title: chapterData.title || item.title || '',
              content: markdown
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to extract chapter ${item.id}:`, err.message);
      }
    }

    return chapters;
  }

  /**
   * Get chapter content from EPUB
   */
  getChapterContent(epub, chapterId) {
    return new Promise((resolve, reject) => {
      epub.getChapter(chapterId, (err, text) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse HTML to extract title and clean content
        const dom = new JSDOM(text);
        const document = dom.window.document;

        // Try to find chapter title
        let title = '';
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        if (h1) {
          title = h1.textContent.trim();
          h1.remove(); // Remove to avoid duplication
        } else if (h2) {
          title = h2.textContent.trim();
          h2.remove();
        }

        // Get body content
        const body = document.body;
        const content = body ? body.innerHTML : text;

        resolve({ title, content });
      });
    });
  }

  /**
   * Convert HTML to Markdown
   */
  htmlToMarkdown(html) {
    if (!html) return '';

    // Clean up HTML before conversion
    let cleaned = html
      .replace(/<\?xml[^>]*>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');

    // Convert to Markdown
    let markdown = this.turndown.turndown(cleaned);

    // Clean up extra whitespace
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');

    return markdown;
  }

  /**
   * Extract images from EPUB
   */
  async extractImages(epub) {
    const images = [];
    const manifest = epub.manifest || {};

    for (const [id, item] of Object.entries(manifest)) {
      if (item['media-type'] && item['media-type'].startsWith('image/')) {
        try {
          const imageData = await this.getImage(epub, id);
          if (imageData) {
            images.push({
              id,
              href: item.href,
              mediaType: item['media-type'],
              data: imageData
            });
          }
        } catch (err) {
          console.warn(`Failed to extract image ${id}:`, err.message);
        }
      }
    }

    return images;
  }

  /**
   * Get image data from EPUB
   */
  getImage(epub, imageId) {
    return new Promise((resolve, reject) => {
      epub.getImage(imageId, (err, data, mimeType) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  /**
   * Build YAML frontmatter from metadata
   */
  buildFrontmatter(metadata) {
    let frontmatter = '---\n';

    for (const [key, value] of Object.entries(metadata)) {
      if (Array.isArray(value)) {
        frontmatter += `${key}:\n`;
        for (const item of value) {
          frontmatter += `  - ${item}\n`;
        }
      } else if (typeof value === 'string' && value.includes('\n')) {
        frontmatter += `${key}: |\n  ${value.replace(/\n/g, '\n  ')}\n`;
      } else {
        frontmatter += `${key}: "${String(value).replace(/"/g, '\\"')}"\n`;
      }
    }

    frontmatter += '---\n\n';
    return frontmatter;
  }
}

module.exports = new EpubImporter();
