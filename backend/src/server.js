const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const DocumentDatabase = require('./database');
const FileWatcher = require('./services/fileWatcher');
const DocumentConverter = require('./services/documentConverter');
const DocumentExporter = require('./services/documentExporter');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.getUploadDirectory();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitized);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.md') {
      cb(null, true);
    } else {
      cb(new Error('Only .md files are allowed'));
    }
  }
});

// Configure multer for document imports (HTML, TXT, PDF, DOCX, EPUB)
const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/imports');
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
    const allowedExtensions = ['.html', '.htm', '.txt', '.pdf', '.docx', '.epub'];

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

// Initialize database
const db = new DocumentDatabase('./data/documents.db');

// Initialize file watcher with configured directory
const watchPath = config.getWatchDirectory();
const fileWatcher = new FileWatcher(db, watchPath);

// Initialize document converter
const documentConverter = new DocumentConverter();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Markdown Reader API is running' });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tags
app.get('/api/tags', (req, res) => {
  try {
    const tags = db.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all topics
app.get('/api/topics', (req, res) => {
  try {
    const topics = db.getAllTopics();
    res.json(topics);
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search documents
app.get('/api/search', (req, res) => {
  try {
    const { q, limit, offset, tags, topics, contentType, dateFrom, dateTo } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const options = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      topics: topics ? topics.split(',').map(t => t.trim()) : [],
      contentType: contentType || null,
      dateFrom: dateFrom ? parseInt(dateFrom) : null,
      dateTo: dateTo ? parseInt(dateTo) : null
    };

    const results = db.search(q, options);

    res.json({
      query: q,
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all documents
app.get('/api/documents', (req, res) => {
  try {
    const { limit, offset } = req.query;
    const documents = db.getAllDocuments(
      parseInt(limit) || 100,
      parseInt(offset) || 0
    );

    res.json({
      total: documents.length,
      documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single document by path (using query parameter)
app.get('/api/document', (req, res) => {
  try {
    const { path: docPath } = req.query;

    if (!docPath) {
      return res.status(400).json({ error: 'Path query parameter is required' });
    }

    const document = db.getDocument(docPath);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update document content
app.put('/api/document', async (req, res) => {
  try {
    const { path: docPath, content } = req.body;

    if (!docPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Construct full file path
    const watchDir = config.getWatchDirectory();
    const fullPath = path.join(watchDir, docPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Write content to file
    fs.writeFileSync(fullPath, content, 'utf8');

    // Re-index the file to update the database
    await fileWatcher.indexFile(fullPath);

    res.json({
      message: 'Document saved successfully',
      path: docPath
    });
  } catch (error) {
    console.error('Error saving document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger re-indexing
app.post('/api/index', async (req, res) => {
  try {
    await fileWatcher.indexExistingFiles();
    const stats = db.getStats();

    res.json({
      message: 'Indexing complete',
      stats
    });
  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
  try {
    res.json(config.getAll());
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/watch-directory', (req, res) => {
  try {
    const { directory } = req.body;

    if (!directory) {
      return res.status(400).json({ error: 'Directory is required' });
    }

    config.setWatchDirectory(directory);

    // Restart file watcher with new directory
    fileWatcher.stop();
    fileWatcher.watchPath = directory;
    fileWatcher.start();

    res.json({
      message: 'Watch directory updated',
      config: config.getAll()
    });
  } catch (error) {
    console.error('Error updating watch directory:', error);
    res.status(400).json({ error: error.message });
  }
});

// Annotation endpoints
app.get('/api/annotations', (req, res) => {
  try {
    const { documentPath } = req.query;

    if (!documentPath) {
      return res.status(400).json({ error: 'documentPath query parameter is required' });
    }

    const annotations = db.getAnnotations(documentPath);
    res.json({ annotations });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/annotations', (req, res) => {
  try {
    const { id, documentPath, selectedText, note, color, startOffset, endOffset } = req.body;

    if (!id || !documentPath || !selectedText || startOffset === undefined || endOffset === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.createAnnotation({
      id,
      documentPath,
      selectedText,
      note,
      color,
      startOffset,
      endOffset
    });

    res.status(201).json({ message: 'Annotation created', id });
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/annotations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { note, color } = req.body;

    const existing = db.getAnnotation(id);
    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    db.updateAnnotation(id, { note, color });
    res.json({ message: 'Annotation updated', id });
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/annotations/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.getAnnotation(id);
    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    db.deleteAnnotation(id);
    res.json({ message: 'Annotation deleted', id });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Collection endpoints
app.get('/api/collections', (req, res) => {
  try {
    const collections = db.getAllCollections();
    res.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/collections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const collection = db.getCollection(id);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/collections', (req, res) => {
  try {
    const { id, name, description, color } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    db.createCollection({ id, name, description, color });
    res.status(201).json({ message: 'Collection created', id });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/collections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const existing = db.getCollection(id);
    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.updateCollection(id, { name, description, color });
    res.json({ message: 'Collection updated', id });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/collections/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.getCollection(id);
    if (!existing) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.deleteCollection(id);
    res.json({ message: 'Collection deleted', id });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Document-Collection association endpoints
app.get('/api/collections/:id/documents', (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    const collection = db.getCollection(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const documents = db.getCollectionDocuments(
      id,
      parseInt(limit) || 100,
      parseInt(offset) || 0
    );

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching collection documents:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/collections', (req, res) => {
  try {
    const { documentPath } = req.query;

    if (!documentPath) {
      return res.status(400).json({ error: 'documentPath query parameter is required' });
    }

    const collections = db.getDocumentCollections(documentPath);
    res.json({ collections });
  } catch (error) {
    console.error('Error fetching document collections:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/collections/:id/documents', (req, res) => {
  try {
    const { id } = req.params;
    const { documentPath } = req.body;

    if (!documentPath) {
      return res.status(400).json({ error: 'documentPath is required' });
    }

    const collection = db.getCollection(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.addDocumentToCollection(documentPath, id);
    res.json({ message: 'Document added to collection' });
  } catch (error) {
    console.error('Error adding document to collection:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/collections/:id/documents', (req, res) => {
  try {
    const { id } = req.params;
    const { documentPath } = req.body;

    if (!documentPath) {
      return res.status(400).json({ error: 'documentPath is required' });
    }

    db.removeDocumentFromCollection(documentPath, id);
    res.json({ message: 'Document removed from collection' });
  } catch (error) {
    console.error('Error removing document from collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations
app.post('/api/collections/:id/documents/bulk', (req, res) => {
  try {
    const { id } = req.params;
    const { documentPaths, action } = req.body;

    if (!documentPaths || !Array.isArray(documentPaths)) {
      return res.status(400).json({ error: 'documentPaths array is required' });
    }

    const collection = db.getCollection(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (action === 'add') {
      const result = db.addDocumentsToCollection(documentPaths, id);
      res.json({ message: `${result.added} documents added to collection`, ...result });
    } else if (action === 'remove') {
      const result = db.removeDocumentsFromCollection(documentPaths, id);
      res.json({ message: `${result.removed} documents removed from collection`, ...result });
    } else {
      res.status(400).json({ error: 'action must be either "add" or "remove"' });
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Studio document endpoints
// Save studio document (create or update)
app.post('/api/studio/documents', async (req, res) => {
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
app.get('/api/studio/documents/:id', (req, res) => {
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
app.get('/api/studio/documents', (req, res) => {
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
app.delete('/api/studio/documents/:id', (req, res) => {
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
app.post('/api/studio/import', importUpload.single('file'), async (req, res) => {
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
      const markdown = await documentConverter.convertToMarkdown(filePath, req.file.mimetype);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      console.log(`Successfully converted ${originalFilename} to Markdown`);

      res.json({
        message: 'File converted successfully',
        markdown: markdown,
        originalFilename: originalFilename,
        fileType: path.extname(originalFilename).toLowerCase()
      });
    } catch (conversionError) {
      // Clean up uploaded file on conversion error
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
app.post('/api/studio/export', async (req, res) => {
  try {
    const { markdown, format, title } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'No markdown content provided' });
    }

    if (!format) {
      return res.status(400).json({ error: 'No export format specified' });
    }

    // Check if format is supported
    if (!DocumentExporter.isFormatSupported(format)) {
      return res.status(400).json({
        error: 'Unsupported export format',
        supportedFormats: DocumentExporter.getSupportedFormats()
      });
    }

    console.log(`Exporting document to ${format}`);

    try {
      // Export the markdown
      const { buffer, mimeType, extension} = await DocumentExporter.exportDocument(
        markdown,
        format,
        title || 'document'
      );

      const filename = `${title || 'document'}${extension}`;

      console.log(`Successfully exported to ${format}`);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the file
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

// File upload endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Move file to watch directory
    const watchDir = config.getWatchDirectory();
    const destPath = path.join(watchDir, req.file.originalname);

    fs.renameSync(req.file.path, destPath);

    // Index the file immediately
    await fileWatcher.indexFile(destPath);

    res.json({
      message: 'File uploaded and indexed successfully',
      filename: req.file.originalname,
      path: path.relative(watchDir, destPath)
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const watchDir = config.getWatchDirectory();
    const uploaded = [];

    for (const file of req.files) {
      const destPath = path.join(watchDir, file.originalname);
      fs.renameSync(file.path, destPath);
      await fileWatcher.indexFile(destPath);
      uploaded.push(file.originalname);
    }

    res.json({
      message: `${uploaded.length} files uploaded and indexed`,
      files: uploaded
    });
  } catch (error) {
    console.error('Multi-upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Start file watcher
    await fileWatcher.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Markdown Reader API running on http://localhost:${PORT}`);
      console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
      console.log(`🔍 Search: http://localhost:${PORT}/api/search?q=your-query\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  fileWatcher.stop();
  db.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
