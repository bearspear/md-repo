import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ImageRepositoryService, ImageMetadata } from '../../services/image-repository.service';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.css']
})
export class ImageGalleryComponent implements OnInit {
  images: ImageMetadata[] = [];
  filteredImages: ImageMetadata[] = [];
  loading: boolean = false;
  error: string | null = null;
  searchQuery: string = '';

  @Output() imageSelected = new EventEmitter<ImageMetadata>();

  constructor(private imageRepositoryService: ImageRepositoryService) {}

  ngOnInit() {
    this.loadImages();
  }

  /**
   * Load all images from the repository
   */
  loadImages() {
    this.loading = true;
    this.error = null;

    this.imageRepositoryService.listImages().subscribe({
      next: (response) => {
        this.images = response.images;
        this.filteredImages = response.images;
        this.loading = false;
        this.applyFilter();
      },
      error: (error) => {
        console.error('Error loading images:', error);
        this.error = 'Failed to load images. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Apply search filter to images
   */
  applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredImages = this.images;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredImages = this.images.filter(image =>
      image.originalName.toLowerCase().includes(query) ||
      image.mimeType.toLowerCase().includes(query)
    );
  }

  /**
   * Handle search query change
   */
  onSearchChange() {
    this.applyFilter();
  }

  /**
   * Clear search filter
   */
  clearSearch() {
    this.searchQuery = '';
    this.applyFilter();
  }

  /**
   * Handle image click - emit event to insert into editor
   */
  onImageClick(image: ImageMetadata) {
    this.imageSelected.emit(image);
  }

  /**
   * Format file size for display
   */
  formatSize(bytes: number): string {
    return this.imageRepositoryService.formatFileSize(bytes);
  }

  /**
   * Get thumbnail URL for an image
   */
  getThumbnailUrl(imageId: string): string {
    return this.imageRepositoryService.getThumbnailUrl(imageId);
  }

  /**
   * Get full image URL
   */
  getImageUrl(imageId: string): string {
    return this.imageRepositoryService.getImageUrl(imageId);
  }

  /**
   * Refresh the gallery
   */
  refresh() {
    this.loadImages();
  }

  /**
   * Copy markdown reference to clipboard
   */
  copyMarkdownReference(image: ImageMetadata, event: Event) {
    event.stopPropagation(); // Prevent card click event

    const markdownRef = this.imageRepositoryService.generateMarkdownReference(
      image.imageId,
      image.originalName,
      image.originalName
    );

    navigator.clipboard.writeText(markdownRef).then(() => {
      console.log('Markdown reference copied to clipboard');
      // TODO: Show snackbar notification
    }).catch(err => {
      console.error('Failed to copy markdown reference:', err);
      alert('Failed to copy to clipboard');
    });
  }

  /**
   * Delete image with confirmation
   */
  deleteImage(image: ImageMetadata, event: Event) {
    event.stopPropagation(); // Prevent card click event

    const confirmMessage = `Are you sure you want to delete "${image.originalName}"?\n\nThis image has ${image.referenceCount} reference(s). The image will be permanently deleted only if all references are removed.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.imageRepositoryService.deleteImage(image.imageId).subscribe({
      next: (response) => {
        console.log('Image deleted:', response);

        // Remove from local arrays
        this.images = this.images.filter(img => img.imageId !== image.imageId);
        this.applyFilter();

        if (response.deleted) {
          alert('Image deleted successfully!');
        } else {
          alert(`Reference removed. ${response.referenceCount} reference(s) remaining.`);
        }
      },
      error: (error) => {
        console.error('Error deleting image:', error);
        alert('Failed to delete image. Please try again.');
      }
    });
  }

  /**
   * View full-size image
   */
  viewImage(image: ImageMetadata, event: Event) {
    event.stopPropagation(); // Prevent card click event

    const imageUrl = this.getImageUrl(image.imageId);
    window.open(imageUrl, '_blank');
  }
}
