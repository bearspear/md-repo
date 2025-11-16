const { marked } = require('marked');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service for exporting markdown documents to various formats
 */
class DocumentExporter {
  constructor() {
    // Configure marked for HTML generation
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  /**
   * Export markdown to the specified format
   * @param {string} markdown - Markdown content
   * @param {string} format - Export format (html, pdf, docx, txt, md)
   * @param {string} title - Document title
   * @returns {Promise<{buffer: Buffer, mimeType: string, extension: string}>}
   */
  async exportDocument(markdown, format, title = 'document') {
    switch (format.toLowerCase()) {
      case 'html':
        return await this.exportToHtml(markdown, title);
      case 'pdf':
        return await this.exportToPdf(markdown, title);
      case 'docx':
        return await this.exportToDocx(markdown, title);
      case 'txt':
        return await this.exportToText(markdown);
      case 'md':
        return await this.exportToMarkdown(markdown);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to HTML
   */
  async exportToHtml(markdown, title) {
    const htmlContent = marked(markdown);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
            color: #333;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
        }
        pre {
            background-color: #f4f4f4;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        table th {
            background-color: #f4f4f4;
        }
        img {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    return {
      buffer: Buffer.from(fullHtml, 'utf-8'),
      mimeType: 'text/html',
      extension: '.html'
    };
  }

  /**
   * Export to PDF using Puppeteer
   */
  async exportToPdf(markdown, title) {
    // First convert to HTML
    const { buffer: htmlBuffer } = await this.exportToHtml(markdown, title);
    const html = htmlBuffer.toString('utf-8');

    // Launch Puppeteer and convert HTML to PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      });

      return {
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
        extension: '.pdf'
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Export to DOCX
   */
  async exportToDocx(markdown, title) {
    // Parse markdown to extract structure
    const lines = markdown.split('\n');
    const paragraphs = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmed.substring(2),
            heading: HeadingLevel.HEADING_1
          })
        );
      } else if (trimmed.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmed.substring(3),
            heading: HeadingLevel.HEADING_2
          })
        );
      } else if (trimmed.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmed.substring(4),
            heading: HeadingLevel.HEADING_3
          })
        );
      } else if (trimmed.startsWith('#### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmed.substring(5),
            heading: HeadingLevel.HEADING_4
          })
        );
      } else {
        // Regular paragraph - handle basic formatting
        const textRuns = this.parseInlineFormatting(trimmed);
        paragraphs.push(new Paragraph({ children: textRuns }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    return {
      buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: '.docx'
    };
  }

  /**
   * Parse inline markdown formatting for DOCX
   */
  parseInlineFormatting(text) {
    const runs = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
      // Check for bold (**text** or __text__)
      if ((text[i] === '*' && text[i + 1] === '*') || (text[i] === '_' && text[i + 1] === '_')) {
        if (currentText) {
          runs.push(new TextRun(currentText));
          currentText = '';
        }

        const marker = text[i];
        i += 2;
        let boldText = '';

        while (i < text.length - 1 && !(text[i] === marker && text[i + 1] === marker)) {
          boldText += text[i];
          i++;
        }

        if (i < text.length - 1) {
          runs.push(new TextRun({ text: boldText, bold: true }));
          i += 2;
        } else {
          currentText += marker + marker + boldText;
        }
      }
      // Check for italic (*text* or _text_)
      else if (text[i] === '*' || text[i] === '_') {
        if (currentText) {
          runs.push(new TextRun(currentText));
          currentText = '';
        }

        const marker = text[i];
        i++;
        let italicText = '';

        while (i < text.length && text[i] !== marker) {
          italicText += text[i];
          i++;
        }

        if (i < text.length) {
          runs.push(new TextRun({ text: italicText, italics: true }));
          i++;
        } else {
          currentText += marker + italicText;
        }
      }
      // Check for inline code (`text`)
      else if (text[i] === '`') {
        if (currentText) {
          runs.push(new TextRun(currentText));
          currentText = '';
        }

        i++;
        let codeText = '';

        while (i < text.length && text[i] !== '`') {
          codeText += text[i];
          i++;
        }

        if (i < text.length) {
          runs.push(new TextRun({ text: codeText, font: 'Courier New' }));
          i++;
        } else {
          currentText += '`' + codeText;
        }
      } else {
        currentText += text[i];
        i++;
      }
    }

    if (currentText) {
      runs.push(new TextRun(currentText));
    }

    return runs.length > 0 ? runs : [new TextRun(text)];
  }

  /**
   * Export to plain text
   */
  async exportToText(markdown) {
    // Strip markdown syntax for plain text
    let text = markdown;

    // Remove headings
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Remove bold/italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');

    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');

    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');

    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');

    return {
      buffer: Buffer.from(text, 'utf-8'),
      mimeType: 'text/plain',
      extension: '.txt'
    };
  }

  /**
   * Export as markdown (no conversion)
   */
  async exportToMarkdown(markdown) {
    return {
      buffer: Buffer.from(markdown, 'utf-8'),
      mimeType: 'text/markdown',
      extension: '.md'
    };
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats() {
    return ['html', 'pdf', 'docx', 'txt', 'md'];
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(format) {
    return this.getSupportedFormats().includes(format.toLowerCase());
  }
}

module.exports = new DocumentExporter();
