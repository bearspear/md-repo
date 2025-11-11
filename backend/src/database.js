const Database = require('better-sqlite3');
const path = require('path');

class DocumentDatabase {
  constructor(dbPath = './data/documents.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
  }

  initializeTables() {
    // Create documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        path TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        frontmatter TEXT,
        tags TEXT,
        topics TEXT,
        content_type TEXT,
        word_count INTEGER,
        created_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL,
        indexed_at INTEGER NOT NULL
      );
    `);

    // Create annotations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        document_path TEXT NOT NULL,
        selected_text TEXT NOT NULL,
        note TEXT,
        color TEXT DEFAULT 'yellow',
        start_offset INTEGER NOT NULL,
        end_offset INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (document_path) REFERENCES documents(path) ON DELETE CASCADE
      );
    `);

    // Create index for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_document
      ON annotations(document_path);
    `);

    // Create collections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#3b82f6',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create document_collections junction table (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_collections (
        document_path TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (document_path, collection_id),
        FOREIGN KEY (document_path) REFERENCES documents(path) ON DELETE CASCADE,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );
    `);

    // Create indices for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_doc_collections_document
      ON document_collections(document_path);

      CREATE INDEX IF NOT EXISTS idx_doc_collections_collection
      ON document_collections(collection_id);
    `);

    // Create FTS5 full-text search index
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        path UNINDEXED,
        title,
        content,
        tags,
        topics,
        content='documents',
        content_rowid='rowid'
      );
    `);

    // Create triggers to keep FTS5 in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
        INSERT INTO documents_fts(rowid, path, title, content, tags, topics)
        VALUES (new.rowid, new.path, new.title, new.content, new.tags, new.topics);
      END;

      CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
        DELETE FROM documents_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
        UPDATE documents_fts
        SET path = new.path,
            title = new.title,
            content = new.content,
            tags = new.tags,
            topics = new.topics
        WHERE rowid = new.rowid;
      END;
    `);

    console.log('✓ Database tables initialized');
  }

  // Insert or update document
  upsertDocument(doc) {
    const stmt = this.db.prepare(`
      INSERT INTO documents (
        path, title, content, raw_content, frontmatter, tags, topics,
        content_type, word_count, created_at, modified_at, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        raw_content = excluded.raw_content,
        frontmatter = excluded.frontmatter,
        tags = excluded.tags,
        topics = excluded.topics,
        content_type = excluded.content_type,
        word_count = excluded.word_count,
        modified_at = excluded.modified_at,
        indexed_at = excluded.indexed_at
    `);

    return stmt.run(
      doc.path,
      doc.title,
      doc.content,
      doc.rawContent,
      doc.frontmatter ? JSON.stringify(doc.frontmatter) : null,
      doc.tags ? JSON.stringify(doc.tags) : null,
      doc.topics ? JSON.stringify(doc.topics) : null,
      doc.contentType || 'markdown',
      doc.wordCount || 0,
      doc.createdAt || Date.now(),
      doc.modifiedAt || Date.now(),
      Date.now()
    );
  }

  // Parse and enhance search query for FTS5
  parseSearchQuery(query) {
    // FTS5 already supports:
    // - Boolean: AND, OR, NOT
    // - Phrase: "exact phrase"
    // - Prefix: word*
    // - Column: title:keyword

    // Convert user-friendly syntax to FTS5 syntax
    let ftsQuery = query;

    // Handle quoted phrases (already supported, just preserve them)
    // Handle AND/OR/NOT (case insensitive, convert to uppercase for FTS5)
    ftsQuery = ftsQuery.replace(/\bAND\b/gi, 'AND');
    ftsQuery = ftsQuery.replace(/\bOR\b/gi, 'OR');
    ftsQuery = ftsQuery.replace(/\bNOT\b/gi, 'NOT');

    // Support -word syntax for NOT word
    ftsQuery = ftsQuery.replace(/\s-(\w+)/g, ' NOT $1');

    // Support +word syntax for required word (AND)
    ftsQuery = ftsQuery.replace(/\s\+(\w+)/g, ' AND $1');

    return ftsQuery;
  }

  // Search documents using FTS5 with advanced features
  search(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      tags = [],
      topics = [],
      contentType = null,
      dateFrom = null,
      dateTo = null
    } = options;

    // Parse and enhance query
    const ftsQuery = this.parseSearchQuery(query);

    let sql = `
      SELECT
        d.path,
        d.title,
        d.tags,
        d.topics,
        d.content_type,
        d.word_count,
        d.modified_at,
        snippet(documents_fts, 2, '<mark>', '</mark>', '...', 30) as snippet,
        bm25(documents_fts) as score
      FROM documents_fts
      JOIN documents d ON d.rowid = documents_fts.rowid
      WHERE documents_fts MATCH ?
    `;

    const params = [ftsQuery];

    // Add filters
    if (tags.length > 0) {
      const tagConditions = tags.map(() => `d.tags LIKE ?`).join(' AND ');
      sql += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (topics.length > 0) {
      const topicConditions = topics.map(() => `d.topics LIKE ?`).join(' AND ');
      sql += ` AND (${topicConditions})`;
      topics.forEach(topic => params.push(`%"${topic}"%`));
    }

    if (contentType) {
      sql += ` AND d.content_type = ?`;
      params.push(contentType);
    }

    // Date range filtering
    if (dateFrom) {
      sql += ` AND d.modified_at >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND d.modified_at <= ?`;
      params.push(dateTo);
    }

    sql += ` ORDER BY score LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params);

    return results.map(row => ({
      path: row.path,
      title: row.title,
      tags: row.tags ? JSON.parse(row.tags) : [],
      topics: row.topics ? JSON.parse(row.topics) : [],
      contentType: row.content_type,
      wordCount: row.word_count,
      modifiedAt: row.modified_at,
      snippet: row.snippet,
      score: row.score
    }));
  }

  // Get document by path
  getDocument(filePath) {
    const stmt = this.db.prepare(`
      SELECT * FROM documents WHERE path = ?
    `);
    const doc = stmt.get(filePath);

    if (doc) {
      return {
        path: doc.path,
        title: doc.title,
        content: doc.content,
        rawContent: doc.raw_content,
        frontmatter: doc.frontmatter ? JSON.parse(doc.frontmatter) : null,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
        topics: doc.topics ? JSON.parse(doc.topics) : [],
        contentType: doc.content_type,
        wordCount: doc.word_count,
        createdAt: doc.created_at,
        modifiedAt: doc.modified_at,
        indexedAt: doc.indexed_at
      };
    }
    return null;
  }

  // Delete document
  deleteDocument(filePath) {
    const stmt = this.db.prepare('DELETE FROM documents WHERE path = ?');
    return stmt.run(filePath);
  }

  // Get all documents
  getAllDocuments(limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT path, title, tags, topics, content_type, word_count, modified_at
      FROM documents
      ORDER BY modified_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset).map(row => ({
      path: row.path,
      title: row.title,
      tags: row.tags ? JSON.parse(row.tags) : [],
      topics: row.topics ? JSON.parse(row.topics) : [],
      contentType: row.content_type,
      wordCount: row.word_count,
      modifiedAt: row.modified_at
    }));
  }

  // Get statistics
  getStats() {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM documents');
    const totalWords = this.db.prepare('SELECT SUM(word_count) as total FROM documents');

    return {
      totalDocuments: countStmt.get().count,
      totalWords: totalWords.get().total || 0
    };
  }

  // Get all unique tags with counts
  getAllTags() {
    const stmt = this.db.prepare('SELECT tags FROM documents WHERE tags IS NOT NULL');
    const allTags = {};

    stmt.all().forEach(row => {
      const tags = JSON.parse(row.tags);
      tags.forEach(tag => {
        allTags[tag] = (allTags[tag] || 0) + 1;
      });
    });

    return Object.entries(allTags)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Get all unique topics with counts
  getAllTopics() {
    const stmt = this.db.prepare('SELECT topics FROM documents WHERE topics IS NOT NULL');
    const allTopics = {};

    stmt.all().forEach(row => {
      const topics = JSON.parse(row.topics);
      topics.forEach(topic => {
        allTopics[topic] = (allTopics[topic] || 0) + 1;
      });
    });

    return Object.entries(allTopics)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Annotation methods
  createAnnotation(annotation) {
    const stmt = this.db.prepare(`
      INSERT INTO annotations (
        id, document_path, selected_text, note, color,
        start_offset, end_offset, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      annotation.id,
      annotation.documentPath,
      annotation.selectedText,
      annotation.note || null,
      annotation.color || 'yellow',
      annotation.startOffset,
      annotation.endOffset,
      Date.now(),
      Date.now()
    );
  }

  getAnnotations(documentPath) {
    const stmt = this.db.prepare(`
      SELECT * FROM annotations
      WHERE document_path = ?
      ORDER BY start_offset ASC
    `);

    return stmt.all(documentPath).map(row => ({
      id: row.id,
      documentPath: row.document_path,
      selectedText: row.selected_text,
      note: row.note,
      color: row.color,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getAnnotation(id) {
    const stmt = this.db.prepare('SELECT * FROM annotations WHERE id = ?');
    const row = stmt.get(id);

    if (row) {
      return {
        id: row.id,
        documentPath: row.document_path,
        selectedText: row.selected_text,
        note: row.note,
        color: row.color,
        startOffset: row.start_offset,
        endOffset: row.end_offset,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    return null;
  }

  updateAnnotation(id, updates) {
    const stmt = this.db.prepare(`
      UPDATE annotations
      SET note = COALESCE(?, note),
          color = COALESCE(?, color),
          updated_at = ?
      WHERE id = ?
    `);

    return stmt.run(updates.note, updates.color, Date.now(), id);
  }

  deleteAnnotation(id) {
    const stmt = this.db.prepare('DELETE FROM annotations WHERE id = ?');
    return stmt.run(id);
  }

  // Collection methods
  createCollection(collection) {
    const stmt = this.db.prepare(`
      INSERT INTO collections (id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      collection.id,
      collection.name,
      collection.description || null,
      collection.color || '#3b82f6',
      Date.now(),
      Date.now()
    );
  }

  getAllCollections() {
    const stmt = this.db.prepare(`
      SELECT
        c.*,
        COUNT(dc.document_path) as document_count
      FROM collections c
      LEFT JOIN document_collections dc ON c.id = dc.collection_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return stmt.all().map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      documentCount: row.document_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getCollection(id) {
    const stmt = this.db.prepare(`
      SELECT
        c.*,
        COUNT(dc.document_path) as document_count
      FROM collections c
      LEFT JOIN document_collections dc ON c.id = dc.collection_id
      WHERE c.id = ?
      GROUP BY c.id
    `);

    const row = stmt.get(id);
    if (row) {
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        documentCount: row.document_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    return null;
  }

  updateCollection(id, updates) {
    const stmt = this.db.prepare(`
      UPDATE collections
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          updated_at = ?
      WHERE id = ?
    `);

    return stmt.run(updates.name, updates.description, updates.color, Date.now(), id);
  }

  deleteCollection(id) {
    const stmt = this.db.prepare('DELETE FROM collections WHERE id = ?');
    return stmt.run(id);
  }

  // Document-Collection association methods
  addDocumentToCollection(documentPath, collectionId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO document_collections (document_path, collection_id, added_at)
      VALUES (?, ?, ?)
    `);

    return stmt.run(documentPath, collectionId, Date.now());
  }

  removeDocumentFromCollection(documentPath, collectionId) {
    const stmt = this.db.prepare(`
      DELETE FROM document_collections
      WHERE document_path = ? AND collection_id = ?
    `);

    return stmt.run(documentPath, collectionId);
  }

  getDocumentCollections(documentPath) {
    const stmt = this.db.prepare(`
      SELECT c.*
      FROM collections c
      JOIN document_collections dc ON c.id = dc.collection_id
      WHERE dc.document_path = ?
      ORDER BY c.name ASC
    `);

    return stmt.all(documentPath).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getCollectionDocuments(collectionId, limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT d.path, d.title, d.tags, d.topics, d.content_type, d.word_count, d.modified_at
      FROM documents d
      JOIN document_collections dc ON d.path = dc.document_path
      WHERE dc.collection_id = ?
      ORDER BY d.modified_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(collectionId, limit, offset).map(row => ({
      path: row.path,
      title: row.title,
      tags: row.tags ? JSON.parse(row.tags) : [],
      topics: row.topics ? JSON.parse(row.topics) : [],
      contentType: row.content_type,
      wordCount: row.word_count,
      modifiedAt: row.modified_at
    }));
  }

  // Bulk operations
  addDocumentsToCollection(documentPaths, collectionId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO document_collections (document_path, collection_id, added_at)
      VALUES (?, ?, ?)
    `);

    const addedAt = Date.now();
    const transaction = this.db.transaction((paths) => {
      for (const path of paths) {
        stmt.run(path, collectionId, addedAt);
      }
    });

    transaction(documentPaths);
    return { added: documentPaths.length };
  }

  removeDocumentsFromCollection(documentPaths, collectionId) {
    const stmt = this.db.prepare(`
      DELETE FROM document_collections
      WHERE document_path = ? AND collection_id = ?
    `);

    const transaction = this.db.transaction((paths) => {
      for (const path of paths) {
        stmt.run(path, collectionId);
      }
    });

    transaction(documentPaths);
    return { removed: documentPaths.length };
  }

  close() {
    this.db.close();
  }
}

module.exports = DocumentDatabase;
