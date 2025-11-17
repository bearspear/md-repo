const TurndownService = require('turndown');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { JSDOM } = require('jsdom');

/**
 * Document Conversion Service
 * Converts various file formats to Markdown
 */
class DocumentConverter {
  constructor() {
    // Initialize Turndown for HTML to Markdown conversion
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-'
    });
  }

  /**
   * Convert document to markdown based on file extension
   * @param {string} filePath - Path to the file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<string>} - Markdown content
   */
  async convertToMarkdown(filePath, mimeType) {
    const extension = filePath.split('.').pop().toLowerCase();

    let markdown;
    switch (extension) {
      case 'md':
      case 'markdown':
        markdown = await this.convertMarkdownToMarkdown(filePath);
        break;

      case 'html':
      case 'htm':
        markdown = await this.convertHtmlToMarkdown(filePath);
        break;

      case 'txt':
        markdown = await this.convertTextToMarkdown(filePath);
        break;

      case 'pdf':
        markdown = await this.convertPdfToMarkdown(filePath);
        break;

      case 'docx':
        markdown = await this.convertDocxToMarkdown(filePath);
        break;

      case 'epub':
        markdown = await this.convertEpubToMarkdown(filePath);
        break;

      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    return markdown;
  }

  /**
   * Convert HTML file to Markdown
   */
  async convertHtmlToMarkdown(filePath) {
    try {
      const htmlContent = await fs.readFile(filePath, 'utf8');

      // Parse HTML with jsdom to clean it up
      const dom = new JSDOM(htmlContent);
      const bodyContent = dom.window.document.body?.innerHTML || htmlContent;

      // Convert to markdown
      const markdown = this.turndown.turndown(bodyContent);

      return markdown;
    } catch (error) {
      throw new Error(`HTML conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert Markdown file to Markdown (passthrough with validation)
   */
  async convertMarkdownToMarkdown(filePath) {
    try {
      const markdownContent = await fs.readFile(filePath, 'utf8');

      // Markdown files are already in the correct format
      // Just return the content as-is
      return markdownContent;
    } catch (error) {
      throw new Error(`Markdown read failed: ${error.message}`);
    }
  }

  /**
   * Convert plain text file to Markdown
   */
  async convertTextToMarkdown(filePath) {
    try {
      const textContent = await fs.readFile(filePath, 'utf8');

      // For plain text, we can add minimal formatting
      // Each paragraph separated by double newlines becomes a proper paragraph
      const paragraphs = textContent.split(/\n\s*\n/);
      const markdown = paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');

      return markdown;
    } catch (error) {
      throw new Error(`Text conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF file to Markdown
   */
  async convertPdfToMarkdown(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      // Extract text from PDF
      let text = pdfData.text;

      // Basic cleanup and formatting
      // Replace multiple spaces with single space
      text = text.replace(/ {2,}/g, ' ');

      // Try to detect headings (lines in ALL CAPS or with certain patterns)
      const lines = text.split('\n');
      const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // If line is all caps and short, might be a heading
        if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
          return `## ${trimmed}`;
        }

        return trimmed;
      });

      // Join lines and clean up excessive newlines
      const markdown = formattedLines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');

      return markdown;
    } catch (error) {
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert DOCX file to Markdown
   */
  async convertDocxToMarkdown(filePath) {
    try {
      const result = await mammoth.convertToHtml({ path: filePath });

      // Mammoth gives us HTML, convert it to Markdown
      const markdown = this.turndown.turndown(result.value);

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX conversion warnings:', result.messages);
      }

      return markdown;
    } catch (error) {
      throw new Error(`DOCX conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert EPUB file to Markdown
   * Note: This is a simplified implementation
   */
  async convertEpubToMarkdown(filePath) {
    try {
      // For now, we'll provide a basic implementation
      // A full EPUB parser would require additional libraries like epub-parser
      // which might have compatibility issues

      // Read the file to check it exists
      await fs.readFile(filePath);

      // Return a placeholder message
      return `# EPUB Document\n\n` +
             `This is an EPUB file. Full EPUB conversion requires additional processing.\n\n` +
             `File: ${filePath}\n\n` +
             `_Note: Enhanced EPUB conversion will be added in a future update._`;
    } catch (error) {
      throw new Error(`EPUB conversion failed: ${error.message}`);
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions() {
    return ['md', 'markdown', 'html', 'htm', 'txt', 'pdf', 'docx', 'epub'];
  }

  /**
   * Check if file type is supported
   */
  isSupported(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return this.getSupportedExtensions().includes(extension);
  }
}

module.exports = DocumentConverter;
