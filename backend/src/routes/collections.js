const express = require('express');
const router = express.Router();

module.exports = function(dependencies) {
  const { db } = dependencies;

  // Get all collections
  router.get('/', (req, res) => {
    try {
      const collections = db.getAllCollections();
      res.json({ collections });
    } catch (error) {
      console.error('Error fetching collections:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single collection
  router.get('/:id', (req, res) => {
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

  // Create collection
  router.post('/', (req, res) => {
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

  // Update collection
  router.put('/:id', (req, res) => {
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

  // Delete collection
  router.delete('/:id', (req, res) => {
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

  // Get documents in collection
  router.get('/:id/documents', (req, res) => {
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

  // Add document to collection
  router.post('/:id/documents', (req, res) => {
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

  // Remove document from collection
  router.delete('/:id/documents', (req, res) => {
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
  router.post('/:id/documents/bulk', (req, res) => {
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

  return router;
};
