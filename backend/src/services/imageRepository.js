const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ImageRepository {
  constructor(storageBasePath = path.join(__dirname, '../../images')) {
    this.storageBasePath = storageBasePath;
    this.originalsPath = path.join(storageBasePath, 'originals');
    this.thumbnailsPath = path.join(storageBasePath, 'thumbnails');
    this.metadataPath = path.join(storageBasePath, 'metadata');
  }

  /**
   * Generate SHA-256 hash from file buffer for content-based deduplication
   * @param {Buffer} fileBuffer - The file buffer to hash
   * @returns {string} The SHA-256 hash in hexadecimal format
   */
  generateImageId(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Map MIME type to file extension
   * @param {string} mimeType - The MIME type (e.g., 'image/png')
   * @returns {string} The file extension (e.g., 'png')
   */
  getFileExtension(mimeType) {
    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'image/x-icon': 'ico'
    };

    return extensionMap[mimeType] || 'bin';
  }

  /**
   * Detect MIME type from buffer
   * @param {Buffer} fileBuffer - The file buffer
   * @returns {Promise<string>} The detected MIME type
   */
  async detectMimeType(fileBuffer) {
    try {
      const { fileTypeFromBuffer } = await import('file-type');
      const fileType = await fileTypeFromBuffer(fileBuffer);
      return fileType ? fileType.mime : 'application/octet-stream';
    } catch (error) {
      console.error('Error detecting MIME type:', error);
      return 'application/octet-stream';
    }
  }

  /**
   * Get storage paths for an image
   * @param {string} imageId - The SHA-256 hash ID
   * @param {string} mimeType - The MIME type
   * @returns {Object} Object containing original, thumbnail, and metadata paths
   */
  getStoragePaths(imageId, mimeType) {
    const extension = this.getFileExtension(mimeType);

    return {
      original: path.join(this.originalsPath, `${imageId}.${extension}`),
      thumbnail: path.join(this.thumbnailsPath, `${imageId}.jpg`),
      metadata: path.join(this.metadataPath, `${imageId}.json`)
    };
  }

  /**
   * Store a single image with metadata
   * @param {Buffer} fileBuffer - The image file buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type of the image
   * @param {string} documentPath - Path of the document using this image
   * @returns {Promise<Object>} Object containing imageId and file paths
   */
  async storeImage(fileBuffer, originalName, mimeType, documentPath = null) {
    try {
      // Generate content-based hash ID
      const imageId = this.generateImageId(fileBuffer);

      // Get storage paths
      const paths = this.getStoragePaths(imageId, mimeType);

      // Check if image already exists
      const existingMetadata = await this.getMetadata(imageId);

      if (existingMetadata) {
        console.log(`Image ${imageId} already exists, incrementing reference count`);

        // Update reference count and document associations
        existingMetadata.referenceCount = (existingMetadata.referenceCount || 1) + 1;
        existingMetadata.updatedAt = new Date().toISOString();

        if (documentPath && !existingMetadata.usedInDocuments.includes(documentPath)) {
          existingMetadata.usedInDocuments.push(documentPath);
        }

        // Save updated metadata
        await fs.writeFile(paths.metadata, JSON.stringify(existingMetadata, null, 2));

        return {
          imageId,
          existed: true,
          paths,
          metadata: existingMetadata
        };
      }

      // New image - store the file
      await fs.writeFile(paths.original, fileBuffer);

      // Get image dimensions using sharp
      let dimensions = { width: 0, height: 0 };
      try {
        const imageMetadata = await sharp(fileBuffer).metadata();
        dimensions = {
          width: imageMetadata.width || 0,
          height: imageMetadata.height || 0
        };
      } catch (error) {
        console.error('Error reading image dimensions:', error);
      }

      // Create metadata
      const metadata = {
        imageId,
        originalName,
        mimeType,
        size: fileBuffer.length,
        width: dimensions.width,
        height: dimensions.height,
        extension: this.getFileExtension(mimeType),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        referenceCount: 1,
        usedInDocuments: documentPath ? [documentPath] : [],
        hasThumbnail: false
      };

      // Save metadata
      await fs.writeFile(paths.metadata, JSON.stringify(metadata, null, 2));

      console.log(`Stored new image ${imageId} (${originalName})`);

      return {
        imageId,
        existed: false,
        paths,
        metadata
      };
    } catch (error) {
      console.error('Error storing image:', error);
      throw new Error(`Failed to store image: ${error.message}`);
    }
  }

  /**
   * Store multiple images (batch upload)
   * @param {Array} files - Array of file objects with buffer, originalName, mimeType
   * @param {string} documentPath - Path of the document using these images
   * @returns {Promise<Array>} Array of storage results
   */
  async storeMultiple(files, documentPath = null) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.storeImage(
          file.buffer,
          file.originalName,
          file.mimeType,
          documentPath
        );
        results.push(result);
      } catch (error) {
        console.error(`Error storing file ${file.originalName}:`, error);
        results.push({
          originalName: file.originalName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get image file buffer
   * @param {string} imageId - The SHA-256 hash ID
   * @returns {Promise<Buffer|null>} The image file buffer or null if not found
   */
  async getImage(imageId) {
    try {
      const metadata = await this.getMetadata(imageId);

      if (!metadata) {
        return null;
      }

      const paths = this.getStoragePaths(imageId, metadata.mimeType);
      const imageBuffer = await fs.readFile(paths.original);

      return imageBuffer;
    } catch (error) {
      console.error(`Error retrieving image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get image metadata
   * @param {string} imageId - The SHA-256 hash ID
   * @returns {Promise<Object|null>} The metadata object or null if not found
   */
  async getMetadata(imageId) {
    try {
      const metadataPath = path.join(this.metadataPath, `${imageId}.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(metadataContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      console.error(`Error reading metadata for ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for an image (lazy generation)
   * @param {string} imageId - The SHA-256 hash ID
   * @returns {Promise<Buffer|null>} The thumbnail buffer or null on error
   */
  async generateThumbnail(imageId) {
    try {
      const metadata = await this.getMetadata(imageId);

      if (!metadata) {
        throw new Error('Image metadata not found');
      }

      const paths = this.getStoragePaths(imageId, metadata.mimeType);

      // Check if thumbnail already exists
      try {
        const existingThumbnail = await fs.readFile(paths.thumbnail);
        return existingThumbnail;
      } catch (error) {
        // Thumbnail doesn't exist, generate it
      }

      // Read original image
      const originalBuffer = await fs.readFile(paths.original);

      // Generate 120x120 thumbnail
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(120, 120, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Save thumbnail
      await fs.writeFile(paths.thumbnail, thumbnailBuffer);

      // Update metadata
      metadata.hasThumbnail = true;
      metadata.updatedAt = new Date().toISOString();
      await fs.writeFile(paths.metadata, JSON.stringify(metadata, null, 2));

      console.log(`Generated thumbnail for image ${imageId}`);

      return thumbnailBuffer;
    } catch (error) {
      console.error(`Error generating thumbnail for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get thumbnail (generates if doesn't exist)
   * @param {string} imageId - The SHA-256 hash ID
   * @returns {Promise<Buffer|null>} The thumbnail buffer or null on error
   */
  async getThumbnail(imageId) {
    try {
      const metadata = await this.getMetadata(imageId);

      if (!metadata) {
        return null;
      }

      const paths = this.getStoragePaths(imageId, metadata.mimeType);

      // Try to read existing thumbnail
      try {
        const thumbnailBuffer = await fs.readFile(paths.thumbnail);
        return thumbnailBuffer;
      } catch (error) {
        // Generate thumbnail if it doesn't exist
        return await this.generateThumbnail(imageId);
      }
    } catch (error) {
      console.error(`Error getting thumbnail for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Delete image (with reference counting)
   * @param {string} imageId - The SHA-256 hash ID
   * @param {string} documentPath - Document path removing the reference
   * @returns {Promise<Object>} Result object with deletion status
   */
  async deleteImage(imageId, documentPath = null) {
    try {
      const metadata = await this.getMetadata(imageId);

      if (!metadata) {
        return { success: false, error: 'Image not found' };
      }

      const paths = this.getStoragePaths(imageId, metadata.mimeType);

      // Decrement reference count
      metadata.referenceCount = Math.max(0, (metadata.referenceCount || 1) - 1);

      // Remove from document associations
      if (documentPath && metadata.usedInDocuments.includes(documentPath)) {
        metadata.usedInDocuments = metadata.usedInDocuments.filter(
          doc => doc !== documentPath
        );
      }

      // If no more references, delete the files
      if (metadata.referenceCount === 0) {
        // Delete original
        try {
          await fs.unlink(paths.original);
        } catch (error) {
          console.error(`Error deleting original ${imageId}:`, error);
        }

        // Delete thumbnail if exists
        try {
          await fs.unlink(paths.thumbnail);
        } catch (error) {
          // Thumbnail might not exist
        }

        // Delete metadata
        try {
          await fs.unlink(paths.metadata);
        } catch (error) {
          console.error(`Error deleting metadata ${imageId}:`, error);
        }

        console.log(`Deleted image ${imageId} (no more references)`);

        return { success: true, deleted: true };
      } else {
        // Update metadata with decremented count
        metadata.updatedAt = new Date().toISOString();
        await fs.writeFile(paths.metadata, JSON.stringify(metadata, null, 2));

        console.log(`Decremented reference count for ${imageId} to ${metadata.referenceCount}`);

        return { success: true, deleted: false, referenceCount: metadata.referenceCount };
      }
    } catch (error) {
      console.error(`Error deleting image ${imageId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all images with optional filtering
   * @param {Object} filters - Optional filters (documentPath, mimeType, etc.)
   * @returns {Promise<Array>} Array of metadata objects
   */
  async listImages(filters = {}) {
    try {
      const metadataFiles = await fs.readdir(this.metadataPath);
      const images = [];

      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) continue;

        const metadataPath = path.join(this.metadataPath, file);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

        // Apply filters
        if (filters.documentPath && !metadata.usedInDocuments.includes(filters.documentPath)) {
          continue;
        }

        if (filters.mimeType && metadata.mimeType !== filters.mimeType) {
          continue;
        }

        images.push(metadata);
      }

      return images;
    } catch (error) {
      console.error('Error listing images:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    try {
      const images = await this.listImages();

      const stats = {
        totalImages: images.length,
        totalSize: images.reduce((sum, img) => sum + img.size, 0),
        totalReferences: images.reduce((sum, img) => sum + (img.referenceCount || 1), 0),
        byMimeType: {}
      };

      // Group by MIME type
      images.forEach(img => {
        if (!stats.byMimeType[img.mimeType]) {
          stats.byMimeType[img.mimeType] = {
            count: 0,
            size: 0
          };
        }
        stats.byMimeType[img.mimeType].count++;
        stats.byMimeType[img.mimeType].size += img.size;
      });

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        totalReferences: 0,
        byMimeType: {}
      };
    }
  }
}

module.exports = ImageRepository;
