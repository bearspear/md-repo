import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImageMetadata {
  imageId: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  extension: string;
  referenceCount: number;
  hasThumbnail: boolean;
  usedInDocuments: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
  thumbnailUrl: string;
}

export interface UploadResponse {
  success: boolean;
  imageId: string;
  originalName: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
  url: string;
  existed: boolean;
}

export interface BatchUploadResponse {
  success: boolean;
  uploaded: number;
  failed: number;
  images: Array<{
    imageId: string;
    originalName: string;
    size: number;
    mimeType: string;
    width: number;
    height: number;
    url: string;
    existed: boolean;
  }>;
  errors: any[];
}

export interface ImageListResponse {
  success: boolean;
  count: number;
  images: ImageMetadata[];
}

export interface ImageStatsResponse {
  success: boolean;
  stats: {
    totalImages: number;
    totalSize: number;
    totalSizeFormatted: string;
    totalReferences: number;
    byMimeType: {
      [mimeType: string]: {
        count: number;
        size: number;
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ImageRepositoryService {
  private apiUrl = 'http://localhost:3011/api/images';

  constructor(private http: HttpClient) {}

  /**
   * Upload a single image file
   * @param file The image file to upload
   * @param documentPath Optional path of the document using this image
   * @returns Observable with upload response
   */
  uploadImage(file: File, documentPath?: string): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    if (documentPath) {
      formData.append('documentPath', documentPath);
    }

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/upload-single`,
      formData
    );
  }

  /**
   * Upload multiple image files
   * @param files Array of image files to upload
   * @param documentPath Optional path of the document using these images
   * @returns Observable with batch upload response
   */
  uploadImages(files: File[], documentPath?: string): Observable<BatchUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('images', file);
    });

    if (documentPath) {
      formData.append('documentPath', documentPath);
    }

    return this.http.post<BatchUploadResponse>(
      `${this.apiUrl}/upload`,
      formData
    );
  }

  /**
   * Import an image from an external URL
   * @param url The URL of the image to import
   * @param documentPath Optional path of the document using this image
   * @returns Observable with upload response
   */
  importFromUrl(url: string, documentPath?: string): Observable<UploadResponse> {
    const body: any = { url };

    if (documentPath) {
      body.documentPath = documentPath;
    }

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/import-from-url`,
      body
    );
  }

  /**
   * Get image URL by ID
   * @param imageId The SHA-256 image ID
   * @returns The full URL to the image
   */
  getImageUrl(imageId: string): string {
    return `${this.apiUrl}/${imageId}`;
  }

  /**
   * Get thumbnail URL by ID
   * @param imageId The SHA-256 image ID
   * @returns The full URL to the thumbnail
   */
  getThumbnailUrl(imageId: string): string {
    return `${this.apiUrl}/${imageId}/thumbnail`;
  }

  /**
   * Get image metadata
   * @param imageId The SHA-256 image ID
   * @returns Observable with image metadata
   */
  getMetadata(imageId: string): Observable<{ success: boolean; metadata: ImageMetadata }> {
    return this.http.get<{ success: boolean; metadata: ImageMetadata }>(
      `${this.apiUrl}/${imageId}/metadata`
    );
  }

  /**
   * Delete an image
   * @param imageId The SHA-256 image ID
   * @param documentPath Optional document path removing the reference
   * @returns Observable with deletion result
   */
  deleteImage(imageId: string, documentPath?: string): Observable<any> {
    const options = {
      body: documentPath ? { documentPath } : {}
    };

    return this.http.delete(`${this.apiUrl}/${imageId}`, options);
  }

  /**
   * List all images with optional filters
   * @param filters Optional filters (documentPath, mimeType)
   * @returns Observable with image list
   */
  listImages(filters?: { documentPath?: string; mimeType?: string }): Observable<ImageListResponse> {
    let params: any = {};

    if (filters?.documentPath) {
      params.documentPath = filters.documentPath;
    }

    if (filters?.mimeType) {
      params.mimeType = filters.mimeType;
    }

    return this.http.get<ImageListResponse>(this.apiUrl, { params });
  }

  /**
   * Get storage statistics
   * @returns Observable with storage stats
   */
  getStats(): Observable<ImageStatsResponse> {
    return this.http.get<ImageStatsResponse>(`${this.apiUrl}/stats`);
  }

  /**
   * Insert image markdown reference into text at cursor position
   * @param imageId The SHA-256 image ID
   * @param altText Alt text for the image
   * @param originalName Original filename (used as fallback alt text)
   * @returns Markdown image syntax
   */
  generateMarkdownReference(imageId: string, altText?: string, originalName?: string): string {
    const alt = altText || originalName || 'Image';
    const url = this.getImageUrl(imageId);
    return `![${alt}](${url})`;
  }

  /**
   * Extract image IDs from markdown content
   * @param markdown The markdown content
   * @returns Array of image IDs found in the markdown
   */
  extractImageIds(markdown: string): string[] {
    const imageIds: string[] = [];
    const imageRegex = /!\[.*?\]\((http:\/\/localhost:3011\/api\/images\/([\da-f]{64}))\)/gi;

    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
      imageIds.push(match[2]); // match[2] is the image ID capture group
    }

    return imageIds;
  }

  /**
   * Validate if a file is an image
   * @param file The file to validate
   * @returns True if the file is an image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Format file size to human-readable format
   * @param bytes File size in bytes
   * @param decimals Number of decimal places
   * @returns Formatted file size string
   */
  formatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
