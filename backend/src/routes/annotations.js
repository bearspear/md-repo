const express = require('express');
const router = express.Router();

module.exports = function(dependencies) {
  const { db } = dependencies;

  // Get annotations for a document
  router.get('/', (req, res) => {
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

  // Create annotation
  router.post('/', (req, res) => {
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

  // Update annotation
  router.put('/:id', (req, res) => {
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

  // Delete annotation
  router.delete('/:id', (req, res) => {
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

  return router;
};
