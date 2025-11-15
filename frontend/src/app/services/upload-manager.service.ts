import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class UploadManagerService {
  uploadProgress: string[] = [];
  dragOver = false;

  constructor(
    private searchService: SearchService,
    private uiState: UIStateService
  ) {}

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
    this.uiState.setState('isUploading', true);
    this.uploadProgress = [];

    if (files.length === 1) {
      const file = files[0];
      this.uploadProgress.push(`Uploading ${file.name}...`);

      this.searchService.uploadFile(file).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${file.name} uploaded successfully`);
          this.uiState.setState('isUploading', false);
          if (onComplete) {
            onComplete();
          }
          setTimeout(() => this.uiState.setState('showUploadDialog', false), 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading ${file.name}: ${error.error?.error || error.message}`);
          this.uiState.setState('isUploading', false);
        }
      });
    } else {
      this.uploadProgress.push(`Uploading ${files.length} files...`);

      this.searchService.uploadMultipleFiles(files).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${files.length} files uploaded successfully`);
          this.uiState.setState('isUploading', false);
          if (onComplete) {
            onComplete();
          }
          setTimeout(() => this.uiState.setState('showUploadDialog', false), 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading files: ${error.error?.error || error.message}`);
          this.uiState.setState('isUploading', false);
        }
      });
    }
  }

  /**
   * Close upload dialog and reset state
   */
  closeUploadDialog(): void {
    this.uiState.setState('showUploadDialog', false);
    this.uploadProgress = [];
  }
}
