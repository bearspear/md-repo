# Changelog - Markdown Reader

## 2025-11-08 - Enhanced Editor Features

### Editor Improvements

#### Extended Markdown Toolbar

**New Markdown Formatting Buttons:**

Added 6 new markdown formatting buttons to the editor toolbar for more comprehensive document editing.

**New Buttons:**
1. **Strikethrough** - Format: `~~text~~`
2. **Blockquote** - Format: `> quote`
3. **Table** - Inserts markdown table template
4. **Image** - Format: `![alt text](url)`
5. **Horizontal Rule** - Inserts `---`
6. **Task List** - Format: `- [ ] task`

**Files Modified:**
- `frontend/src/app/app.component.html` (lines 485-514) - Added new toolbar buttons with visual dividers
- `frontend/src/app/app.component.ts` (lines 1431-1448) - Extended `insertMarkdown()` method with new cases

---

#### Find & Replace Functionality

**Feature:** Full-featured find and replace panel for in-editor text search and replacement.

**Capabilities:**
- Case-insensitive search
- Navigate through matches (Next/Previous)
- Match counter showing current position (e.g., "3 of 12")
- Replace single occurrence
- Replace all occurrences
- Keyboard shortcuts: Enter (next), Shift+Enter (previous), Escape (close)

**Files Modified:**
- `frontend/src/app/app.component.html` (lines 538-573) - Find & replace panel UI
- `frontend/src/app/app.component.ts`:
  - Lines 70, 173-179 - Properties for find/replace state
  - Lines 1473-1609 - Methods: `toggleFindReplace()`, `findNext()`, `findPrevious()`, `replaceNext()`, `replaceAll()`
- `frontend/src/app/app.component.css` (lines 1871-1926) - Find & replace panel styling

**UI Features:**
- Clean, modern panel design
- Auto-focus on find input when opened
- Visual match counter
- Monospace font for find/replace inputs

---

#### Keyboard Shortcuts

**Global Shortcuts:**
- **Ctrl+F / Cmd+F** - Open find panel
- **Ctrl+H / Cmd+H** - Open find & replace panel

**Keyboard Shortcuts Dialog:**

Added comprehensive keyboard shortcuts reference dialog accessible from editor toolbar.

**Shortcuts Documented:**
- **Editor**: Ctrl+B (bold), Ctrl+I (italic), Ctrl+S (save), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- **Find & Replace**: Ctrl+F, Ctrl+H, Enter, Shift+Enter, Escape
- **Document**: Ctrl+P (print), Escape (close)

**Files Modified:**
- `frontend/src/app/app.component.html` (lines 823-892) - Keyboard shortcuts dialog
- `frontend/src/app/app.component.ts`:
  - Line 182 - `showKeyboardShortcutsDialog` property
  - Lines 1458-1471 - `@HostListener` for global keyboard events
  - Lines 1612-1618 - Dialog methods
- `frontend/src/app/app.component.css` (lines 1928-2036) - Keyboard shortcuts dialog styling

**Dialog Features:**
- Modal overlay with backdrop blur
- Organized by category (Editor, Find & Replace, Document)
- Visual keyboard key representation (`<kbd>` styling)
- Responsive layout with scrolling
- Close on backdrop click or close button

---

### Technical Implementation

**Code Statistics:**
- **HTML**: ~130 lines added (toolbar buttons, find/replace panel, shortcuts dialog)
- **TypeScript**: ~170 lines added (properties, methods, keyboard event handling)
- **CSS**: ~170 lines added (find/replace panel + shortcuts dialog styling)

**Key Technical Features:**
- Uses `document.execCommand('insertText')` for all markdown insertions to preserve undo/redo
- Case-insensitive regex-based find with global flag
- Auto-focus management using `ViewChild` and `setTimeout`
- Event propagation control in modal dialogs (`$event.stopPropagation()`)
- Keyboard event filtering to prevent conflicts with input fields

---

## 2025-11-08 - CodeMirror Removal and Editor Simplification

### Editor Changes

#### Removed CodeMirror Integration

**Reason:** Simplified the markdown editor by removing CodeMirror 6 dependency and restoring the original textarea-based implementation.

**Changes Made:**

1. **Removed CodeMirror Packages**
   - Uninstalled 9 @codemirror packages (23 total packages removed)
   - Packages: `@codemirror/view`, `@codemirror/state`, `@codemirror/commands`, `@codemirror/search`, `@codemirror/autocomplete`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/lint`, `codemirror`

2. **Code Cleanup**
   - Removed all CodeMirror imports from `app.component.ts`
   - Removed `editorView` property and related ViewChild references
   - Removed `showLineNumbers` property
   - Removed CodeMirror lifecycle methods: `initializeCodeMirror()`, `toggleLineNumbers()`, `getCodeMirrorExtensions()`
   - Simplified class declaration (removed `AfterViewInit` and `OnDestroy` interfaces)
   - Cleaned up `ngOnDestroy()` method - removed CodeMirror cleanup code
   - Removed line numbers toggle button from editor toolbar

3. **HTML Changes**
   - Replaced CodeMirror container div with simple textarea in `app.component.html` (line 518)
   - Removed line numbers toggle button from toolbar

4. **CSS Cleanup**
   - Removed entire CodeMirror styling section from `app.component.css` (~43 lines)
   - Removed `.codemirror-container` and all related styles

**Benefits:**
- Reduced bundle size (removed ~3KB from main.js)
- Simpler codebase - removed ~150+ lines of CodeMirror-related code
- Faster initial load time
- Native textarea provides excellent undo/redo support via `execCommand('insertText')`
- Maintained all essential editing features (bold, italic, heading, link, code, list formatting)

**Current Editor Features:**
- Simple textarea-based markdown editing
- Formatting toolbar (bold, italic, heading, link, code, list)
- Auto-save with 2-second debouncing
- Manual save/discard controls
- Full undo/redo support (Ctrl+Z / Ctrl+Shift+Z)
- Two-way Angular data binding

---

## 2025-11-08 - Bug Fixes and Print Support

### Bug Fixes

#### Fixed Undo/Redo Functionality in Markdown Editor

**Issue:** Ctrl+Z (undo) and Ctrl+Shift+Z (redo) were not working in the markdown editor when using toolbar buttons (bold, italic, heading, etc.).

**Root Cause:** The `insertMarkdown()` method was directly manipulating `textarea.value`, which bypassed the browser's native undo stack.

**Solution:** Replaced manual value manipulation with `document.execCommand('insertText')`, which properly integrates with the browser's native undo/redo mechanism.

**Files Modified:**
- `frontend/src/app/app.component.ts` (lines 1335-1380)

**Technical Details:**
```typescript
// Old approach (broken undo)
textarea.value = beforeText + newText + afterText;
const event = new Event('input', { bubbles: true });
textarea.dispatchEvent(event);

// New approach (preserves undo stack)
document.execCommand('insertText', false, newText);
```

**Benefits:**
- Full native undo/redo support (Ctrl+Z / Ctrl+Shift+Z)
- Maintains Angular data binding via automatic input events
- Simpler, more reliable code

---

### Infrastructure Changes

#### Backend API Port Migration: 3000 → 3001

**Reason:** Port conflict resolution and standardization.

**Files Modified:**
1. `backend/src/server.js` (line 11)
   - Changed: `const PORT = process.env.PORT || 3001;`

2. `frontend/src/app/services/search.service.ts` (line 57)
   - Changed: `private apiUrl = 'http://localhost:3001/api';`

3. `frontend/src/app/services/annotation.service.ts` (line 21)
   - Changed: `private apiUrl = 'http://localhost:3001/api';`

**Current Configuration:**
- Backend API: `http://localhost:3001`
- Frontend Dev Server: `http://localhost:4201`

---

### New Features

#### Print Stylesheet for Document Printing

**Feature:** Comprehensive print support for markdown documents with professional formatting.

**Files Created:**
- `frontend/src/print.css` (new file, ~400 lines)

**Files Modified:**
- `frontend/angular.json` - Added print.css to styles array

**Print Features:**

1. **Clean Print Layout**
   - Hides all UI elements (toolbar, buttons, sidebars, filters, etc.)
   - Full-width document content
   - Professional A4 page setup with 2cm margins
   - Black text on white background

2. **Typography Optimization**
   - Base font: 12pt with 1.6 line height
   - Heading hierarchy: h1 (18pt) → h6 (12pt)
   - Proper orphans and widows control
   - Page-break avoidance for headings

3. **Code & Technical Content**
   - Code blocks with light gray background (#f5f5f5)
   - Border styling for code elements
   - Monospace font (Courier New)
   - Word-wrap for long code lines
   - Page-break avoidance for code blocks

4. **Lists & Blockquotes**
   - Proper indentation and spacing
   - Blockquotes with left border accent
   - Light gray background for blockquotes

5. **Tables**
   - Full border styling
   - Header row with gray background
   - Page-break avoidance
   - Table header repetition on new pages

6. **Images**
   - Max-width: 100%
   - Page-break avoidance
   - Automatic sizing

7. **Links**
   - Shows URL after external links in parentheses
   - Excludes anchor links from URL display
   - Example: `Visit our site (https://example.com)`

8. **Metadata & Headers**
   - Document title and metadata at top
   - Document path in header (9pt gray)
   - Optional page numbers via @page directive

9. **Special Elements**
   - Tags/chips shown with minimal border styling
   - Annotations rendered with subtle underline
   - Horizontal rules as solid lines
   - Task list checkboxes preserved

**Usage:**
Users can print documents using **Ctrl+P** (Windows/Linux) or **Cmd+P** (Mac). The print preview will show a clean, professional document layout suitable for printing or PDF export.

**CSS Features Used:**
- `@media print` queries
- `@page` rules for margins and page setup
- `page-break-inside`, `page-break-after`, `page-break-before` properties
- `orphans` and `widows` for paragraph flow control
- `-webkit-print-color-adjust: exact` for color preservation

---

### Previously Completed Features

#### Export Functionality ✓
- Export search results as JSON/CSV
- Export annotations as JSON/CSV
- Export full documents
- Download functionality with proper MIME types

#### Enhanced Search ✓
- Date range filtering with Material datepickers
- Content type filtering
- Tags and topics filtering
- Saved searches with localStorage persistence
- Active filters indicator
- Clear all filters functionality
- Advanced search syntax support

#### Document Editing ✓
- Inline markdown editing
- Auto-save with 2-second debouncing
- Manual save/discard controls
- Markdown formatting toolbar
- Save status indicators
- 50MB payload support for large documents
- File system integration with backend

---

## Server Status

**Current Running Services:**
- Backend API: `http://localhost:3001`
  - 4 documents indexed
  - SQLite database active
  - File watcher running

- Frontend: `http://localhost:4201`
  - Angular dev server
  - Hot reload enabled

---

## Next Steps / Future Enhancements

1. **Advanced Organization** - Final feature from original roadmap
   - Folders/collections
   - Custom categorization
   - Bulk operations

2. **Print Enhancements** (potential)
   - Print button in document toolbar
   - Print settings dialog
   - Custom page headers/footers
   - Table of contents generation

3. **Editor Improvements** (potential)
   - Live markdown preview
   - Split-screen editing
   - Syntax highlighting for code blocks
   - Keyboard shortcuts reference

---

## Technical Notes

### Browser Compatibility
- Print styles tested for modern browsers (Chrome, Firefox, Safari, Edge)
- `execCommand` is deprecated but still widely supported for text insertion
- Material Design components properly hidden in print mode

### Performance
- Auto-save debouncing prevents excessive API calls
- Print CSS only loads for print media
- No performance impact on screen rendering

### Dependencies
- Angular 17+
- Material Design components
- ngx-markdown for rendering
- RxJS for observables
- Express.js backend with SQLite

---

## Contributors

- Development: AI Assistant (Claude)
- Testing & Feedback: User (mbehringer)

---

*Document generated: 2025-11-08*
