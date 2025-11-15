import { Injectable } from '@angular/core';
import { Annotation } from './annotation.service';
import { SearchResult } from './search.service';

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

@Injectable({
  providedIn: 'root'
})
export class ExportManagerService {

  constructor() {}

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
}
