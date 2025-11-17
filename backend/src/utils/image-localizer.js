/**
 * Image Localizer Utility
 *
 * Extracts images from markdown content (base64 data URLs or external URLs)
 * and uploads them to the image repository, replacing references with repository IDs.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');

class ImageLocalizer {
  constructor(imageRepoService) {
    this.imageRepoService = imageRepoService;
  }

  /**
   * Localize all images in markdown content
   * Extracts base64 and URL images, uploads to repository, and replaces references
   *
   * @param {string} markdown - The markdown content
   * @param {string} documentId - The document ID for reference tracking
   * @returns {Promise<{markdown: string, images: Array}>} - Updated markdown and list of uploaded images
   */
  async localizeImages(markdown, documentId) {
    const images = [];
    let updatedMarkdown = markdown;

    // Pattern to match markdown images: ![alt](src)
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...markdown.matchAll(imagePattern)];

    for (const match of matches) {
      const fullMatch = match[0];
      const altText = match[1];
      const imageSrc = match[2];

      try {
        let imageData = null;
        let filename = altText || 'imported-image';

        // Check if it's a base64 data URL
        if (imageSrc.startsWith('data:image/')) {
          console.log('[ImageLocalizer] Processing base64 image...');
          imageData = await this.processBase64Image(imageSrc, filename);
        }
        // Check if it's an external URL
        else if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
          console.log(`[ImageLocalizer] Processing external image URL: ${imageSrc.substring(0, 50)}...`);
          imageData = await this.processExternalUrl(imageSrc);
        }
        // Skip relative paths and already-localized images
        else {
          console.log(`[ImageLocalizer] Skipping image (already local or relative): ${imageSrc.substring(0, 50)}`);
          continue;
        }

        if (imageData) {
          // Upload to repository
          const result = await this.imageRepoService.storeImage(
            imageData.buffer,
            imageData.originalName,
            imageData.mimeType,
            documentId
          );

          // Generate new markdown reference
          const newReference = this.generateMarkdownReference(
            result.imageId,
            altText || imageData.originalName
          );

          // Replace in markdown
          updatedMarkdown = updatedMarkdown.replace(fullMatch, newReference);

          images.push({
            imageId: result.imageId,
            originalSrc: imageSrc.substring(0, 100),
            originalName: imageData.originalName,
            newReference: newReference
          });

          console.log(`[ImageLocalizer] Localized image: ${imageData.originalName} -> ${result.imageId}`);
        }
      } catch (error) {
        console.error(`[ImageLocalizer] Error processing image: ${error.message}`);
        // Continue with other images even if one fails
      }
    }

    return {
      markdown: updatedMarkdown,
      images: images,
      localizedCount: images.length
    };
  }

  /**
   * Process a base64 data URL image
   *
   * @param {string} dataUrl - The base64 data URL
   * @param {string} suggestedFilename - Suggested filename
   * @returns {Promise<{buffer: Buffer, originalName: string, mimeType: string}>}
   */
  async processBase64Image(dataUrl, suggestedFilename) {
    // Extract mime type and base64 data
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data URL format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine file extension from mime type
    const ext = this.getExtensionFromMimeType(mimeType);
    const originalName = suggestedFilename.includes('.')
      ? suggestedFilename
      : `${suggestedFilename}.${ext}`;

    return {
      buffer,
      originalName,
      mimeType
    };
  }

  /**
   * Process an external URL image
   *
   * @param {string} url - The image URL
   * @returns {Promise<{buffer: Buffer, originalName: string, mimeType: string}>}
   */
  async processExternalUrl(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'MD-Repo-ImageLocalizer/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || 'image/png';

      // Extract filename from URL or generate one
      const urlPath = new URL(url).pathname;
      const urlFilename = path.basename(urlPath);
      const originalName = urlFilename && urlFilename !== '/' && urlFilename.includes('.')
        ? urlFilename
        : `imported-${Date.now()}.${this.getExtensionFromMimeType(mimeType)}`;

      return {
        buffer,
        originalName,
        mimeType
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout fetching image from ${url}`);
      }
      throw new Error(`Failed to fetch image from ${url}: ${error.message}`);
    }
  }

  /**
   * Get file extension from MIME type
   *
   * @param {string} mimeType - The MIME type
   * @returns {string} - File extension
   */
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    };

    return mimeToExt[mimeType.toLowerCase()] || 'png';
  }

  /**
   * Generate markdown reference for an image
   *
   * @param {string} imageId - The image ID (SHA-256 hash)
   * @param {string} altText - Alt text for the image
   * @returns {string} - Markdown image reference
   */
  generateMarkdownReference(imageId, altText) {
    return `![${altText}](/api/images/${imageId})`;
  }
}

module.exports = ImageLocalizer;
