import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpEventType } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-import-document-dialog',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  templateUrl: './import-document-dialog.component.html',
  styleUrls: ['./import-document-dialog.component.css']
})
export class ImportDocumentDialogComponent {
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  errorMessage = '';
  convertedMarkdown = '';

  supportedFormats = [
    { extension: '.html', label: 'HTML' },
    { extension: '.htm', label: 'HTML' },
    { extension: '.txt', label: 'Text' },
    { extension: '.pdf', label: 'PDF' },
    { extension: '.docx', label: 'Word' },
    { extension: '.epub', label: 'EPUB' }
  ];

  constructor(
    private http: HttpClient,
    private dialogRef: MatDialogRef<ImportDocumentDialogComponent>
  ) {}

  /**
   * Handle file selection
   */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = '';
      this.convertedMarkdown = '';
    }
  }

  /**
   * Check if selected file type is supported
   */
  isFileSupported(): boolean {
    if (!this.selectedFile) return false;

    const fileName = this.selectedFile.name.toLowerCase();
    return this.supportedFormats.some(format =>
      fileName.endsWith(format.extension)
    );
  }

  /**
   * Import and convert the selected file
   */
  importFile() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file first';
      return;
    }

    if (!this.isFileSupported()) {
      this.errorMessage = 'Unsupported file type. Please select a valid file.';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post('http://localhost:3001/api/studio/import', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          // Calculate upload progress
          if (event.total) {
            this.uploadProgress = Math.round((event.loaded / event.total) * 100);
          }
        } else if (event.type === HttpEventType.Response) {
          // Conversion complete
          this.isUploading = false;
          this.convertedMarkdown = event.body.markdown;

          // Close dialog and return markdown
          this.dialogRef.close({
            markdown: event.body.markdown,
            originalFilename: event.body.originalFilename,
            fileType: event.body.fileType
          });
        }
      },
      error: (error) => {
        console.error('Import error:', error);
        this.isUploading = false;
        this.uploadProgress = 0;

        if (error.error?.details) {
          this.errorMessage = `Import failed: ${error.error.details}`;
        } else if (error.error?.error) {
          this.errorMessage = error.error.error;
        } else {
          this.errorMessage = 'Failed to import document. Please try again.';
        }
      }
    });
  }

  /**
   * Cancel and close dialog
   */
  cancel() {
    this.dialogRef.close();
  }

  /**
   * Get file size in human-readable format
   */
  getFileSize(): string {
    if (!this.selectedFile) return '';

    const bytes = this.selectedFile.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
