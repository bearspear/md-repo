# MD-Repo - Markdown Reader & Editor

A powerful, search-first markdown application built with Angular and Node.js. MD-Repo combines a rich markdown editor with full-text search capabilities, making it perfect for managing and browsing large collections of markdown documents.

## Features

### Core Functionality
- **Full-Text Search** - Lightning-fast search powered by SQLite FTS5 (Full-Text Search)
- **Rich Markdown Editor** - Built-in editor with live preview and comprehensive formatting toolbar
- **Syntax Highlighting** - Beautiful code highlighting powered by highlight.js and Prism.js
- **Collections** - Organize documents into collections for better management
- **File Watching** - Automatic synchronization when markdown files change on disk

### Editor Features
- **Comprehensive Toolbar** - Quick access to all markdown formatting:
  - Text formatting (bold, italic, strikethrough)
  - Headers (H1-H6)
  - Lists (ordered, unordered, task lists)
  - Code blocks and inline code
  - Links and images
  - Blockquotes and horizontal rules
  - Tables
- **Find & Replace** - Full-featured search and replace within documents
  - Case-insensitive search
  - Navigate through matches
  - Replace single or all occurrences
  - Keyboard shortcuts (Enter, Shift+Enter, Escape)
- **Live Preview** - Real-time markdown rendering as you type

### Technical Features
- **Modern Stack** - Angular 17 with Material Design, Node.js backend
- **SQLite Database** - Efficient document storage with FTS5 indexing
- **File Upload** - Drag-and-drop markdown file upload
- **Responsive Design** - Works seamlessly on desktop and mobile
- **E2E Testing** - Comprehensive test coverage with Playwright

## Architecture

```
md-repo/
├── frontend/          # Angular 17 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Reusable UI components
│   │   │   └── services/      # API and state management
│   │   └── assets/
│   └── package.json
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── server.js         # Express server
│   │   ├── database.js       # SQLite + FTS5
│   │   └── config.js         # Configuration
│   └── data/                 # SQLite database
├── e2e/               # Playwright E2E tests
│   └── tests/
├── docs/              # Documentation
└── package.json       # Root scripts
```

## Tech Stack

### Frontend
- **Angular 17** - Modern web framework with standalone components
- **Angular Material** - Material Design UI components
- **ngx-markdown** - Markdown rendering
- **highlight.js** - Syntax highlighting for code blocks
- **Prism.js** - Additional syntax highlighting support
- **RxJS** - Reactive programming

### Backend
- **Node.js** - JavaScript runtime
- **Express 5** - Web application framework
- **better-sqlite3** - Fast SQLite3 with FTS5 support
- **markdown-it** - Markdown parser
- **gray-matter** - YAML frontmatter parser
- **chokidar** - File system watcher
- **natural** - Natural language processing for search
- **multer** - File upload handling

### Testing
- **Playwright** - End-to-end testing framework

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd md-repo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install dependencies for the root project, frontend, and backend.

3. **Start the development servers**

   In separate terminals:

   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on http://localhost:3000

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```
   Frontend will run on http://localhost:4200

### Quick Start with npm Scripts

From the root directory:
```bash
# Install all dependencies
npm install

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm start
```

## Usage

### Creating Documents
1. Click the "New Document" button
2. Enter document content in the editor
3. Use the toolbar for markdown formatting
4. Click "Save" to persist the document

### Uploading Documents
1. Click the "Upload" button
2. Drag and drop markdown files or click to browse
3. Files are automatically parsed and indexed

### Searching
1. Use the search bar at the top
2. Search is powered by FTS5 for instant results
3. Results show matching snippets with highlighting

### Collections
1. Organize documents into collections
2. Filter by collection to focus on specific topics
3. Create custom collections for different projects

### Editor Shortcuts
- **Bold**: Ctrl/Cmd + B or toolbar button
- **Italic**: Ctrl/Cmd + I or toolbar button
- **Find**: Ctrl/Cmd + F
- **Replace**: Ctrl/Cmd + H
- **Next Match**: Enter (in find dialog)
- **Previous Match**: Shift + Enter (in find dialog)
- **Close Find**: Escape

## Development

### Project Structure

**Frontend (Angular 17)**
```
frontend/src/app/
├── app.component.ts          # Main application component
├── app.component.html        # Main template
├── app.component.css         # Global styles
├── components/               # Reusable components
│   ├── document-viewer/
│   ├── markdown-editor/
│   └── search-results/
└── services/
    ├── api.service.ts        # Backend API client
    └── document.service.ts   # Document state management
```

**Backend (Node.js/Express)**
```
backend/src/
├── server.js                 # Express app and routes
├── database.js               # SQLite database with FTS5
└── config.js                 # Server configuration
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```
Build artifacts will be in `frontend/dist/`

**Backend:**
The backend runs directly with Node.js, no build step required.

### Running Tests

**E2E Tests (Playwright):**
```bash
# Run all tests
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests with UI
npm run test:ui

# Run specific test suites
npm run test:search
npm run test:collections
npm run test:highlighting

# View test report
npm run test:report
```

**Unit Tests (Frontend):**
```bash
cd frontend
npm test
```

### Database Schema

The backend uses SQLite with FTS5 for full-text search:

**Documents Table:**
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  title TEXT,
  content TEXT,
  collection TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

**FTS5 Virtual Table:**
```sql
CREATE VIRTUAL TABLE documents_fts USING fts5(
  title,
  content,
  content=documents,
  content_rowid=id
);
```

## API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document by ID
- `POST /api/documents` - Create new document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/upload` - Upload markdown files

### Search
- `GET /api/search?q=query` - Full-text search

### Collections
- `GET /api/collections` - List all collections
- `GET /api/collections/:name/documents` - Get documents in collection

## Configuration

### Backend Configuration
Edit `backend/src/config.js`:
```javascript
module.exports = {
  port: 3000,
  dbPath: './data/documents.db',
  uploadDir: './uploads',
  watchDir: './docs' // Directory to watch for changes
};
```

### Frontend Configuration
Edit `frontend/src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## Performance

- **Search Speed**: FTS5 provides sub-millisecond search on collections of 10,000+ documents
- **File Watching**: Chokidar efficiently monitors filesystem changes
- **Lazy Loading**: Angular components are lazy-loaded for optimal initial load time
- **Database**: SQLite provides excellent read performance for document retrieval

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## License

ISC

## Author

Michael Behringer

## Acknowledgments

- **Angular Team** - For the amazing framework
- **SQLite** - For fast, reliable database
- **highlight.js & Prism.js** - For beautiful syntax highlighting
- **Material Design** - For the UI component library
- **Playwright** - For reliable E2E testing
