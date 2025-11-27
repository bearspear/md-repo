const express = require('express');
const cors = require('cors');
const DocumentDatabase = require('./database');
const FileWatcher = require('./services/fileWatcher');
const DocumentConverter = require('./services/documentConverter');
const ImageRepository = require('./services/imageRepository');
const ImageLocalizer = require('./utils/image-localizer');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize services
const db = new DocumentDatabase('./data/documents.db');
const watchPath = config.getWatchDirectory();
const fileWatcher = new FileWatcher(db, watchPath);
const documentConverter = new DocumentConverter();
const imageRepository = new ImageRepository();
const imageLocalizer = new ImageLocalizer(imageRepository);

// Shared dependencies for routes
const dependencies = {
  db,
  config,
  fileWatcher,
  documentConverter,
  imageRepository,
  imageLocalizer
};

// Import route modules
const documentRoutes = require('./routes/documents')(dependencies);
const annotationRoutes = require('./routes/annotations')(dependencies);
const collectionRoutes = require('./routes/collections')(dependencies);
const studioRoutes = require('./routes/studio')(dependencies);
const uploadRoutes = require('./routes/uploads')(dependencies);
const imageRoutes = require('./routes/images');

// Mount routes
app.use('/api', documentRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/images', imageRoutes);

// Start server
async function startServer() {
  try {
    await fileWatcher.start();

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

startServer();

module.exports = app;
