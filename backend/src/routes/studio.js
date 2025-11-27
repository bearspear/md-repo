const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const DocumentExporter = require('../services/documentExporter');

// Configure multer for document imports
const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitized);
  }
});

const importUpload = multer({
  storage: importStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.md', '.markdown', '.html', '.htm', '.txt', '.pdf', '.docx', '.epub'];

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = function(dependencies) {
  const { config, documentConverter, imageRepository, imageLocalizer } = dependencies;

  // Save studio document (create or update)
  router.post('/documents', async (req, res) => {
    try {
      const { id, title, content } = req.body;

      if (!id || !title) {
        return res.status(400).json({ error: 'id and title are required' });
      }

      if (content === undefined) {
        return res.status(400).json({ error: 'content is required' });
      }

      // Create studio documents directory if it doesn't exist
      const studioDir = path.join(config.getWatchDirectory(), '.studio-documents');
      if (!fs.existsSync(studioDir)) {
        fs.mkdirSync(studioDir, { recursive: true });
      }

      // Save document to file
      const filename = `${id}.json`;
      const filePath = path.join(studioDir, filename);

      const documentData = {
        id,
        title,
        content,
        lastModified: new Date().toISOString(),
        createdAt: fs.existsSync(filePath)
          ? JSON.parse(fs.readFileSync(filePath, 'utf8')).createdAt
          : new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(documentData, null, 2), 'utf8');

      res.json({
        message: 'Studio document saved successfully',
        document: documentData
      });
    } catch (error) {
      console.error('Error saving studio document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get studio document by ID
  router.get('/documents/:id', (req, res) => {
    try {
      const { id } = req.params;

      const studioDir = path.join(config.getWatchDirectory(), '.studio-documents');
      const filePath = path.join(studioDir, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Studio document not found' });
      }

      const documentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(documentData);
    } catch (error) {
      console.error('Error loading studio document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all studio documents
  router.get('/documents', (req, res) => {
    try {
      const studioDir = path.join(config.getWatchDirectory(), '.studio-documents');

      if (!fs.existsSync(studioDir)) {
        return res.json({ documents: [] });
      }

      const files = fs.readdirSync(studioDir).filter(f => f.endsWith('.json'));
      const documents = files.map(file => {
        const filePath = path.join(studioDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Return summary without full content
        return {
          id: data.id,
          title: data.title,
          lastModified: data.lastModified,
          createdAt: data.createdAt,
          previewText: data.content.substring(0, 100)
        };
      });

      // Sort by lastModified descending
      documents.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      res.json({ documents });
    } catch (error) {
      console.error('Error listing studio documents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete studio document
  router.delete('/documents/:id', (req, res) => {
    try {
      const { id } = req.params;

      const studioDir = path.join(config.getWatchDirectory(), '.studio-documents');
      const filePath = path.join(studioDir, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Studio document not found' });
      }

      fs.unlinkSync(filePath);
      res.json({ message: 'Studio document deleted successfully', id });
    } catch (error) {
      console.error('Error deleting studio document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import document (convert various formats to Markdown)
  router.post('/import', importUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const originalFilename = req.file.originalname;

      console.log(`Converting file: ${originalFilename}`);

      // Check if file type is supported
      if (!documentConverter.isSupported(originalFilename)) {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: 'Unsupported file type',
          supportedTypes: documentConverter.getSupportedExtensions()
        });
      }

      try {
        // Convert to markdown
        let conversionResult = await documentConverter.convertToMarkdown(filePath, req.file.mimetype);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        // Handle both string and object results (for backward compatibility)
        let markdown;
        let embeddedImages = [];
        let epubMetadata = null;
        if (typeof conversionResult === 'object' && conversionResult.markdown) {
          markdown = conversionResult.markdown;
          embeddedImages = conversionResult.embeddedImages || [];
          epubMetadata = conversionResult.metadata || null;
        } else {
          markdown = conversionResult;
        }

        console.log(`Successfully converted ${originalFilename} to Markdown`);
        console.log(`[Import] Embedded images count: ${embeddedImages.length}`);

        // Handle embedded images from EPUB
        let localizedImages = [];
        if (embeddedImages.length > 0) {
          console.log(`[Import] Processing ${embeddedImages.length} embedded image(s) from EPUB`);

          // Create a prefix from the book title or filename
          const bookTitle = epubMetadata?.title || originalFilename.replace(/\.epub$/i, '');
          const titlePrefix = bookTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30);

          for (const img of embeddedImages) {
            try {
              // Use the original filename from the EPUB with book title prefix
              const originalImageName = img.href.split('/').pop();
              const prefixedImageName = `${titlePrefix}-${originalImageName}`;

              const savedImage = await imageRepository.storeImage(
                img.data,
                prefixedImageName,
                img.mediaType,
                originalFilename
              );

              // Update markdown to reference the saved image
              const imageFilename = img.href.split('/').pop();
              const newRef = `http://localhost:3011/api/images/${savedImage.imageId}`;
              const filenameEscaped = imageFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              markdown = markdown.replace(
                new RegExp(`(!\\[[^\\]]*\\]\\()[^)]*${filenameEscaped}(\\))`, 'g'),
                `$1${newRef}$2`
              );

              localizedImages.push({
                id: savedImage.imageId,
                originalUrl: img.href,
                localizedUrl: newRef
              });

              console.log(`[Import] Saved embedded image: ${img.href} -> ${newRef}`);
            } catch (imgError) {
              console.error(`[Import] Failed to save embedded image ${img.id}:`, imgError.message);
            }
          }
        }

        // Also localize any external URL images in the markdown
        if (embeddedImages.length === 0) {
          try {
            const localizationResult = await imageLocalizer.localizeImages(markdown, originalFilename);
            markdown = localizationResult.markdown;
            localizedImages = [...localizedImages, ...localizationResult.images];

            if (localizationResult.localizedCount > 0) {
              console.log(`[Import] Localized ${localizationResult.localizedCount} external image(s) from ${originalFilename}`);
            }
          } catch (imageError) {
            console.error(`[Import] Failed to localize images: ${imageError.message}`);
          }
        }

        res.json({
          message: 'File converted successfully',
          markdown: markdown,
          originalFilename: originalFilename,
          fileType: path.extname(originalFilename).toLowerCase(),
          localizedImages: localizedImages.length,
          images: localizedImages
        });
      } catch (conversionError) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw conversionError;
      }
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({
        error: 'Failed to convert document',
        details: error.message
      });
    }
  });

  // Export document endpoint (convert Markdown to various formats)
  router.post('/export', async (req, res) => {
    try {
      const { markdown, format, title } = req.body;

      if (!markdown) {
        return res.status(400).json({ error: 'No markdown content provided' });
      }

      if (!format) {
        return res.status(400).json({ error: 'No export format specified' });
      }

      if (!DocumentExporter.isFormatSupported(format)) {
        return res.status(400).json({
          error: 'Unsupported export format',
          supportedFormats: DocumentExporter.getSupportedFormats()
        });
      }

      console.log(`Exporting document to ${format}`);

      try {
        const { buffer, mimeType, extension } = await DocumentExporter.exportDocument(
          markdown,
          format,
          title || 'document'
        );

        const filename = `${title || 'document'}${extension}`;

        console.log(`Successfully exported to ${format}`);

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);
      } catch (exportError) {
        throw exportError;
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        error: 'Failed to export document',
        details: error.message
      });
    }
  });

  return router;
};
