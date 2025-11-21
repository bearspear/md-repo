import { Injectable } from '@angular/core';

export interface DocumentTheme {
  id: string;
  name: string;
  description: string;
  author: string;
  preview: string; // Preview image or icon
  category: 'web' | 'print' | 'professional' | 'minimal' | 'creative';

  // Typography
  fonts: {
    heading: string;
    body: string;
    code: string;
  };

  // Colors
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    codeBackground: string;
  };

  // Layout
  layout: {
    maxWidth: string;
    padding: string;
    lineHeight: number;
    headingSpacing: string;
    paragraphSpacing: string;
  };

  // Custom CSS (optional)
  customCSS?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentThemeService {
  private themes: DocumentTheme[] = [];

  constructor() {
    this.initializeThemes();
  }

  /**
   * Initialize built-in themes
   */
  private initializeThemes() {
    this.themes = [
      this.getDefaultTheme(),
      this.getGitHubTheme(),
      this.getPrintBookTheme(),
      this.getAcademicTheme(),
      this.getMinimalTheme(),
      this.getModernTheme(),
      this.getSerifTheme(),
      this.getContrastTheme()
    ];
  }

  /**
   * Get all available themes
   */
  getAllThemes(): DocumentTheme[] {
    return this.themes;
  }

  /**
   * Get theme by ID
   */
  getThemeById(id: string): DocumentTheme | undefined {
    return this.themes.find(theme => theme.id === id);
  }

  /**
   * Get themes by category
   */
  getThemesByCategory(category: string): DocumentTheme[] {
    return this.themes.filter(theme => theme.category === category);
  }

  /**
   * Generate CSS from theme (for full HTML exports)
   */
  generateThemeCSS(theme: DocumentTheme): string {
    return `
      /* ${theme.name} Theme */
      /* ${theme.description} */

      :root {
        --theme-primary: ${theme.colors.primary};
        --theme-secondary: ${theme.colors.secondary};
        --theme-accent: ${theme.colors.accent};
        --theme-background: ${theme.colors.background};
        --theme-surface: ${theme.colors.surface};
        --theme-text-primary: ${theme.colors.textPrimary};
        --theme-text-secondary: ${theme.colors.textSecondary};
        --theme-text-muted: ${theme.colors.textMuted};
        --theme-border: ${theme.colors.border};
        --theme-code-bg: ${theme.colors.codeBackground};

        --font-heading: ${theme.fonts.heading};
        --font-body: ${theme.fonts.body};
        --font-code: ${theme.fonts.code};

        --max-width: ${theme.layout.maxWidth};
        --padding: ${theme.layout.padding};
        --line-height: ${theme.layout.lineHeight};
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        padding: var(--padding);
        font-family: var(--font-body);
        background: var(--theme-background);
        color: var(--theme-text-primary);
        line-height: var(--line-height);
        max-width: var(--max-width);
        margin: 0 auto;
      }

      article {
        background: var(--theme-surface);
        padding: ${theme.layout.padding};
        border-radius: 8px;
      }

      /* Typography */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        color: var(--theme-text-primary);
        margin-top: ${theme.layout.headingSpacing};
        margin-bottom: calc(${theme.layout.headingSpacing} * 0.5);
        line-height: 1.3;
        font-weight: 700;
      }

      h1 { font-size: 2.5rem; }
      h2 { font-size: 2rem; }
      h3 { font-size: 1.5rem; }
      h4 { font-size: 1.25rem; }
      h5 { font-size: 1rem; }
      h6 { font-size: 0.875rem; }

      p {
        margin-bottom: ${theme.layout.paragraphSpacing};
        color: var(--theme-text-primary);
      }

      a {
        color: var(--theme-primary);
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      /* Lists */
      ul, ol {
        margin-bottom: ${theme.layout.paragraphSpacing};
        padding-left: 2rem;
      }

      li {
        margin-bottom: 0.5rem;
      }

      /* Code */
      code {
        font-family: var(--font-code);
        background-color: var(--theme-code-bg);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
      }

      pre {
        background-color: var(--theme-code-bg);
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1.5rem 0;
      }

      pre code {
        background-color: transparent;
        padding: 0;
      }

      /* Blockquotes */
      blockquote {
        border-left: 4px solid var(--theme-primary);
        padding-left: 1rem;
        margin-left: 0;
        color: var(--theme-text-secondary);
        font-style: italic;
      }

      /* Tables */
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.5rem 0;
      }

      th, td {
        border: 1px solid var(--theme-border);
        padding: 0.75rem;
        text-align: left;
      }

      th {
        background-color: var(--theme-code-bg);
        font-weight: 600;
      }

      /* Horizontal Rule */
      hr {
        border: none;
        border-top: 2px solid var(--theme-border);
        margin: 2rem 0;
      }

      /* Images */
      img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 1.5rem 0;
      }

      ${theme.customCSS || ''}
    `;
  }

  /**
   * Generate scoped CSS for preview pane
   * Scopes all selectors to .themed-preview to avoid conflicts
   */
  generatePreviewThemeCSS(theme: DocumentTheme): string {
    return `
      /* ${theme.name} Theme - Preview Scoped */

      .themed-preview {
        --theme-primary: ${theme.colors.primary};
        --theme-secondary: ${theme.colors.secondary};
        --theme-accent: ${theme.colors.accent};
        --theme-background: ${theme.colors.background};
        --theme-surface: ${theme.colors.surface};
        --theme-text-primary: ${theme.colors.textPrimary};
        --theme-text-secondary: ${theme.colors.textSecondary};
        --theme-text-muted: ${theme.colors.textMuted};
        --theme-border: ${theme.colors.border};
        --theme-code-bg: ${theme.colors.codeBackground};

        --font-heading: ${theme.fonts.heading};
        --font-body: ${theme.fonts.body};
        --font-code: ${theme.fonts.code};

        background: var(--theme-background);
        font-family: var(--font-body);
        color: var(--theme-text-primary);
        line-height: ${theme.layout.lineHeight};
        padding: ${theme.layout.padding};
      }

      .themed-preview article {
        background: var(--theme-surface);
        padding: ${theme.layout.padding};
        border-radius: 8px;
        max-width: ${theme.layout.maxWidth};
        margin: 0 auto;
      }

      /* Typography */
      .themed-preview h1,
      .themed-preview h2,
      .themed-preview h3,
      .themed-preview h4,
      .themed-preview h5,
      .themed-preview h6 {
        font-family: var(--font-heading);
        color: var(--theme-text-primary);
        margin-top: ${theme.layout.headingSpacing};
        margin-bottom: calc(${theme.layout.headingSpacing} * 0.5);
        line-height: 1.3;
        font-weight: 700;
      }

      .themed-preview h1 { font-size: 2.5rem; }
      .themed-preview h2 { font-size: 2rem; }
      .themed-preview h3 { font-size: 1.5rem; }
      .themed-preview h4 { font-size: 1.25rem; }
      .themed-preview h5 { font-size: 1rem; }
      .themed-preview h6 { font-size: 0.875rem; }

      .themed-preview p {
        margin-bottom: ${theme.layout.paragraphSpacing};
        color: var(--theme-text-primary);
      }

      .themed-preview a {
        color: var(--theme-primary);
        text-decoration: none;
      }

      .themed-preview a:hover {
        text-decoration: underline;
      }

      /* Lists */
      .themed-preview ul,
      .themed-preview ol {
        margin-bottom: ${theme.layout.paragraphSpacing};
        padding-left: 2rem;
      }

      .themed-preview li {
        margin-bottom: 0.5rem;
      }

      /* Code */
      .themed-preview code {
        font-family: var(--font-code);
        background-color: var(--theme-code-bg);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
      }

      .themed-preview pre {
        background-color: var(--theme-code-bg);
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1.5rem 0;
      }

      .themed-preview pre code {
        background-color: transparent;
        padding: 0;
      }

      /* Blockquotes */
      .themed-preview blockquote {
        border-left: 4px solid var(--theme-primary);
        padding-left: 1rem;
        margin-left: 0;
        color: var(--theme-text-secondary);
        font-style: italic;
      }

      /* Tables */
      .themed-preview table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.5rem 0;
      }

      .themed-preview th,
      .themed-preview td {
        border: 1px solid var(--theme-border);
        padding: 0.75rem;
        text-align: left;
      }

      .themed-preview th {
        background-color: var(--theme-code-bg);
        font-weight: 600;
      }

      /* Horizontal Rule */
      .themed-preview hr {
        border: none;
        border-top: 2px solid var(--theme-border);
        margin: 2rem 0;
      }

      /* Images */
      .themed-preview img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 1.5rem 0;
      }

      ${theme.customCSS ? this.scopeCustomCSS(theme.customCSS) : ''}
    `;
  }

  /**
   * Scope custom CSS to .themed-preview
   */
  private scopeCustomCSS(customCSS: string): string {
    // Simple scoping: prepend .themed-preview to each selector
    // This is a basic implementation - more complex CSS might need a proper CSS parser
    return customCSS
      .split('}')
      .map(rule => {
        if (!rule.trim()) return '';
        const parts = rule.split('{');
        if (parts.length !== 2) return rule + '}';

        const selectors = parts[0].trim();
        const declarations = parts[1];

        // Skip @-rules and already scoped selectors
        if (selectors.startsWith('@') || selectors.includes('.themed-preview')) {
          return rule + '}';
        }

        // Scope the selectors
        const scopedSelectors = selectors
          .split(',')
          .map(s => `.themed-preview ${s.trim()}`)
          .join(', ');

        return `${scopedSelectors} { ${declarations} }`;
      })
      .join('\n');
  }

  /**
   * Default theme (current implementation)
   */
  private getDefaultTheme(): DocumentTheme {
    return {
      id: 'default',
      name: 'Default',
      description: 'Clean and modern default theme',
      author: 'Markdown Studio',
      preview: 'description',
      category: 'web',
      fonts: {
        heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        code: '"Consolas", "Monaco", "Courier New", monospace'
      },
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#3b82f6',
        background: '#f8fafc',
        surface: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        codeBackground: '#f6f8fa'
      },
      layout: {
        maxWidth: '900px',
        padding: '40px',
        lineHeight: 1.6,
        headingSpacing: '2rem',
        paragraphSpacing: '1rem'
      }
    };
  }

  /**
   * GitHub theme - mimics GitHub's markdown rendering
   */
  private getGitHubTheme(): DocumentTheme {
    return {
      id: 'github',
      name: 'GitHub',
      description: 'GitHub-style markdown rendering',
      author: 'GitHub',
      preview: 'code',
      category: 'web',
      fonts: {
        heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        code: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
      },
      colors: {
        primary: '#0969da',
        secondary: '#57606a',
        accent: '#0969da',
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#1f2328',
        textSecondary: '#656d76',
        textMuted: '#8c959f',
        border: '#d0d7de',
        codeBackground: '#f6f8fa'
      },
      layout: {
        maxWidth: '1012px',
        padding: '32px',
        lineHeight: 1.6,
        headingSpacing: '24px',
        paragraphSpacing: '16px'
      },
      customCSS: `
        h1, h2 {
          border-bottom: 1px solid var(--theme-border);
          padding-bottom: 0.3em;
        }

        code {
          color: #1f2328;
          background-color: rgba(175,184,193,0.2);
        }

        pre {
          background-color: #f6f8fa;
          border: 1px solid var(--theme-border);
        }

        table {
          font-size: 0.95em;
        }

        th {
          background-color: #f6f8fa;
        }
      `
    };
  }

  /**
   * Print Book theme - optimized for professional print output
   */
  private getPrintBookTheme(): DocumentTheme {
    return {
      id: 'print-book',
      name: 'Print Book',
      description: 'Professional book-style layout for printing',
      author: 'Markdown Studio',
      preview: 'menu_book',
      category: 'print',
      fonts: {
        heading: '"Merriweather", "Georgia", serif',
        body: '"Merriweather", "Georgia", serif',
        code: '"Source Code Pro", "Courier New", monospace'
      },
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#c0392b',
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#2c3e50',
        textSecondary: '#34495e',
        textMuted: '#7f8c8d',
        border: '#bdc3c7',
        codeBackground: '#ecf0f1'
      },
      layout: {
        maxWidth: '7in', // Standard book width
        padding: '0.75in',
        lineHeight: 1.8,
        headingSpacing: '2.5rem',
        paragraphSpacing: '1.2rem'
      },
      customCSS: `
        @page {
          size: letter;
          margin: 1in 0.75in;
        }

        body {
          font-size: 11pt;
          text-align: justify;
          hyphens: auto;
        }

        h1 {
          font-size: 28pt;
          text-align: left;
          page-break-before: always;
          margin-top: 0;
        }

        h2 {
          font-size: 20pt;
          page-break-after: avoid;
        }

        h3 {
          font-size: 16pt;
        }

        p {
          text-indent: 1.5em;
          margin-bottom: 0;
        }

        p:first-child,
        h1 + p,
        h2 + p,
        h3 + p {
          text-indent: 0;
        }

        blockquote {
          font-style: italic;
          margin: 1.5rem 2rem;
          border-left: 3px solid var(--theme-border);
        }

        pre, code, table, img {
          page-break-inside: avoid;
        }

        table {
          font-size: 9pt;
        }

        /* Footnotes */
        .footnotes {
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 1px solid var(--theme-border);
          font-size: 9pt;
        }

        /* Chapter numbers */
        h1::before {
          content: "Chapter ";
          font-size: 14pt;
          display: block;
          margin-bottom: 0.5rem;
          color: var(--theme-text-muted);
        }
      `
    };
  }

  /**
   * Academic theme - for research papers and academic documents
   */
  private getAcademicTheme(): DocumentTheme {
    return {
      id: 'academic',
      name: 'Academic',
      description: 'Formal academic style for research papers',
      author: 'Markdown Studio',
      preview: 'school',
      category: 'professional',
      fonts: {
        heading: '"Times New Roman", "Liberation Serif", Times, serif',
        body: '"Times New Roman", "Liberation Serif", Times, serif',
        code: '"Courier New", Courier, monospace'
      },
      colors: {
        primary: '#000000',
        secondary: '#333333',
        accent: '#1a1a1a',
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#000000',
        textSecondary: '#333333',
        textMuted: '#666666',
        border: '#cccccc',
        codeBackground: '#f5f5f5'
      },
      layout: {
        maxWidth: '8.5in',
        padding: '1in',
        lineHeight: 2.0, // Double-spaced
        headingSpacing: '24pt',
        paragraphSpacing: '0'
      },
      customCSS: `
        @page {
          size: letter;
          margin: 1in;
        }

        body {
          font-size: 12pt;
          text-align: justify;
        }

        h1 {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-bottom: 24pt;
        }

        h2 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 24pt;
          margin-bottom: 12pt;
        }

        h3, h4, h5, h6 {
          font-size: 12pt;
          font-weight: bold;
          font-style: italic;
        }

        p {
          margin-bottom: 0;
          text-indent: 0.5in;
        }

        p:first-child,
        h1 + p,
        h2 + p,
        h3 + p {
          text-indent: 0;
        }

        blockquote {
          margin: 12pt 1in;
          font-size: 11pt;
          border-left: none;
        }

        table {
          margin: 12pt auto;
          font-size: 10pt;
          caption-side: top;
        }

        th {
          border-bottom: 2px solid #000;
          border-top: 2px solid #000;
        }

        td {
          border: none;
        }

        tbody tr:last-child td {
          border-bottom: 2px solid #000;
        }

        /* Abstract */
        .abstract {
          margin: 24pt 0.5in;
          font-size: 11pt;
        }

        .abstract h2 {
          text-align: center;
          font-weight: bold;
        }

        /* References */
        .references {
          margin-top: 24pt;
        }

        .references p {
          text-indent: -0.5in;
          padding-left: 0.5in;
        }
      `
    };
  }

  /**
   * Minimal theme - clean and distraction-free
   */
  private getMinimalTheme(): DocumentTheme {
    return {
      id: 'minimal',
      name: 'Minimal',
      description: 'Ultra-clean and distraction-free',
      author: 'Markdown Studio',
      preview: 'minimize',
      category: 'minimal',
      fonts: {
        heading: '"Inter", -apple-system, sans-serif',
        body: '"Inter", -apple-system, sans-serif',
        code: '"JetBrains Mono", "SF Mono", monospace'
      },
      colors: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#000000',
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#000000',
        textSecondary: '#666666',
        textMuted: '#999999',
        border: '#e5e5e5',
        codeBackground: '#fafafa'
      },
      layout: {
        maxWidth: '680px',
        padding: '60px 20px',
        lineHeight: 1.7,
        headingSpacing: '3rem',
        paragraphSpacing: '1.5rem'
      },
      customCSS: `
        body {
          font-size: 18px;
        }

        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        h2 {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        h3 {
          font-size: 1.25rem;
          font-weight: 600;
        }

        a {
          border-bottom: 1px solid #000;
        }

        a:hover {
          border-bottom: 2px solid #000;
          text-decoration: none;
        }

        blockquote {
          border-left: 3px solid #000;
          font-style: normal;
          color: #666;
        }

        code {
          font-size: 0.875em;
        }

        pre {
          border: 1px solid var(--theme-border);
        }
      `
    };
  }

  /**
   * Modern theme - contemporary and vibrant
   */
  private getModernTheme(): DocumentTheme {
    return {
      id: 'modern',
      name: 'Modern',
      description: 'Contemporary design with vibrant colors',
      author: 'Markdown Studio',
      preview: 'auto_awesome',
      category: 'creative',
      fonts: {
        heading: '"Montserrat", "Helvetica Neue", sans-serif',
        body: '"Inter", -apple-system, sans-serif',
        code: '"Fira Code", "Cascadia Code", monospace'
      },
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        background: '#fafafa',
        surface: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        codeBackground: '#f8fafc'
      },
      layout: {
        maxWidth: '960px',
        padding: '48px',
        lineHeight: 1.65,
        headingSpacing: '2.5rem',
        paragraphSpacing: '1.25rem'
      },
      customCSS: `
        h1 {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
        }

        h2 {
          color: #6366f1;
          font-weight: 700;
          border-left: 4px solid #6366f1;
          padding-left: 1rem;
        }

        h3 {
          color: #8b5cf6;
          font-weight: 600;
        }

        a {
          color: #6366f1;
          border-bottom: 2px solid transparent;
          transition: border-color 0.2s;
        }

        a:hover {
          border-bottom-color: #6366f1;
          text-decoration: none;
        }

        blockquote {
          background: linear-gradient(to right, #f8fafc, #ffffff);
          border-left: 4px solid #6366f1;
          border-radius: 6px;
          padding: 1rem 1.5rem;
        }

        code {
          color: #ec4899;
          background-color: #fdf2f8;
          border: 1px solid #fbcfe8;
        }

        pre {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border: none;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        pre code {
          color: #e2e8f0;
          background: transparent;
          border: none;
        }
      `
    };
  }

  /**
   * Serif theme - classic and elegant
   */
  private getSerifTheme(): DocumentTheme {
    return {
      id: 'serif',
      name: 'Serif Classic',
      description: 'Elegant serif typography',
      author: 'Markdown Studio',
      preview: 'auto_stories',
      category: 'professional',
      fonts: {
        heading: '"Playfair Display", "Georgia", serif',
        body: '"Crimson Text", "Georgia", serif',
        code: '"Source Code Pro", monospace'
      },
      colors: {
        primary: '#8b4513',
        secondary: '#a0522d',
        accent: '#cd853f',
        background: '#fdfcfb',
        surface: '#ffffff',
        textPrimary: '#2d2a26',
        textSecondary: '#5c5854',
        textMuted: '#8b8682',
        border: '#d4cfc7',
        codeBackground: '#f5f3f0'
      },
      layout: {
        maxWidth: '750px',
        padding: '60px 40px',
        lineHeight: 1.75,
        headingSpacing: '2.5rem',
        paragraphSpacing: '1.5rem'
      },
      customCSS: `
        body {
          font-size: 19px;
        }

        h1 {
          font-size: 3rem;
          font-weight: 700;
          font-style: normal;
          letter-spacing: -0.02em;
        }

        h2 {
          font-size: 2rem;
          font-weight: 600;
          font-style: italic;
        }

        h3 {
          font-size: 1.5rem;
          font-weight: 600;
        }

        p {
          text-align: justify;
        }

        p::first-letter {
          font-size: 1.5em;
          font-weight: 700;
          color: var(--theme-primary);
        }

        blockquote {
          font-size: 1.1em;
          font-style: italic;
          border-left-color: var(--theme-primary);
          color: var(--theme-text-secondary);
        }

        code {
          font-size: 0.85em;
        }
      `
    };
  }

  /**
   * High Contrast theme - for accessibility
   */
  private getContrastTheme(): DocumentTheme {
    return {
      id: 'contrast',
      name: 'High Contrast',
      description: 'Maximum contrast for accessibility',
      author: 'Markdown Studio',
      preview: 'contrast',
      category: 'professional',
      fonts: {
        heading: '"Arial", "Helvetica Neue", sans-serif',
        body: '"Arial", "Helvetica Neue", sans-serif',
        code: '"Courier New", monospace'
      },
      colors: {
        primary: '#0000ff',
        secondary: '#000000',
        accent: '#ff0000',
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#000000',
        textSecondary: '#000000',
        textMuted: '#333333',
        border: '#000000',
        codeBackground: '#f0f0f0'
      },
      layout: {
        maxWidth: '900px',
        padding: '40px',
        lineHeight: 1.8,
        headingSpacing: '2rem',
        paragraphSpacing: '1.5rem'
      },
      customCSS: `
        body {
          font-size: 18px;
        }

        h1, h2, h3, h4, h5, h6 {
          font-weight: 900;
        }

        a {
          color: #0000ff;
          text-decoration: underline;
          font-weight: 700;
        }

        a:hover {
          background-color: #ffff00;
          color: #000000;
        }

        blockquote {
          border-left: 5px solid #000000;
          background-color: #f5f5f5;
          padding: 1rem;
        }

        code {
          border: 2px solid #000000;
          background-color: #ffffff;
        }

        pre {
          border: 3px solid #000000;
        }

        th {
          background-color: #000000;
          color: #ffffff;
          font-weight: 900;
        }

        td {
          border: 2px solid #000000;
        }
      `
    };
  }

  /**
   * Add custom theme
   */
  addCustomTheme(theme: DocumentTheme): void {
    const existing = this.themes.findIndex(t => t.id === theme.id);
    if (existing >= 0) {
      this.themes[existing] = theme;
    } else {
      this.themes.push(theme);
    }
  }
}
