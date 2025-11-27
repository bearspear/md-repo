const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

module.exports = function(dependencies) {
  const { db, config, fileWatcher } = dependencies;

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Markdown Reader API is running' });
  });

  // Get statistics
  router.get('/stats', (req, res) => {
    try {
      const stats = db.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all tags
  router.get('/tags', (req, res) => {
    try {
      const tags = db.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error('Error getting tags:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all topics
  router.get('/topics', (req, res) => {
    try {
      const topics = db.getAllTopics();
      res.json(topics);
    } catch (error) {
      console.error('Error getting topics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search documents
  router.get('/search', (req, res) => {
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
  router.get('/documents', (req, res) => {
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
  router.get('/document', (req, res) => {
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
  router.put('/document', async (req, res) => {
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
  router.post('/index', async (req, res) => {
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
  router.get('/config', (req, res) => {
    try {
      res.json(config.getAll());
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/config/watch-directory', (req, res) => {
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

  // Get collections for a document
  router.get('/documents/collections', (req, res) => {
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

  return router;
};
