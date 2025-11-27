const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

module.exports = function(dependencies) {
  const { config, fileWatcher } = dependencies;

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = config.getUploadDirectory();
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
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

  // Single file upload
  router.post('/', upload.single('file'), async (req, res) => {
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

  // Multiple file upload
  router.post('/multiple', upload.array('files', 10), async (req, res) => {
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

  return router;
};
