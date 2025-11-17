const express = require('express');
const multer = require('multer');
const ImageRepository = require('../services/imageRepository');
const router = express.Router();

// Initialize ImageRepository
const imageRepo = new ImageRepository();

// Configure multer for memory storage (we'll process the buffer directly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * POST /api/images/upload
 * Upload single or multiple images
 */
router.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const documentPath = req.body.documentPath || null;

    // Process each uploaded file
    const files = req.files.map(file => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype
    }));

    const results = await imageRepo.storeMultiple(files, documentPath);

    // Filter out errors and successful uploads
    const successful = results.filter(r => r.imageId);
    const failed = results.filter(r => r.error);

    res.json({
      success: true,
      uploaded: successful.length,
      failed: failed.length,
      images: successful.map(r => ({
        imageId: r.imageId,
        originalName: r.metadata.originalName,
        size: r.metadata.size,
        mimeType: r.metadata.mimeType,
        width: r.metadata.width,
        height: r.metadata.height,
        url: `/api/images/${r.imageId}`,
        existed: r.existed
      })),
      errors: failed
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      error: 'Failed to upload images',
      message: error.message
    });
  }
});

/**
 * POST /api/images/upload-single
 * Upload a single image (simpler endpoint)
 */
router.post('/upload-single', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentPath = req.body.documentPath || null;

    const result = await imageRepo.storeImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      documentPath
    );

    res.json({
      success: true,
      imageId: result.imageId,
      originalName: result.metadata.originalName,
      size: result.metadata.size,
      mimeType: result.metadata.mimeType,
      width: result.metadata.width,
      height: result.metadata.height,
      url: `/api/images/${result.imageId}`,
      existed: result.existed
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      message: error.message
    });
  }
});

/**
 * POST /api/images/import-from-url
 * Import an image from an external URL
 */
router.post('/import-from-url', async (req, res) => {
  try {
    const { url, documentPath } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let imageUrl;
    try {
      imageUrl = new URL(url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the image from the URL
    const axios = require('axios');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageImporter/1.0)'
      }
    });

    // Get the buffer from the response
    const imageBuffer = Buffer.from(response.data);

    // Detect MIME type from response headers or file type
    const { fileTypeFromBuffer } = await import('file-type');
    const detectedType = await fileTypeFromBuffer(imageBuffer);

    if (!detectedType || !detectedType.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to a valid image' });
    }

    // Extract filename from URL or generate one
    const urlPath = imageUrl.pathname;
    const pathParts = urlPath.split('/');
    const urlFilename = pathParts[pathParts.length - 1] || 'imported-image';
    const originalName = urlFilename.includes('.') ? urlFilename : `${urlFilename}.${detectedType.ext}`;

    // Store the image
    const result = await imageRepo.storeImage(
      imageBuffer,
      originalName,
      detectedType.mime,
      documentPath || null
    );

    res.json({
      success: true,
      imageId: result.imageId,
      originalName: result.metadata.originalName,
      size: result.metadata.size,
      mimeType: result.metadata.mimeType,
      width: result.metadata.width,
      height: result.metadata.height,
      url: `/api/images/${result.imageId}`,
      existed: result.existed,
      sourceUrl: url
    });
  } catch (error) {
    console.error('Error importing image from URL:', error);

    // Provide more specific error messages
    if (error.code === 'ENOTFOUND') {
      return res.status(400).json({
        error: 'Failed to fetch image',
        message: 'Could not resolve hostname. Please check the URL.'
      });
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long. Please try again.'
      });
    } else if (error.response && error.response.status) {
      return res.status(error.response.status).json({
        error: 'Failed to fetch image',
        message: `Server returned status ${error.response.status}`
      });
    }

    res.status(500).json({
      error: 'Failed to import image',
      message: error.message
    });
  }
});

/**
 * GET /api/images/:imageId
 * Serve the full-size image
 */
router.get('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    const metadata = await imageRepo.getMetadata(imageId);

    if (!metadata) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageBuffer = await imageRepo.getImage(imageId);

    if (!imageBuffer) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': metadata.mimeType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': imageId // Use imageId (SHA-256) as ETag
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({
      error: 'Failed to serve image',
      message: error.message
    });
  }
});

/**
 * GET /api/images/:imageId/thumbnail
 * Serve or generate thumbnail (120x120)
 */
router.get('/:imageId/thumbnail', async (req, res) => {
  try {
    const { imageId } = req.params;

    const metadata = await imageRepo.getMetadata(imageId);

    if (!metadata) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const thumbnailBuffer = await imageRepo.getThumbnail(imageId);

    if (!thumbnailBuffer) {
      return res.status(404).json({ error: 'Failed to generate thumbnail' });
    }

    // Set appropriate headers (thumbnails are always JPEG)
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': thumbnailBuffer.length,
      'Cache-Control': 'public, max-age=31536000',
      'ETag': `${imageId}-thumb`
    });

    res.send(thumbnailBuffer);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({
      error: 'Failed to serve thumbnail',
      message: error.message
    });
  }
});

/**
 * GET /api/images/:imageId/metadata
 * Get image metadata
 */
router.get('/:imageId/metadata', async (req, res) => {
  try {
    const { imageId } = req.params;

    const metadata = await imageRepo.getMetadata(imageId);

    if (!metadata) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      success: true,
      metadata: {
        imageId: metadata.imageId,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        extension: metadata.extension,
        referenceCount: metadata.referenceCount,
        hasThumbnail: metadata.hasThumbnail,
        usedInDocuments: metadata.usedInDocuments,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        url: `/api/images/${imageId}`,
        thumbnailUrl: `/api/images/${imageId}/thumbnail`
      }
    });
  } catch (error) {
    console.error('Error getting metadata:', error);
    res.status(500).json({
      error: 'Failed to get metadata',
      message: error.message
    });
  }
});

/**
 * DELETE /api/images/:imageId
 * Delete an image (with reference counting)
 */
router.delete('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { documentPath } = req.body;

    const result = await imageRepo.deleteImage(imageId, documentPath);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      deleted: result.deleted,
      referenceCount: result.referenceCount,
      message: result.deleted
        ? 'Image deleted successfully'
        : `Reference removed. ${result.referenceCount} reference(s) remaining.`
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.message
    });
  }
});

/**
 * GET /api/images
 * List all images with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { documentPath, mimeType } = req.query;

    const filters = {};
    if (documentPath) filters.documentPath = documentPath;
    if (mimeType) filters.mimeType = mimeType;

    const images = await imageRepo.listImages(filters);

    res.json({
      success: true,
      count: images.length,
      images: images.map(img => ({
        imageId: img.imageId,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        width: img.width,
        height: img.height,
        extension: img.extension,
        referenceCount: img.referenceCount,
        hasThumbnail: img.hasThumbnail,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
        url: `/api/images/${img.imageId}`,
        thumbnailUrl: `/api/images/${img.imageId}/thumbnail`
      }))
    });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({
      error: 'Failed to list images',
      message: error.message
    });
  }
});

/**
 * GET /api/images/stats
 * Get storage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await imageRepo.getStats();

    res.json({
      success: true,
      stats: {
        totalImages: stats.totalImages,
        totalSize: stats.totalSize,
        totalSizeFormatted: formatBytes(stats.totalSize),
        totalReferences: stats.totalReferences,
        byMimeType: stats.byMimeType
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

/**
 * Helper function to format bytes
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
