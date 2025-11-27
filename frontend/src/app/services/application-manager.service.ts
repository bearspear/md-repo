import { Injectable } from '@angular/core';
import { SearchEngineService, SearchResult } from './search-engine.service';
import { ApplicationStateService, SearchResultWithCollections } from './application-state.service';
import { DocumentEngineService, DocumentTheme } from './document-engine.service';
import { Annotation } from './annotation-engine.service';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ExportData {
  document?: {
    title?: string;
    path?: string;
  };
  annotations?: any[];
  query?: string;
  totalResults?: number;
  results?: any[];
  exportedAt: string;
}

/**
 * Unified Application Manager Service
 * Consolidates: UploadManagerService, SettingsManagerService, ExportManagerService, RelatedDocumentsManagerService
 * Manages all application coordination and orchestration operations
 */
@Injectable({
  providedIn: 'root'
})
export class ApplicationManagerService {

  // ============================================
  // UPLOAD MANAGER STATE
  // ============================================
  uploadProgress: string[] = [];
  dragOver = false;

  // ============================================
  // SETTINGS MANAGER STATE
  // ============================================
  currentConfig: any = null;
  newWatchDirectory = '';
  settingsMessage = '';
  settingsError = '';

  constructor(
    private searchEngine: SearchEngineService,
    private appState: ApplicationStateService,
    private documentEngine: DocumentEngineService
  ) {}

  // ============================================
  // UPLOAD MANAGER METHODS
  // ============================================

  /**
   * Handle file input selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer?.files) {
      const mdFiles = Array.from(event.dataTransfer.files).filter(
        file => file.name.endsWith('.md')
      );
      if (mdFiles.length > 0) {
        this.uploadFiles(mdFiles);
      }
    }
  }

  /**
   * Upload files to the server
   */
  uploadFiles(files: File[], onComplete?: () => void): void {
    this.appState.setState('isUploading', true);
    this.uploadProgress = [];

    if (files.length === 1) {
      const file = files[0];
      this.uploadProgress.push(`Uploading ${file.name}...`);

      this.searchEngine.uploadFile(file).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${file.name} uploaded successfully`);
          this.appState.setState('isUploading', false);
          if (onComplete) {
            onComplete();
          }
          setTimeout(() => this.appState.setState('showUploadDialog', false), 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading ${file.name}: ${error.error?.error || error.message}`);
          this.appState.setState('isUploading', false);
        }
      });
    } else {
      this.uploadProgress.push(`Uploading ${files.length} files...`);

      this.searchEngine.uploadMultipleFiles(files).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${files.length} files uploaded successfully`);
          this.appState.setState('isUploading', false);
          if (onComplete) {
            onComplete();
          }
          setTimeout(() => this.appState.setState('showUploadDialog', false), 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading files: ${error.error?.error || error.message}`);
          this.appState.setState('isUploading', false);
        }
      });
    }
  }

  /**
   * Close upload dialog and reset state
   */
  closeUploadDialog(): void {
    this.appState.setState('showUploadDialog', false);
    this.uploadProgress = [];
  }

  // ============================================
  // SETTINGS MANAGER METHODS
  // ============================================

  /**
   * Open settings dialog and load current configuration
   */
  openSettingsDialog(): void {
    this.appState.setState('showSettingsDialog', true);
    this.settingsMessage = '';
    this.settingsError = '';
    this.loadConfig();
  }

  /**
   * Load current configuration from server
   */
  loadConfig(): void {
    this.searchEngine.getConfig().subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.newWatchDirectory = config.watchDirectory;
      },
      error: (error) => {
        console.error('Error loading config:', error);
        this.settingsError = 'Failed to load configuration';
      }
    });
  }

  /**
   * Update watch directory and trigger re-indexing
   */
  updateWatchDirectory(onComplete?: () => void): void {
    if (!this.newWatchDirectory || this.newWatchDirectory.trim().length === 0) {
      this.settingsError = 'Please enter a valid directory path';
      return;
    }

    this.appState.setState('isUpdatingSettings', true);
    this.settingsError = '';
    this.settingsMessage = '';

    this.searchEngine.updateWatchDirectory(this.newWatchDirectory).subscribe({
      next: (response) => {
        this.settingsMessage = 'Watch directory updated successfully! Re-indexing...';
        this.currentConfig = response.config;
        this.appState.setState('isUpdatingSettings', false);
        if (onComplete) {
          onComplete();
        }
        setTimeout(() => {
          this.settingsMessage = 'Configuration saved and documents re-indexed!';
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating watch directory:', error);
        this.settingsError = error.error?.error || 'Failed to update watch directory';
        this.appState.setState('isUpdatingSettings', false);
      }
    });
  }

  /**
   * Close settings dialog and reset messages
   */
  closeSettingsDialog(): void {
    this.appState.setState('showSettingsDialog', false);
    this.settingsMessage = '';
    this.settingsError = '';
  }

  // ============================================
  // EXPORT MANAGER METHODS
  // ============================================

  /**
   * Export annotations as JSON
   */
  exportAnnotationsAsJSON(annotations: Annotation[], documentTitle?: string, documentPath?: string): void {
    if (annotations.length === 0) {
      alert('No annotations to export');
      return;
    }

    const exportData: ExportData = {
      document: {
        title: documentTitle,
        path: documentPath
      },
      annotations: annotations.map(a => ({
        id: a.id,
        selectedText: a.selectedText,
        note: a.note,
        color: a.color,
        startOffset: a.startOffset,
        endOffset: a.endOffset,
        createdAt: new Date(a.createdAt).toISOString(),
        updatedAt: new Date(a.updatedAt).toISOString()
      })),
      exportedAt: new Date().toISOString()
    };

    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      `annotations-${documentTitle || 'document'}.json`,
      'application/json'
    );
  }

  /**
   * Export annotations as CSV
   */
  exportAnnotationsAsCSV(annotations: Annotation[], documentTitle?: string): void {
    if (annotations.length === 0) {
      alert('No annotations to export');
      return;
    }

    const headers = ['ID', 'Selected Text', 'Note', 'Color', 'Start Offset', 'End Offset', 'Created At', 'Updated At'];
    const rows = annotations.map(a => [
      a.id,
      `"${a.selectedText.replace(/"/g, '""')}"`,
      `"${(a.note || '').replace(/"/g, '""')}"`,
      a.color,
      a.startOffset.toString(),
      a.endOffset.toString(),
      new Date(a.createdAt).toISOString(),
      new Date(a.updatedAt).toISOString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    this.downloadFile(
      csv,
      `annotations-${documentTitle || 'document'}.csv`,
      'text/csv'
    );
  }

  /**
   * Export search results as JSON or CSV
   */
  exportSearchResults(results: SearchResult[], query: string, format: 'json' | 'csv'): void {
    if (results.length === 0) {
      alert('No search results to export');
      return;
    }

    if (format === 'json') {
      const exportData: ExportData = {
        query: query,
        totalResults: results.length,
        results: results.map(r => ({
          title: r.title,
          path: r.path,
          wordCount: r.wordCount,
          topics: r.topics,
          tags: r.tags,
          contentType: r.contentType,
          modifiedAt: new Date(r.modifiedAt).toISOString(),
          snippet: r.snippet
        })),
        exportedAt: new Date().toISOString()
      };

      this.downloadFile(
        JSON.stringify(exportData, null, 2),
        `search-results-${query}.json`,
        'application/json'
      );
    } else {
      const headers = ['Title', 'Path', 'Word Count', 'Topics', 'Tags', 'Content Type', 'Modified At'];
      const rows = results.map(r => [
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.path.replace(/"/g, '""')}"`,
        r.wordCount.toString(),
        `"${r.topics.join(', ')}"`,
        `"${r.tags.join(', ')}"`,
        r.contentType,
        new Date(r.modifiedAt).toISOString()
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      this.downloadFile(
        csv,
        `search-results-${query}.csv`,
        'text/csv'
      );
    }
  }

  /**
   * Export document as HTML with all special rendering preserved
   */
  exportDocumentAsHTML(
    htmlContent: string,
    title: string,
    documentPath?: string,
    themeId?: string
  ): void {
    const fullHTML = this.generateStandaloneHTML(htmlContent, title, themeId);

    this.downloadFile(
      fullHTML,
      `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`,
      'text/html'
    );
  }

  /**
   * Export document as PDF using print functionality
   */
  exportDocumentAsPDF(
    htmlContent: string,
    title: string,
    themeId?: string
  ): void {
    const fullHTML = this.generateStandaloneHTML(htmlContent, title, themeId);

    // Create a temporary window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    printWindow.document.write(fullHTML);
    printWindow.document.close();

    // Wait for all resources to load before printing
    printWindow.onload = () => {
      // Wait a bit more for Mermaid and Chart.js to render
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    };
  }

  /**
   * Generate standalone HTML with all dependencies
   */
  private generateStandaloneHTML(content: string, title: string, themeId?: string): string {
    const theme = themeId ? this.documentEngine.getThemeById(themeId) : this.documentEngine.getThemeById('default');
    const themeCSS = theme ? this.documentEngine.generateThemeCSS(theme) : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css">

  <!-- Google Fonts (for theme support) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@600;700;800&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@600;700&family=Source+Code+Pro:wght@400;600&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">

  <!-- Highlight.js GitHub Theme -->
  <style>
    ${this.getHighlightJSStyles()}
  </style>

  <!-- Theme Styles -->
  <style>
    ${themeCSS}
  </style>

  <!-- Component Styles (Callouts, Charts, etc.) -->
  <style>
    ${this.getComponentStyles()}
  </style>

  <!-- Print Styles -->
  <style>
    @media print {
      .code-block-wrapper,
      .callout,
      .chart-container {
        page-break-inside: avoid;
      }

      pre {
        page-break-inside: avoid;
      }

      @page {
        margin: 0.5in;
      }
    }
  </style>
</head>
<body>
  <article>
    ${content}
  </article>

  <!-- Mermaid -->
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default'
    });
  </script>

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.js"></script>
  <script>
    // Initialize all charts
    document.addEventListener('DOMContentLoaded', function() {
      const chartCanvases = document.querySelectorAll('.chart-canvas');
      chartCanvases.forEach(canvas => {
        const configStr = canvas.getAttribute('data-chart-config');
        if (configStr) {
          try {
            const config = JSON.parse(configStr);
            new Chart(canvas, config);
          } catch (error) {
            console.error('Error initializing chart:', error);
          }
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Get Highlight.js GitHub theme styles
   */
  private getHighlightJSStyles(): string {
    return `
      pre code.hljs { display: block; overflow-x: auto; padding: 1em }
      code.hljs { padding: 3px 5px }
      .hljs { color: #24292e; background: #ffffff }
      .hljs-doctag, .hljs-keyword, .hljs-meta .hljs-keyword, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-variable.language_ { color: #d73a49 }
      .hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__, .hljs-title.function_ { color: #6f42c1 }
      .hljs-attr, .hljs-attribute, .hljs-literal, .hljs-meta, .hljs-number, .hljs-operator, .hljs-variable, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id { color: #005cc5 }
      .hljs-regexp, .hljs-string, .hljs-meta .hljs-string { color: #032f62 }
      .hljs-built_in, .hljs-symbol { color: #e36209 }
      .hljs-comment, .hljs-code, .hljs-formula { color: #6a737d }
      .hljs-name, .hljs-quote, .hljs-selector-tag, .hljs-selector-pseudo { color: #22863a }
      .hljs-subst { color: #24292e }
      .hljs-section { color: #005cc5; font-weight: bold }
      .hljs-bullet { color: #735c0f }
      .hljs-emphasis { color: #24292e; font-style: italic }
      .hljs-strong { color: #24292e; font-weight: bold }
      .hljs-addition { color: #22863a; background-color: #f0fff4 }
      .hljs-deletion { color: #b31d28; background-color: #ffeef0 }
    `;
  }

  /**
   * Get component-specific styles (callouts, charts, code blocks, footnotes)
   */
  private getComponentStyles(): string {
    return `
      :root {
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        --radius-sm: 0.375rem;
        --radius-md: 0.5rem;
        --radius-lg: 0.75rem;
      }

      /* Callouts */
      .callout {
        margin: 1.5rem 0;
        padding: 0;
        border-left: 4px solid;
        border-radius: var(--radius-md);
        background-color: #f8fafc;
        overflow: hidden;
      }

      .callout-title {
        padding: 0.75rem 1rem;
        font-weight: 600;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background-color: rgba(0, 0, 0, 0.02);
      }

      .callout-icon { font-size: 1.25rem; line-height: 1; }

      .callout-content {
        padding: 0.75rem 1rem;
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .callout-content p:first-child { margin-top: 0; }
      .callout-content p:last-child { margin-bottom: 0; }

      .callout-note, .callout-info {
        border-color: #3b82f6;
        background-color: #eff6ff;
      }

      .callout-note .callout-title, .callout-info .callout-title {
        color: #1e40af;
        background-color: #dbeafe;
      }

      .callout-warning {
        border-color: #f59e0b;
        background-color: #fffbeb;
      }

      .callout-warning .callout-title {
        color: #92400e;
        background-color: #fef3c7;
      }

      .callout-tip {
        border-color: #10b981;
        background-color: #f0fdf4;
      }

      .callout-tip .callout-title {
        color: #065f46;
        background-color: #d1fae5;
      }

      .callout-danger {
        border-color: #ef4444;
        background-color: #fef2f2;
      }

      .callout-danger .callout-title {
        color: #991b1b;
        background-color: #fee2e2;
      }

      /* Charts */
      .chart-container {
        margin: 1.5rem 0;
        padding: 1rem;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
      }

      .chart-canvas {
        max-width: 100%;
        height: auto;
      }

      /* Code Blocks */
      .code-block-wrapper {
        position: relative;
        margin: 1.5rem 0;
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      .code-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: #e8eaed;
        border-bottom: 1px solid #d1d5da;
      }

      .code-filename {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.813rem;
        font-weight: 600;
        color: #24292e;
      }

      .code-copy-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }

      .code-block-content {
        margin: 0;
        padding: 0;
        background-color: #f6f8fa;
        overflow-x: auto;
      }

      .code-block-content code {
        display: block;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.875rem;
        line-height: 1.5;
        padding: 0;
        background: transparent;
      }

      .code-line {
        display: flex;
        padding: 0;
        min-height: 1.5em;
      }

      .code-line.highlighted { background-color: #fff8c5; }
      .code-line.diff-add {
        background-color: #e6ffed;
        border-left: 3px solid #28a745;
      }

      .code-line.diff-remove {
        background-color: #ffeef0;
        border-left: 3px solid #d73a49;
      }

      .line-number {
        display: inline-block;
        width: 3rem;
        padding: 0 0.75rem;
        text-align: right;
        color: #6a737d;
        user-select: none;
        flex-shrink: 0;
        background-color: #f0f0f0;
        border-right: 1px solid #d1d5da;
      }

      .line-content {
        flex: 1;
        padding: 0 0.75rem;
        white-space: pre;
      }

      pre {
        position: relative;
        margin: 1.5rem 0;
        padding: 1rem;
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: var(--radius-md);
        overflow-x: auto;
      }

      pre code {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.875rem;
        line-height: 1.5;
      }

      /* Footnotes */
      .footnotes {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 2px solid var(--border-color);
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .footnote-ref {
        text-decoration: none;
        color: var(--primary-color);
        font-weight: 600;
      }

      .footnote-backref {
        text-decoration: none;
        color: var(--text-muted);
        margin-left: 0.25rem;
      }
    `;
  }

  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ============================================
  // RELATED DOCUMENTS MANAGER METHODS
  // ============================================

  /**
   * Find documents related to the current document based on shared topics
   * Scores documents by number of shared topics and returns top 5
   */
  findRelatedDocuments(currentTopics: string[]): void {
    if (currentTopics.length === 0 || !this.appState.searchResults || this.appState.searchResults.length === 0) {
      this.appState.setDocumentState('relatedDocuments', []);
      return;
    }

    // Score documents by number of shared topics
    const scoredDocs = this.appState.searchResults
      .filter(doc => doc.path !== this.appState.selectedDocument?.path)
      .map(doc => {
        const sharedTopics = doc.topics.filter(t => currentTopics.includes(t));
        return {
          doc,
          score: sharedTopics.length
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.doc);

    this.appState.setDocumentState('relatedDocuments', scoredDocs);
  }
}
