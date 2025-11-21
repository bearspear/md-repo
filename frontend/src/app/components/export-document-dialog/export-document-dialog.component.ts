import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { ExportManagerService } from '../../services/export-manager.service';
import { DocumentThemeService, DocumentTheme } from '../../services/document-theme.service';

interface ExportFormat {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface ExportDialogData {
  markdown: string;
  htmlContent?: string;
  title: string;
  preselectedTheme?: string;
}

@Component({
  selector: 'app-export-document-dialog',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatRadioModule,
    MatSelectModule,
    MatExpansionModule,
    FormsModule
  ],
  templateUrl: './export-document-dialog.component.html',
  styleUrl: './export-document-dialog.component.css'
})
export class ExportDocumentDialogComponent {
  exportFormats: ExportFormat[] = [
    { value: 'html', label: 'HTML', description: 'Styled HTML file for web viewing', icon: 'code' },
    { value: 'pdf', label: 'PDF', description: 'Portable Document Format', icon: 'picture_as_pdf' },
    { value: 'docx', label: 'DOCX', description: 'Microsoft Word document', icon: 'description' },
    { value: 'txt', label: 'Plain Text', description: 'Plain text without formatting', icon: 'text_fields' },
    { value: 'md', label: 'Markdown', description: 'Original markdown file', icon: 'article' }
  ];

  selectedFormat: string = 'html';
  selectedTheme: string = 'default';
  isExporting: boolean = false;
  errorMessage: string = '';

  // Themes
  themes: DocumentTheme[] = [];
  showThemeSelector: boolean = false;

  constructor(
    private http: HttpClient,
    private exportManager: ExportManagerService,
    private themeService: DocumentThemeService,
    public dialogRef: MatDialogRef<ExportDocumentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogData
  ) {
    this.themes = this.themeService.getAllThemes();

    // Use the preview theme if provided
    if (data.preselectedTheme) {
      this.selectedTheme = data.preselectedTheme;
    }
  }

  /**
   * Check if current format supports theming
   */
  get supportsTheming(): boolean {
    return this.selectedFormat === 'html' || this.selectedFormat === 'pdf';
  }

  /**
   * Get themes by category
   */
  getThemesByCategory(category: string): DocumentTheme[] {
    return this.themes.filter(t => t.category === category);
  }

  /**
   * Get currently selected theme details
   */
  getSelectedThemeDetails(): DocumentTheme | undefined {
    return this.themes.find(t => t.id === this.selectedTheme);
  }

  exportDocument() {
    if (!this.selectedFormat) {
      this.errorMessage = 'Please select an export format';
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';

    // Use client-side export for HTML and PDF to preserve all special rendering
    if (this.selectedFormat === 'html' || this.selectedFormat === 'pdf') {
      try {
        if (!this.data.htmlContent) {
          this.errorMessage = 'HTML content is not available for export';
          this.isExporting = false;
          return;
        }

        if (this.selectedFormat === 'html') {
          this.exportManager.exportDocumentAsHTML(
            this.data.htmlContent,
            this.data.title || 'document',
            undefined,
            this.selectedTheme
          );
        } else {
          this.exportManager.exportDocumentAsPDF(
            this.data.htmlContent,
            this.data.title || 'document',
            this.selectedTheme
          );
        }

        // Close dialog after a short delay to ensure export started
        setTimeout(() => {
          this.isExporting = false;
          this.dialogRef.close({ success: true, format: this.selectedFormat });
        }, 100);
      } catch (error) {
        console.error('Export error:', error);
        this.errorMessage = 'Failed to export document. Please try again.';
        this.isExporting = false;
      }
      return;
    }

    // Use backend API for other formats (DOCX, TXT, MD)
    const exportRequest = {
      markdown: this.data.markdown,
      format: this.selectedFormat,
      title: this.data.title || 'document'
    };

    this.http.post('http://localhost:3011/api/studio/export', exportRequest, {
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        // Get filename from Content-Disposition header or construct one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `${this.data.title || 'document'}.${this.getFileExtension(this.selectedFormat)}`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Create download link
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);

          // Close dialog
          this.dialogRef.close({ success: true, format: this.selectedFormat });
        }
      },
      error: (error) => {
        console.error('Export error:', error);
        this.errorMessage = error.error?.error || 'Failed to export document. Please try again.';
        this.isExporting = false;
      },
      complete: () => {
        this.isExporting = false;
      }
    });
  }

  private getFileExtension(format: string): string {
    const extensions: { [key: string]: string } = {
      'html': 'html',
      'pdf': 'pdf',
      'docx': 'docx',
      'txt': 'txt',
      'md': 'md'
    };
    return extensions[format] || 'txt';
  }

  cancel() {
    this.dialogRef.close();
  }
}
