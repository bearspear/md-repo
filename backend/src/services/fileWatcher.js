const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const MarkdownProcessor = require('./markdownProcessor');

class FileWatcher {
  constructor(database, watchPath) {
    this.db = database;
    this.watchPath = watchPath;
    this.watcher = null;
    this.processor = new MarkdownProcessor();
  }

  async start() {
    console.log(`📂 Watching for markdown files in: ${this.watchPath}`);

    // Initial scan and index of existing files
    await this.indexExistingFiles();

    // Watch for changes
    this.watcher = chokidar.watch('**/*.md', {
      cwd: this.watchPath,
      ignored: ['**/node_modules/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: true // We already indexed in indexExistingFiles
    });

    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileDeleted(filePath))
      .on('error', (error) => console.error('File watcher error:', error));

    console.log('✓ File watcher started');
  }

  async indexExistingFiles() {
    console.log('🔍 Scanning existing markdown files...');

    const files = await this.findMarkdownFiles(this.watchPath);
    let indexed = 0;

    for (const file of files) {
      try {
        await this.indexFile(file);
        indexed++;
      } catch (error) {
        console.error(`Error indexing ${file}:`, error.message);
      }
    }

    console.log(`✓ Indexed ${indexed} documents`);
  }

  async findMarkdownFiles(dir) {
    const files = [];

    async function scan(directory) {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  async indexFile(filePath) {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Process markdown to extract metadata
    const processed = await this.processor.process(markdownContent, frontmatter);

    // Get relative path from watch directory
    const relativePath = path.relative(this.watchPath, filePath);

    const document = {
      path: relativePath,
      title: processed.title,
      content: processed.plainText,
      rawContent: markdownContent,
      frontmatter: frontmatter,
      tags: processed.tags,
      topics: processed.topics,
      contentType: 'markdown',
      wordCount: processed.wordCount,
      createdAt: stats.birthtimeMs,
      modifiedAt: stats.mtimeMs
    };

    this.db.upsertDocument(document);
    console.log(`📝 Indexed: ${relativePath}`);
  }

  async handleFileAdded(filePath) {
    const fullPath = path.join(this.watchPath, filePath);
    console.log(`➕ File added: ${filePath}`);
    await this.indexFile(fullPath);
  }

  async handleFileChanged(filePath) {
    const fullPath = path.join(this.watchPath, filePath);
    console.log(`✏️  File changed: ${filePath}`);
    await this.indexFile(fullPath);
  }

  handleFileDeleted(filePath) {
    console.log(`🗑️  File deleted: ${filePath}`);
    this.db.deleteDocument(filePath);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('✓ File watcher stopped');
    }
  }
}

module.exports = FileWatcher;
