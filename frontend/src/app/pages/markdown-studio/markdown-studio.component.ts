import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, AfterViewChecked, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { StudioDocumentService } from '../../services/studio-document.service';
import { SearchEngineService } from '../../services/search-engine.service';
import { ImportDocumentDialogComponent } from '../../components/import-document-dialog/import-document-dialog.component';
import { ExportDocumentDialogComponent } from '../../components/export-document-dialog/export-document-dialog.component';
import { ImageRepositoryService, ImageMetadata } from '../../services/image-repository.service';
import { ImageGalleryComponent } from '../../components/image-gallery/image-gallery.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { DocumentEngineService, DocumentTheme } from '../../services/document-engine.service';
import { EpubExportService, EpubMetadata, EpubOptions } from '../../services/epub-export.service';
import { ThemeEditorComponent } from '../../components/theme-editor/theme-editor.component';
import { PluginService, Plugin, PluginToolbarButton, PluginCommand, PluginExporter, wordFrequencyPlugin, readingLevelPlugin, cloudSyncPlugin } from '../../services/plugin.service';
import mermaid from 'mermaid';
import { Chart, registerables } from 'chart.js';
import matter from 'gray-matter';

interface TocItem {
  level: number;
  text: string;
  id: string;
  collapsed?: boolean;
  hasChildren?: boolean;
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  description?: string;
  [key: string]: any; // Allow custom fields
}

interface Command {
  name: string;
  description: string;
  icon: string;
  action: () => void;
  shortcut?: string;
}

interface DocumentTemplate {
  name: string;
  description: string;
  icon: string;
  category: string;
  content: string;
}

interface DocumentVersion {
  id: string;
  timestamp: Date;
  content: string;
  title: string;
  wordCount: number;
  charCount: number;
}

@Component({
  selector: 'app-markdown-studio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatSlideToggleModule,
    MarkdownModule,
    ImageGalleryComponent,
    MarkdownEditorComponent,
    ThemeEditorComponent
  ],
  templateUrl: './markdown-studio.component.html',
  styleUrls: ['./markdown-studio.component.css']
})
export class MarkdownStudioComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Document ID
  documentId: string;

  // Editor content
  markdownContent: string = '# Welcome to Markdown Studio\n\nStart writing your markdown here...';

  // Preview content (rendered)
  previewContent: string = '';

  // Table of Contents
  tocItems: TocItem[] = [];
  tocDepthFilter: number = 6; // Show all levels by default (1-6)

  // UI State
  showSidebar: boolean = true;
  showPreview: boolean = true;
  showGallery: boolean = false;
  isFullscreen: boolean = false;
  isDraggingOver: boolean = false;
  syncScroll: boolean = false; // Toggle for synchronized scrolling
  distractionFree: boolean = false; // Distraction-free mode
  showCommandPalette: boolean = false; // Command palette visibility
  typewriterMode: boolean = false; // Typewriter mode (centered active line)

  // Document state
  documentTitle: string = 'Untitled Document';
  lastSaved: Date | null = null;
  hasUnsavedChanges: boolean = false;

  // Document metadata
  metadata: DocumentMetadata = {};
  showMetadataEditor: boolean = false;

  // Document statistics
  wordCount: number = 0;
  charCount: number = 0;
  readingTime: number = 0; // in minutes

  // Command palette
  commandSearch: string = '';
  selectedCommandIndex: number = 0;
  commands: Command[] = [];
  filteredCommands: Command[] = [];

  // Templates
  templates: DocumentTemplate[] = [];
  showTemplateDialog: boolean = false;

  // Auto-save and Version History
  versions: DocumentVersion[] = [];
  showVersionHistory: boolean = false;
  autoSaveEnabled: boolean = true;
  private autoSaveInterval?: any;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private readonly MAX_VERSIONS = 50; // Keep last 50 versions
  private readonly STORAGE_KEY = 'markdown-studio-autosave';

  // Theme system
  selectedTheme: string = 'default';
  themes: DocumentTheme[] = [];
  previewThemeCSS: string = '';

  // Undo/Redo history
  private undoHistory: string[] = [];
  private redoHistory: string[] = [];
  private maxHistorySize: number = 50;

  // Subjects for reactive updates
  private contentChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();
  private undoDebounceTimer?: any;

  // ViewChild for preview container scrolling
  @ViewChild('previewContainer') previewContainer?: ElementRef;

  // ViewChild for markdown editor textarea
  @ViewChild('markdownEditor') markdownEditor?: ElementRef<HTMLTextAreaElement>;

  // ViewChildren for resize functionality
  @ViewChild('sidebar') sidebar?: ElementRef<HTMLElement>;
  @ViewChild('editorPane') editorPane?: ElementRef<HTMLElement>;

  private themeStyleElement?: HTMLStyleElement;
  private themeApplied: boolean = false;

  // EPUB export options
  showEpubDialog: boolean = false;
  epubOptions: EpubOptions = {
    splitByHeading: 'h1',
    includeTableOfContents: true,
    includeCoverPage: true,
    fontSize: 'medium',
    fontFamily: 'georgia',
    theme: 'light',
    lineHeight: 'normal',
    textAlign: 'justify'
  };

  // Theme editor
  showThemeEditor: boolean = false;

  // Find and Replace
  showFindReplace: boolean = false;
  findText: string = '';
  replaceText: string = '';
  findCaseSensitive: boolean = false;
  findWholeWord: boolean = false;
  findResults: number[] = [];
  currentFindIndex: number = -1;

  // Word count goals
  wordCountGoal: number = 0;
  showWordGoalDialog: boolean = false;
  tempWordGoal: number = 0;

  // Split view mode
  splitMode: 'horizontal' | 'vertical' = 'horizontal';

  // Plugin system
  showPluginManager: boolean = false;
  plugins: Plugin[] = [];
  pluginToolbarButtons: PluginToolbarButton[] = [];
  pluginCommands: PluginCommand[] = [];
  pluginExporters: PluginExporter[] = [];

  constructor(
    private studioDocumentService: StudioDocumentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private imageRepositoryService: ImageRepositoryService,
    private route: ActivatedRoute,
    private searchService: SearchEngineService,
    private documentEngine: DocumentEngineService,
    private renderer: Renderer2,
    private epubExportService: EpubExportService,
    private http: HttpClient,
    private pluginService: PluginService
  ) {
    // Generate new document ID
    this.documentId = this.studioDocumentService.generateDocumentId();

    // Load themes
    this.themes = this.documentEngine.getAllThemes();

    // Load saved theme preference
    const savedTheme = sessionStorage.getItem('preview-theme');
    if (savedTheme) {
      this.selectedTheme = savedTheme;
    }
  }

  ngOnInit() {
    // Register Chart.js components
    Chart.register(...registerables);

    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });

    // Apply initial theme to preview
    this.applyPreviewTheme();

    // Initialize commands for command palette
    this.initializeCommands();

    // Initialize templates
    this.initializeTemplates();

    // Load word count goal from localStorage
    const savedGoal = localStorage.getItem('word-count-goal');
    if (savedGoal) {
      this.wordCountGoal = parseInt(savedGoal, 10) || 0;
    }

    // Load split mode from localStorage
    const savedSplitMode = localStorage.getItem('split-mode');
    if (savedSplitMode === 'vertical' || savedSplitMode === 'horizontal') {
      this.splitMode = savedSplitMode;
    }

    // Initialize plugins
    this.initializePlugins();

    // Load auto-saved draft if available
    this.loadAutoSavedDraft();

    // Start auto-save
    this.startAutoSave();

    // Set up debounced preview updates
    this.contentChange$
      .pipe(
        debounceTime(500), // Wait 500ms after user stops typing
        takeUntil(this.destroy$)
      )
      .subscribe(content => {
        this.updatePreview(content);
      });

    // Set up auto-save (2 second debounce)
    this.autoSave$
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.hasUnsavedChanges) {
          this.saveDocument();
        }
      });

    // Check for document path in query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentPath = params['path'];
      if (documentPath) {
        this.loadDocumentFromPath(documentPath);
      } else {
        // Initial preview with default content
        this.updatePreview(this.markdownContent);
      }
    });
  }

  /**
   * Load a document from the repository into the editor
   */
  private loadDocumentFromPath(path: string): void {
    this.searchService.getDocument(path).subscribe({
      next: (doc) => {
        this.markdownContent = doc.rawContent;
        this.documentTitle = doc.title;
        this.hasUnsavedChanges = false;
        this.updatePreview(this.markdownContent);
      },
      error: (error) => {
        console.error('Error loading document:', error);
        // Fall back to default content
        this.updatePreview(this.markdownContent);
      }
    });
  }

  /**
   * Render Mermaid diagrams after view updates
   */
  ngAfterViewChecked() {
    // Apply initial theme when preview container becomes available
    if (this.previewContainer && !this.themeApplied) {
      this.applyPreviewTheme();
      this.themeApplied = true;
    }

    if (this.previewContainer) {
      const mermaidElements = this.previewContainer.nativeElement.querySelectorAll('.mermaid:not([data-processed])');

      if (mermaidElements.length > 0) {
        mermaidElements.forEach((element: Element, index: number) => {
          const id = `mermaid-${Date.now()}-${index}`;
          const code = element.textContent || '';

          // Mark as processing to avoid re-renders
          element.setAttribute('data-processed', 'true');

          try {
            mermaid.render(id, code).then((result) => {
              const container = document.createElement('div');
              container.innerHTML = result.svg;
              container.classList.add('mermaid-diagram');
              element.parentNode?.replaceChild(container, element);
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
              element.setAttribute('data-processed', 'error');
            });
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            element.setAttribute('data-processed', 'error');
          }
        });
      }

      // Render Chart.js charts
      const chartCanvases = this.previewContainer.nativeElement.querySelectorAll('.chart-canvas:not([data-chart-rendered])');

      if (chartCanvases.length > 0) {
        chartCanvases.forEach((canvas: any) => {
          try {
            const config = JSON.parse(canvas.getAttribute('data-chart-config') || '{}');
            canvas.setAttribute('data-chart-rendered', 'true');

            new Chart(canvas, {
              type: config.type || 'line',
              data: config.data || { datasets: [] },
              options: config.options || {}
            });
          } catch (error) {
            console.error('[CHART] Error rendering chart:', error);
            canvas.setAttribute('data-chart-rendered', 'error');
          }
        });
      }

      // Attach click handlers to copy buttons
      const copyButtons = this.previewContainer.nativeElement.querySelectorAll('.code-copy-btn:not([data-handler-attached])');

      if (copyButtons.length > 0) {
        copyButtons.forEach((button: HTMLElement) => {
          button.setAttribute('data-handler-attached', 'true');
          button.addEventListener('click', () => {
            const codeBlock = button.closest('.code-block-wrapper');
            if (codeBlock) {
              const lines = codeBlock.querySelectorAll('.line-content');
              const code = Array.from(lines).map((line: any) => line.textContent).join('\n');

              navigator.clipboard.writeText(code).then(() => {
                button.textContent = '✓';
                setTimeout(() => {
                  button.textContent = '📋';
                }, 2000);
              }).catch(err => {
                console.error('Failed to copy code:', err);
              });
            }
          });
        });
      }

      // Add IDs to headings for TOC navigation
      const headings = this.previewContainer.nativeElement.querySelectorAll('h1:not([id]), h2:not([id]), h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id])');

      if (headings.length > 0) {
        headings.forEach((heading: HTMLElement) => {
          const text = heading.textContent || '';
          const id = this.generateTocId(text);
          heading.setAttribute('id', id);
        });
      }
    }
  }

  // Track if waiting for second key in Cmd+K sequence
  private waitingForSecondKey: boolean = false;
  private secondKeyTimer: any;

  /**
   * Keyboard shortcuts handler
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    // If waiting for second key in Cmd+K sequence
    if (this.waitingForSecondKey) {
      this.handleSecondKey(event);
      return;
    }

    // Ctrl+S or Cmd+S for save
    if (modKey && event.key === 's') {
      event.preventDefault();
      this.saveDocument();
    }

    // Ctrl+E or Cmd+E for export
    if (modKey && event.key === 'e') {
      event.preventDefault();
      this.exportDocument();
    }

    // Ctrl+N or Cmd+N for new document
    if (modKey && event.key === 'n') {
      event.preventDefault();
      this.newDocument();
    }

    // Ctrl+F or Cmd+F for find
    if (modKey && event.key === 'f') {
      event.preventDefault();
      if (!this.showFindReplace) {
        this.toggleFindReplace();
      }
    }

    // Ctrl+H or Cmd+H for find and replace
    if (modKey && event.key === 'h') {
      event.preventDefault();
      this.toggleFindReplace();
    }

    // Ctrl+/ or Cmd+/ for toggle sidebar
    if (modKey && event.key === '/') {
      event.preventDefault();
      this.toggleSidebar();
    }

    // Ctrl+\ or Cmd+\ for toggle preview
    if (modKey && event.key === '\\') {
      event.preventDefault();
      this.togglePreview();
    }

    // F11 for fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }

    // Ctrl+Z or Cmd+Z for undo
    if (modKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.performUndo();
    }

    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
    if (modKey && event.shiftKey && event.key === 'z') {
      event.preventDefault();
      this.performRedo();
    }

    // Ctrl+Y or Cmd+Y for redo (Windows style)
    if (modKey && event.key === 'y') {
      event.preventDefault();
      this.performRedo();
    }

    // Ctrl+K or Cmd+K - Start command sequence
    if (modKey && event.key === 'k') {
      event.preventDefault();
      this.startCommandSequence();
    }

    // Ctrl+Shift+D or Cmd+Shift+D for distraction-free mode
    if (modKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      this.toggleDistractionFree();
    }

    // Ctrl+Shift+T or Cmd+Shift+T for typewriter mode
    if (modKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      this.toggleTypewriterMode();
    }

    // Ctrl+Shift+P or Cmd+Shift+P for command palette
    if (modKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      this.toggleCommandPalette();
    }
  }

  /**
   * Start Cmd+K command sequence
   */
  private startCommandSequence() {
    this.waitingForSecondKey = true;
    console.log('Waiting for second key... (Cmd+K pressed)');

    // Clear any existing timer
    if (this.secondKeyTimer) {
      clearTimeout(this.secondKeyTimer);
    }

    // Reset after 2 seconds if no second key
    this.secondKeyTimer = setTimeout(() => {
      this.waitingForSecondKey = false;
      console.log('Command sequence timed out');
    }, 2000);
  }

  /**
   * Handle second key in Cmd+K sequence
   */
  private handleSecondKey(event: KeyboardEvent) {
    event.preventDefault();
    this.waitingForSecondKey = false;

    if (this.secondKeyTimer) {
      clearTimeout(this.secondKeyTimer);
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case 'l':
        // Cmd+K, L for insert link
        this.insertMarkdown('link');
        break;
      case 'i':
        // Cmd+K, I for insert image
        this.insertMarkdown('image');
        break;
      case 'c':
        // Cmd+K, C for insert code block
        this.insertMarkdown('code-block');
        break;
      case 't':
        // Cmd+K, T for insert table
        this.insertMarkdown('table');
        break;
      case 'm':
        // Cmd+K, M for insert math equation
        this.insertMathEquation();
        break;
      case 's':
        // Cmd+K, S for toggle sidebar
        this.toggleSidebar();
        break;
      case 'p':
        // Cmd+K, P for toggle preview
        this.togglePreview();
        break;
      default:
        console.log(`Unknown command sequence: Cmd+K, ${key}`);
    }
  }

  /**
   * Insert math equation
   */
  private insertMathEquation() {
    // Insert inline math by default, user can change to block math
    const mathText = '$$\n\\text{equation here}\n$$';
    this.markdownContent += '\n\n' + mathText + '\n\n';
    this.onContentChange();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // Stop auto-save
    this.stopAutoSave();

    // Save one last time before leaving
    if (this.autoSaveEnabled && this.hasUnsavedChanges) {
      this.performAutoSave();
    }
  }

  /**
   * Called when editor content changes
   */
  onContentChange() {
    // Mark as unsaved immediately
    this.hasUnsavedChanges = true;

    // Emit content changes (these are already debounced in ngOnInit)
    this.contentChange$.next(this.markdownContent);
    this.autoSave$.next();

    // Trigger plugin content change hooks
    this.triggerPluginContentChange();

    // Debounce undo history updates to reduce overhead
    if (this.undoDebounceTimer) {
      clearTimeout(this.undoDebounceTimer);
    }
    this.undoDebounceTimer = setTimeout(() => {
      if (this.undoHistory.length === 0 || this.undoHistory[this.undoHistory.length - 1] !== this.markdownContent) {
        this.undoHistory.push(this.markdownContent);

        // Limit history size
        if (this.undoHistory.length > this.maxHistorySize) {
          this.undoHistory.shift();
        }

        // Clear redo history on new change
        this.redoHistory = [];
      }
    }, 300); // 300ms debounce for undo history
  }

  /**
   * Update preview pane and TOC
   */
  private updatePreview(content: string) {
    try {
      // Parse frontmatter
      const parsed = matter(content);
      this.metadata = parsed.data as DocumentMetadata;

      // Use content without frontmatter for preview
      // If parsing fails or content is empty, use original content
      this.previewContent = parsed.content || content;

      // Extract TOC from content (without frontmatter)
      this.extractToc(parsed.content || content);

      // Calculate statistics
      this.calculateStatistics(parsed.content || content);
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      // Fallback to original content if parsing fails
      this.previewContent = content;
      this.extractToc(content);
      this.calculateStatistics(content);
      this.metadata = {};
    }
  }

  /**
   * Calculate document statistics
   */
  private calculateStatistics(content: string) {
    // Remove markdown syntax for accurate word count
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/\*\*|__/g, '') // Remove bold markers
      .replace(/\*|_/g, '') // Remove italic markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with text only
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
      .replace(/[^\w\s]/g, ' ') // Remove remaining special chars
      .trim();

    // Word count
    this.wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;

    // Character count (including spaces)
    this.charCount = content.length;

    // Reading time (average 200 words per minute)
    this.readingTime = Math.ceil(this.wordCount / 200);
  }

  /**
   * Toggle metadata editor visibility
   */
  toggleMetadataEditor() {
    this.showMetadataEditor = !this.showMetadataEditor;
  }

  /**
   * Update metadata in markdown content
   */
  updateMetadataInContent() {
    try {
      // Stringify metadata back to YAML frontmatter
      const parsed = matter(this.markdownContent);
      const contentWithoutFrontmatter = parsed.content;

      // If metadata is empty, just use content without frontmatter
      if (Object.keys(this.metadata).length === 0) {
        this.markdownContent = contentWithoutFrontmatter;
      } else {
        // Add frontmatter back to content
        this.markdownContent = matter.stringify(contentWithoutFrontmatter, this.metadata);
      }

      this.hasUnsavedChanges = true;
      this.onContentChange();
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  /**
   * Extract table of contents from markdown
   */
  private extractToc(content: string) {
    this.tocItems = [];
    const lines = content.split('\n');
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line) => {
      const match = line.match(headingRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.generateTocId(text);

        this.tocItems.push({ level, text, id, collapsed: false, hasChildren: false });
      }
    });

    // Mark items that have children
    for (let i = 0; i < this.tocItems.length; i++) {
      const currentLevel = this.tocItems[i].level;
      // Check if next item is a child (higher level number = deeper nesting)
      if (i < this.tocItems.length - 1 && this.tocItems[i + 1].level > currentLevel) {
        this.tocItems[i].hasChildren = true;
      }
    }
  }

  /**
   * Toggle TOC item collapse state
   */
  toggleTocItem(index: number) {
    const item = this.tocItems[index];
    if (item.hasChildren) {
      item.collapsed = !item.collapsed;
    }
  }

  /**
   * Check if TOC item should be visible (not hidden by collapsed parent)
   */
  isTocItemVisible(index: number): boolean {
    const item = this.tocItems[index];

    // Filter by depth level
    if (item.level > this.tocDepthFilter) {
      return false;
    }

    if (index === 0) return true;

    const currentLevel = item.level;

    // Look backwards to find parent items
    for (let i = index - 1; i >= 0; i--) {
      const parentItem = this.tocItems[i];
      if (parentItem.level < currentLevel) {
        // Found a parent
        if (parentItem.collapsed) {
          return false; // Parent is collapsed, hide this item
        }
        // Continue checking for higher-level parents
        if (parentItem.level === 1) {
          break; // Reached top level
        }
      }
    }

    return true;
  }

  /**
   * Generate a URL-safe ID from heading text
   */
  private generateTocId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Set TOC depth filter
   */
  setTocDepthFilter(depth: number) {
    this.tocDepthFilter = depth;
  }

  /**
   * Scroll to heading in preview pane
   */
  scrollToHeading(headingId: string) {
    if (!this.previewContainer) return;

    const container = this.previewContainer.nativeElement;
    const heading = container.querySelector(`#${headingId}`);

    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Highlight the heading briefly
      heading.classList.add('highlight-heading');
      setTimeout(() => {
        heading.classList.remove('highlight-heading');
      }, 2000);
    }
  }

  /**
   * Expand all TOC items
   */
  expandAllTocItems() {
    for (const item of this.tocItems) {
      item.collapsed = false;
    }
  }

  /**
   * Collapse all TOC items
   */
  collapseAllTocItems() {
    for (const item of this.tocItems) {
      if (item.hasChildren) {
        item.collapsed = true;
      }
    }
  }

  /**
   * Export TOC as markdown list
   */
  exportTocAsMarkdown(): string {
    let markdown = '## Table of Contents\n\n';

    for (const item of this.tocItems) {
      if (item.level <= this.tocDepthFilter) {
        const indent = '  '.repeat(item.level - 1);
        markdown += `${indent}- [${item.text}](#${item.id})\n`;
      }
    }

    return markdown;
  }

  /**
   * Copy TOC to clipboard
   */
  copyTocToClipboard() {
    const tocMarkdown = this.exportTocAsMarkdown();
    navigator.clipboard.writeText(tocMarkdown).then(() => {
      console.log('TOC copied to clipboard!');
      // Could show a toast notification here
    });
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  /**
   * Toggle preview pane
   */
  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  /**
   * Toggle synchronized scrolling
   */
  toggleSyncScroll() {
    this.syncScroll = !this.syncScroll;
    console.log(`Synchronized scrolling: ${this.syncScroll ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /**
   * Toggle distraction-free mode
   */
  toggleDistractionFree() {
    this.distractionFree = !this.distractionFree;

    if (this.distractionFree) {
      // Hide sidebars and preview in distraction-free mode
      this.showSidebar = false;
      this.showPreview = false;
      this.showGallery = false;
    }
  }

  /**
   * Toggle command palette
   */
  toggleCommandPalette() {
    this.showCommandPalette = !this.showCommandPalette;

    if (this.showCommandPalette) {
      this.commandSearch = '';
      this.selectedCommandIndex = 0;
      this.filterCommands();
    }
  }

  /**
   * Toggle typewriter mode (centered active line)
   */
  toggleTypewriterMode() {
    this.typewriterMode = !this.typewriterMode;
  }

  /**
   * Initialize command palette commands
   */
  private initializeCommands() {
    this.commands = [
      { name: 'Save Document', description: 'Save the current document', icon: 'save', action: () => this.saveDocument(), shortcut: 'Cmd+S' },
      { name: 'Export Document', description: 'Export to various formats', icon: 'download', action: () => this.exportDocument(), shortcut: 'Cmd+E' },
      { name: 'Import Document', description: 'Import from file', icon: 'upload_file', action: () => this.importDocument() },
      { name: 'New Document', description: 'Create a new document', icon: 'note_add', action: () => this.newDocument(), shortcut: 'Cmd+N' },
      { name: 'Toggle Sidebar', description: 'Show/hide table of contents', icon: 'menu', action: () => this.toggleSidebar(), shortcut: 'Cmd+/' },
      { name: 'Toggle Preview', description: 'Show/hide markdown preview', icon: 'visibility', action: () => this.togglePreview(), shortcut: 'Cmd+\\' },
      { name: 'Toggle Metadata Editor', description: 'Edit document metadata', icon: 'info', action: () => this.toggleMetadataEditor() },
      { name: 'Distraction-Free Mode', description: 'Focus on writing', icon: 'center_focus_strong', action: () => this.toggleDistractionFree(), shortcut: 'Cmd+Shift+D' },
      { name: 'Typewriter Mode', description: 'Keep active line centered', icon: 'vertical_align_center', action: () => this.toggleTypewriterMode(), shortcut: 'Cmd+Shift+T' },
      { name: 'Fullscreen', description: 'Toggle fullscreen mode', icon: 'fullscreen', action: () => this.toggleFullscreen(), shortcut: 'F11' },
      { name: 'Insert Link', description: 'Insert markdown link', icon: 'link', action: () => this.insertMarkdown('link'), shortcut: 'Cmd+K, L' },
      { name: 'Insert Image', description: 'Insert markdown image', icon: 'image', action: () => this.insertMarkdown('image'), shortcut: 'Cmd+K, I' },
      { name: 'Insert Code Block', description: 'Insert code block', icon: 'code', action: () => this.insertMarkdown('code-block'), shortcut: 'Cmd+K, C' },
      { name: 'Insert Table', description: 'Insert markdown table', icon: 'table_chart', action: () => this.insertMarkdown('table'), shortcut: 'Cmd+K, T' },
      { name: 'Upload Image', description: 'Upload image to repository', icon: 'image', action: () => this.uploadImage() },
      { name: 'Undo', description: 'Undo last change', icon: 'undo', action: () => this.performUndo(), shortcut: 'Cmd+Z' },
      { name: 'Redo', description: 'Redo last change', icon: 'redo', action: () => this.performRedo(), shortcut: 'Cmd+Shift+Z' },
    ];
    this.filteredCommands = [...this.commands];
  }

  /**
   * Filter commands based on search
   */
  filterCommands() {
    const search = this.commandSearch.toLowerCase();
    if (!search) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd =>
        cmd.name.toLowerCase().includes(search) ||
        cmd.description.toLowerCase().includes(search)
      );
    }
    this.selectedCommandIndex = 0;
  }

  /**
   * Execute selected command
   */
  executeCommand(command: Command) {
    command.action();
    this.toggleCommandPalette();
  }

  /**
   * Initialize document templates
   */
  private initializeTemplates() {
    this.templates = [
      // Blog & Articles
      {
        name: 'Blog Post',
        description: 'Standard blog post with frontmatter',
        icon: 'article',
        category: 'blog',
        content: `---
title: "Your Blog Post Title"
date: ${new Date().toISOString().split('T')[0]}
author: "Your Name"
tags: [blog, tutorial]
description: "Brief description of your post"
---

# Your Blog Post Title

## Introduction

Write your introduction here...

## Main Content

### Section 1

Content goes here...

### Section 2

More content...

## Conclusion

Wrap up your post here.

---

*Published on ${new Date().toISOString().split('T')[0]}*`
      },
      {
        name: 'Tutorial',
        description: 'Step-by-step tutorial guide',
        icon: 'school',
        category: 'blog',
        content: `# Tutorial: [Topic Name]

## Prerequisites

Before you begin, make sure you have:
- Item 1
- Item 2
- Item 3

## Step 1: Setup

Instructions for step 1...

\`\`\`bash
# Example command
npm install package-name
\`\`\`

## Step 2: Configuration

Instructions for step 2...

## Step 3: Implementation

Instructions for step 3...

## Troubleshooting

Common issues and solutions:

### Issue 1
Solution...

### Issue 2
Solution...

## Conclusion

Summary and next steps.`
      },
      // Technical Documentation
      {
        name: 'API Documentation',
        description: 'API endpoint documentation',
        icon: 'code',
        category: 'technical',
        content: `# API Documentation

## Overview

Brief description of the API.

## Base URL

\`\`\`
https://api.example.com/v1
\`\`\`

## Authentication

All requests require authentication via API key:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### GET /users

Retrieve list of users.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| limit | integer | Max number of results |
| offset | integer | Starting position |

**Response:**
\`\`\`json
{
  "data": [],
  "total": 0
}
\`\`\`

### POST /users

Create a new user.

**Request Body:**
\`\`\`json
{
  "name": "string",
  "email": "string"
}
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |`
      },
      {
        name: 'README',
        description: 'Project README file',
        icon: 'description',
        category: 'technical',
        content: `# Project Name

Brief description of what this project does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
const project = require('project-name');

// Example usage
project.doSomething();
\`\`\`

## API Reference

### Method1()

Description of method1.

\`\`\`javascript
project.method1(param1, param2);
\`\`\`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License - see LICENSE file for details.`
      },
      // Business
      {
        name: 'Meeting Notes',
        description: 'Meeting notes template',
        icon: 'event_note',
        category: 'business',
        content: `# Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Time:** [Start Time] - [End Time]
**Location:** [Location/Video Link]

## Attendees

- Name 1
- Name 2
- Name 3

## Agenda

1. Topic 1
2. Topic 2
3. Topic 3

## Discussion

### Topic 1

- Key point 1
- Key point 2

### Topic 2

- Key point 1
- Key point 2

## Action Items

- [ ] Task 1 - @Person - Due: Date
- [ ] Task 2 - @Person - Due: Date
- [ ] Task 3 - @Person - Due: Date

## Next Meeting

**Date:** [Next Meeting Date]
**Topics:** [Topics for next meeting]`
      },
      {
        name: 'Project Proposal',
        description: 'Business project proposal',
        icon: 'business_center',
        category: 'business',
        content: `# Project Proposal: [Project Name]

## Executive Summary

Brief overview of the project (2-3 paragraphs).

## Problem Statement

What problem does this project solve?

## Proposed Solution

Detailed description of the proposed solution.

## Objectives

- Objective 1
- Objective 2
- Objective 3

## Scope

### In Scope
- Item 1
- Item 2

### Out of Scope
- Item 1
- Item 2

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 2 weeks | Deliverable 1 |
| Phase 2 | 4 weeks | Deliverable 2 |
| Phase 3 | 2 weeks | Deliverable 3 |

## Budget

| Item | Cost |
|------|------|
| Item 1 | $X,XXX |
| Item 2 | $X,XXX |
| **Total** | **$XX,XXX** |

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk 1 | High | Strategy |
| Risk 2 | Medium | Strategy |

## Conclusion

Summary and call to action.`
      },
      // Academic
      {
        name: 'Research Paper',
        description: 'Academic research paper',
        icon: 'science',
        category: 'academic',
        content: `---
title: "Paper Title"
author: "Your Name"
date: ${new Date().toISOString().split('T')[0]}
abstract: "Brief summary of the research"
---

# Paper Title

**Author:** Your Name
**Date:** ${new Date().toISOString().split('T')[0]}

## Abstract

Brief summary of the research (150-250 words).

## 1. Introduction

### 1.1 Background

### 1.2 Research Question

### 1.3 Objectives

## 2. Literature Review

### 2.1 Topic Area 1

### 2.2 Topic Area 2

## 3. Methodology

### 3.1 Research Design

### 3.2 Data Collection

### 3.3 Analysis Methods

## 4. Results

### 4.1 Finding 1

### 4.2 Finding 2

## 5. Discussion

### 5.1 Interpretation

### 5.2 Limitations

### 5.3 Implications

## 6. Conclusion

## References

1. Reference 1
2. Reference 2
3. Reference 3`
      }
    ];
  }

  /**
   * Toggle template dialog
   */
  toggleTemplateDialog() {
    this.showTemplateDialog = !this.showTemplateDialog;
  }

  /**
   * Apply template to editor
   */
  applyTemplate(template: DocumentTemplate) {
    this.markdownContent = template.content;
    this.documentTitle = template.name;
    this.hasUnsavedChanges = true;
    this.showTemplateDialog = false;
    this.updatePreview(this.markdownContent);
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave() {
    if (!this.autoSaveEnabled) return;

    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.performAutoSave();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save interval
   */
  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Perform auto-save to localStorage
   */
  private performAutoSave() {
    try {
      const autoSaveData = {
        documentId: this.documentId,
        title: this.documentTitle,
        content: this.markdownContent,
        metadata: this.metadata,
        timestamp: new Date().toISOString(),
        wordCount: this.wordCount,
        charCount: this.charCount
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(autoSaveData));

      // Create version snapshot
      this.createVersionSnapshot();

      console.log('Auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * Load auto-saved draft from localStorage
   */
  private loadAutoSavedDraft() {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (!savedData) return;

      const draft = JSON.parse(savedData);

      // Check if draft is recent (within last 7 days)
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (draftAge < sevenDays) {
        // Show unobtrusive notification about auto-saved draft
        const message = `Auto-saved draft found: "${draft.title}" (${draft.wordCount} words)`;
        const snackBarRef = this.snackBar.open(message, 'Restore', {
          duration: 15000, // 15 seconds
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          panelClass: ['draft-restore-snackbar']
        });

        snackBarRef.onAction().subscribe(() => {
          this.documentId = draft.documentId;
          this.documentTitle = draft.title;
          this.markdownContent = draft.content;
          this.metadata = draft.metadata || {};
          this.updatePreview(this.markdownContent);
          this.triggerPluginLoad();
          this.showSuccess('Draft restored successfully');
        });
      }

      // Load version history
      this.loadVersionHistory();
    } catch (error) {
      console.error('Failed to load auto-saved draft:', error);
    }
  }

  /**
   * Create a version snapshot
   */
  private createVersionSnapshot() {
    const version: DocumentVersion = {
      id: `v-${Date.now()}`,
      timestamp: new Date(),
      content: this.markdownContent,
      title: this.documentTitle,
      wordCount: this.wordCount,
      charCount: this.charCount
    };

    this.versions.unshift(version);

    // Keep only last MAX_VERSIONS
    if (this.versions.length > this.MAX_VERSIONS) {
      this.versions = this.versions.slice(0, this.MAX_VERSIONS);
    }

    // Save to localStorage
    this.saveVersionHistory();
  }

  /**
   * Save version history to localStorage
   */
  private saveVersionHistory() {
    try {
      const versionsData = this.versions.map(v => ({
        ...v,
        timestamp: v.timestamp.toISOString()
      }));
      localStorage.setItem(`${this.STORAGE_KEY}-versions`, JSON.stringify(versionsData));
    } catch (error) {
      console.error('Failed to save version history:', error);
    }
  }

  /**
   * Load version history from localStorage
   */
  private loadVersionHistory() {
    try {
      const versionsData = localStorage.getItem(`${this.STORAGE_KEY}-versions`);
      if (!versionsData) return;

      const parsed = JSON.parse(versionsData);
      this.versions = parsed.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load version history:', error);
    }
  }

  /**
   * Toggle version history sidebar
   */
  toggleVersionHistory() {
    this.showVersionHistory = !this.showVersionHistory;
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(version: DocumentVersion) {
    const confirmed = await this.showConfirmation(
      `Restore version from ${version.timestamp.toLocaleString()}? This will replace your current content.`,
      'Restore'
    );

    if (confirmed) {
      this.markdownContent = version.content;
      this.documentTitle = version.title;
      this.hasUnsavedChanges = true;
      this.updatePreview(this.markdownContent);
      this.showVersionHistory = false;
      this.showSuccess('Version restored successfully');
      console.log('Version restored:', version.id);
    }
  }

  /**
   * Delete a specific version
   */
  deleteVersion(version: DocumentVersion) {
    const index = this.versions.findIndex(v => v.id === version.id);
    if (index !== -1) {
      this.versions.splice(index, 1);
      this.saveVersionHistory();
    }
  }

  /**
   * Clear all versions
   */
  async clearAllVersions() {
    const confirmed = await this.showConfirmation(
      'Delete all version history? This cannot be undone.',
      'Delete All'
    );

    if (confirmed) {
      this.versions = [];
      localStorage.removeItem(`${this.STORAGE_KEY}-versions`);
      this.showSuccess('All versions cleared');
      console.log('All versions cleared');
    }
  }

  /**
   * Toggle auto-save
   */
  toggleAutoSave() {
    this.autoSaveEnabled = !this.autoSaveEnabled;

    if (this.autoSaveEnabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  /**
   * Change preview theme
   */
  changePreviewTheme(themeId: string) {
    this.selectedTheme = themeId;
    sessionStorage.setItem('preview-theme', themeId);
    this.themeApplied = false; // Reset flag to allow re-application
    this.applyPreviewTheme();
  }

  /**
   * Apply theme to preview pane
   */
  private applyPreviewTheme() {
    const theme = this.documentEngine.getThemeById(this.selectedTheme);
    if (!theme) return;

    this.previewThemeCSS = this.documentEngine.generatePreviewThemeCSS(theme);

    // Dynamically inject the style element
    if (this.previewContainer) {
      // Remove old style element if it exists
      if (this.themeStyleElement) {
        this.renderer.removeChild(this.previewContainer.nativeElement, this.themeStyleElement);
      }

      // Create new style element
      this.themeStyleElement = this.renderer.createElement('style');
      this.renderer.setProperty(this.themeStyleElement, 'textContent', this.previewThemeCSS);
      this.renderer.appendChild(this.previewContainer.nativeElement, this.themeStyleElement);
    }
  }

  /**
   * Get selected theme object
   */
  getSelectedTheme(): DocumentTheme | undefined {
    return this.documentEngine.getThemeById(this.selectedTheme);
  }

  /**
   * Show success message
   */
  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Show info message
   */
  private showInfo(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Show confirmation with action
   */
  private showConfirmation(message: string, action: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      const snackBarRef = this.snackBar.open(message, action, {
        duration: 10000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['confirmation-snackbar']
      });

      snackBarRef.onAction().subscribe(() => resolve(true));
      snackBarRef.afterDismissed().subscribe(() => resolve(false));
    });
  }

  /**
   * Save document
   */
  saveDocument() {
    // Trigger plugin before save hooks (may modify content)
    const processedContent = this.triggerPluginBeforeSave();

    const document = {
      id: this.documentId,
      title: this.documentTitle,
      content: processedContent,
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString() // This will be preserved by backend if it exists
    };

    this.studioDocumentService.saveDocument(document).subscribe({
      next: (response) => {
        this.lastSaved = new Date();
        this.hasUnsavedChanges = false;
        console.log('Document saved successfully:', response);

        // Trigger plugin after save hooks
        this.triggerPluginAfterSave();
      },
      error: (error) => {
        console.error('Error saving document:', error);
        this.showError('Error saving document. Please try again.');
      }
    });
  }

  /**
   * Export document
   */
  exportDocument() {
    // Get rendered HTML content from preview container
    let htmlContent = '';
    if (this.previewContainer) {
      const markdownElement = this.previewContainer.nativeElement.querySelector('markdown');
      if (markdownElement) {
        htmlContent = markdownElement.innerHTML;
      }
    }

    const dialogRef = this.dialog.open(ExportDocumentDialogComponent, {
      width: '600px',
      disableClose: false,
      data: {
        markdown: this.markdownContent,
        htmlContent: htmlContent,
        title: this.documentTitle,
        preselectedTheme: this.selectedTheme  // Pass the current preview theme
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        console.log(`Document exported successfully as ${result.format}`);
      }
    });
  }

  /**
   * Export to EPUB format
   */
  async exportToEpub() {
    try {
      const metadata: EpubMetadata = {
        title: this.documentTitle,
        author: this.metadata.author || '',
        language: 'en',
        description: this.metadata.description || '',
        date: this.metadata.date || new Date().toISOString().split('T')[0]
      };

      await this.epubExportService.exportToEpub(
        this.markdownContent,
        metadata,
        this.epubOptions
      );

      this.showSuccess('EPUB exported successfully!');
      this.showEpubDialog = false;
    } catch (error) {
      console.error('EPUB export failed:', error);
      this.showError('Failed to export EPUB. Please try again.');
    }
  }

  /**
   * Show EPUB export dialog
   */
  openEpubExportDialog() {
    this.showEpubDialog = true;
  }

  /**
   * Close EPUB export dialog
   */
  closeEpubExportDialog() {
    this.showEpubDialog = false;
  }

  /**
   * Export to PDF via backend API
   */
  async exportToPdf() {
    try {
      this.showInfo('Generating PDF...');

      const response = await this.http.post(
        'http://localhost:3000/api/studio/export',
        {
          markdown: this.markdownContent,
          format: 'pdf',
          title: this.documentTitle
        },
        { responseType: 'blob' }
      ).toPromise();

      if (response) {
        // Create download link
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.showSuccess('PDF exported successfully!');
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      this.showError('Failed to export PDF. Make sure the backend server is running.');
    }
  }

  /**
   * Open theme editor
   */
  openThemeEditor() {
    this.showThemeEditor = true;
  }

  /**
   * Close theme editor
   */
  closeThemeEditor() {
    this.showThemeEditor = false;
  }

  /**
   * Handle theme preview from editor
   */
  onThemeEditorChange(theme: DocumentTheme) {
    this.applyThemeDirect(theme);
  }

  /**
   * Handle theme saved from editor
   */
  onThemeEditorSaved(theme: DocumentTheme) {
    // Reload themes to include the new custom theme
    this.themes = this.documentEngine.getAllThemes();
    // Add custom themes from localStorage
    try {
      const stored = localStorage.getItem('custom-themes');
      if (stored) {
        const customThemes = JSON.parse(stored);
        this.themes = [...this.themes, ...customThemes];
      }
    } catch {}

    // Apply the saved theme
    this.selectedTheme = theme.id;
    this.applyThemeDirect(theme);
    this.showSuccess('Theme saved successfully!');
  }

  /**
   * Apply theme directly (for live preview from editor)
   */
  private applyThemeDirect(theme: DocumentTheme) {
    this.previewThemeCSS = this.documentEngine.generatePreviewThemeCSS(theme);

    if (this.previewContainer) {
      if (this.themeStyleElement) {
        this.renderer.removeChild(this.previewContainer.nativeElement, this.themeStyleElement);
      }

      this.themeStyleElement = this.renderer.createElement('style');
      this.renderer.setProperty(this.themeStyleElement, 'textContent', this.previewThemeCSS);
      this.renderer.appendChild(this.previewContainer.nativeElement, this.themeStyleElement);
    }
  }

  /**
   * Toggle Find and Replace panel
   */
  toggleFindReplace() {
    this.showFindReplace = !this.showFindReplace;
    if (!this.showFindReplace) {
      this.clearFind();
    }
  }

  /**
   * Find text in editor
   */
  findInEditor() {
    this.findResults = [];
    this.currentFindIndex = -1;

    if (!this.findText) return;

    let searchText = this.findText;
    let content = this.markdownContent;

    if (!this.findCaseSensitive) {
      searchText = searchText.toLowerCase();
      content = content.toLowerCase();
    }

    if (this.findWholeWord) {
      const regex = new RegExp(`\\b${this.escapeRegex(searchText)}\\b`, this.findCaseSensitive ? 'g' : 'gi');
      let match;
      while ((match = regex.exec(this.markdownContent)) !== null) {
        this.findResults.push(match.index);
      }
    } else {
      let index = 0;
      while ((index = content.indexOf(searchText, index)) !== -1) {
        this.findResults.push(index);
        index += searchText.length;
      }
    }

    if (this.findResults.length > 0) {
      this.currentFindIndex = 0;
      this.highlightCurrentFind();
    }
  }

  /**
   * Find next occurrence
   */
  findNext() {
    if (this.findResults.length === 0) return;
    this.currentFindIndex = (this.currentFindIndex + 1) % this.findResults.length;
    this.highlightCurrentFind();
  }

  /**
   * Find previous occurrence
   */
  findPrevious() {
    if (this.findResults.length === 0) return;
    this.currentFindIndex = (this.currentFindIndex - 1 + this.findResults.length) % this.findResults.length;
    this.highlightCurrentFind();
  }

  /**
   * Replace current occurrence
   */
  replaceCurrent() {
    if (this.findResults.length === 0 || this.currentFindIndex < 0) return;

    const index = this.findResults[this.currentFindIndex];
    // Get the actual text length from original content (handles case-insensitive)
    const matchedText = this.markdownContent.substring(index, index + this.findText.length);
    const before = this.markdownContent.substring(0, index);
    const after = this.markdownContent.substring(index + matchedText.length);

    this.markdownContent = before + this.replaceText + after;
    this.hasUnsavedChanges = true;
    this.updatePreview(this.markdownContent);
    this.findInEditor(); // Re-find to update results
  }

  /**
   * Replace all occurrences
   */
  replaceAll() {
    if (this.findResults.length === 0) return;

    let flags = 'g';
    if (!this.findCaseSensitive) flags += 'i';

    let pattern = this.escapeRegex(this.findText);
    if (this.findWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const regex = new RegExp(pattern, flags);
    this.markdownContent = this.markdownContent.replace(regex, this.replaceText);
    this.hasUnsavedChanges = true;
    this.updatePreview(this.markdownContent);

    const count = this.findResults.length;
    this.clearFind();
    this.showSuccess(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
  }

  /**
   * Clear find state
   */
  clearFind() {
    this.findResults = [];
    this.currentFindIndex = -1;
  }

  /**
   * Highlight current find result in editor
   */
  private highlightCurrentFind() {
    if (this.currentFindIndex < 0 || !this.findResults.length) return;

    const index = this.findResults[this.currentFindIndex];

    // Select the found text in the textarea
    if (this.markdownEditor?.nativeElement) {
      const textarea = this.markdownEditor.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(index, index + this.findText.length);

      // Scroll the textarea to show the selection
      const textBefore = this.markdownContent.substring(0, index);
      const linesBefore = textBefore.split('\n').length - 1;
      const lineHeight = 24; // Approximate line height
      const scrollPosition = linesBefore * lineHeight - textarea.clientHeight / 2;
      textarea.scrollTop = Math.max(0, scrollPosition);
    }

    // Also highlight in preview
    this.highlightInPreview();
  }

  /**
   * Highlight all matches in the preview pane
   */
  private highlightInPreview() {
    if (!this.previewContainer?.nativeElement || !this.findText) return;

    // Get the preview content
    const preview = this.previewContainer.nativeElement;

    // Remove existing highlights
    const existingHighlights = preview.querySelectorAll('.find-highlight');
    existingHighlights.forEach((el: Element) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    if (this.findResults.length === 0) return;

    // Create a tree walker to find text nodes
    const walker = document.createTreeWalker(
      preview,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    // Build regex for highlighting
    let flags = 'gi';
    let pattern = this.escapeRegex(this.findText);
    if (this.findWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const regex = new RegExp(pattern, flags);

    // Highlight matches in text nodes
    let matchIndex = 0;
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const matches = [...text.matchAll(new RegExp(pattern, 'gi'))];

      if (matches.length > 0) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach(match => {
          // Add text before match
          if (match.index! > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
          }

          // Add highlighted match
          const span = document.createElement('span');
          span.className = 'find-highlight';
          if (matchIndex === this.currentFindIndex) {
            span.classList.add('current');
          }
          span.textContent = match[0];
          fragment.appendChild(span);

          lastIndex = match.index! + match[0].length;
          matchIndex++;
        });

        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });

    // Scroll to current highlight in preview
    const currentHighlight = preview.querySelector('.find-highlight.current');
    if (currentHighlight) {
      currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Open word goal dialog
   */
  openWordGoalDialog() {
    this.tempWordGoal = this.wordCountGoal;
    this.showWordGoalDialog = true;
  }

  /**
   * Close word goal dialog
   */
  closeWordGoalDialog() {
    this.showWordGoalDialog = false;
  }

  /**
   * Set word count goal
   */
  setWordGoal() {
    this.wordCountGoal = this.tempWordGoal;
    localStorage.setItem('word-count-goal', this.wordCountGoal.toString());
    this.showWordGoalDialog = false;
    if (this.wordCountGoal > 0) {
      this.showSuccess(`Word goal set to ${this.wordCountGoal.toLocaleString()} words`);
    } else {
      this.showInfo('Word goal cleared');
    }
  }

  /**
   * Clear word count goal
   */
  clearWordGoal() {
    this.wordCountGoal = 0;
    this.tempWordGoal = 0;
    localStorage.removeItem('word-count-goal');
    this.showWordGoalDialog = false;
  }

  /**
   * Get word goal progress percentage
   */
  getWordGoalProgress(): number {
    if (this.wordCountGoal <= 0) return 0;
    return Math.min(100, (this.wordCount / this.wordCountGoal) * 100);
  }

  /**
   * Get word goal status color
   */
  getWordGoalColor(): string {
    const progress = this.getWordGoalProgress();
    if (progress >= 100) return '#4caf50'; // Green - goal met
    if (progress >= 75) return '#8bc34a';  // Light green
    if (progress >= 50) return '#ffc107';  // Yellow
    if (progress >= 25) return '#ff9800';  // Orange
    return '#f44336'; // Red
  }

  /**
   * Toggle split view mode
   */
  toggleSplitMode() {
    this.splitMode = this.splitMode === 'horizontal' ? 'vertical' : 'horizontal';
    localStorage.setItem('split-mode', this.splitMode);
  }

  /**
   * Set split view mode
   */
  setSplitMode(mode: 'horizontal' | 'vertical') {
    this.splitMode = mode;
    localStorage.setItem('split-mode', this.splitMode);
  }

  /**
   * Import document
   */
  importDocument() {
    const dialogRef = this.dialog.open(ImportDocumentDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.markdown) {
        // Load the converted markdown into the editor
        this.markdownContent = result.markdown;
        this.hasUnsavedChanges = true;

        // Update the document title based on the imported filename
        if (result.originalFilename) {
          const filenameWithoutExt = result.originalFilename.replace(/\.[^/.]+$/, '');
          this.documentTitle = filenameWithoutExt;
        }

        // Trigger preview update
        this.updatePreview(this.markdownContent);

        console.log(`Successfully imported ${result.originalFilename}`);
      }
    });
  }

  /**
   * Create new document
   */
  newDocument() {
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Continue without saving?');
      if (!confirm) return;
    }

    // Generate new document ID
    this.documentId = this.studioDocumentService.generateDocumentId();
    this.markdownContent = '# New Document\n\nStart writing...';
    this.documentTitle = 'Untitled Document';
    this.hasUnsavedChanges = false;
    this.lastSaved = null;
    this.updatePreview(this.markdownContent);
  }

  /**
   * Insert text at cursor position in the editor
   */
  private insertTextAtCursor(text: string) {
    if (!this.markdownEditor?.nativeElement) {
      // Fallback: append to end if editor not available
      this.markdownContent += '\n\n' + text + '\n\n';
      return;
    }

    const textarea = this.markdownEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.markdownContent.substring(0, start);
    const after = this.markdownContent.substring(end);

    // Insert text at cursor position
    this.markdownContent = before + '\n\n' + text + '\n\n' + after;

    // Update cursor position to after inserted text
    setTimeout(() => {
      const newPosition = start + text.length + 4; // +4 for the two newlines before and after
      textarea.selectionStart = newPosition;
      textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
  }

  /**
   * Insert bold markdown syntax
   */
  private insertMarkdownBold() {
    // TODO: Implement text insertion at cursor position
    console.log('Insert bold markdown');
  }

  /**
   * Insert italic markdown syntax
   */
  private insertMarkdownItalic() {
    // TODO: Implement text insertion at cursor position
    console.log('Insert italic markdown');
  }

  /**
   * Handle image upload button click
   */
  uploadImage() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = (event: any) => {
      const files = Array.from(event.target.files || []) as File[];

      if (files.length === 0) {
        return;
      }

      // Upload images
      this.uploadImageFiles(files);
    };

    // Trigger file selection dialog
    input.click();
  }

  /**
   * Upload image files to repository
   */
  private uploadImageFiles(files: File[]) {
    // Filter to only image files
    const imageFiles = files.filter(file => this.imageRepositoryService.isImageFile(file));

    if (imageFiles.length === 0) {
      this.showError('No valid image files selected.');
      return;
    }

    this.imageRepositoryService.uploadImages(imageFiles, this.documentId).subscribe({
      next: (response) => {
        console.log('Images uploaded:', response);

        // Insert markdown references for each uploaded image
        const markdownRefs = response.images
          .map(img =>
            this.imageRepositoryService.generateMarkdownReference(
              img.imageId,
              img.originalName,
              img.originalName
            )
          )
          .join('\n\n');

        // Insert at cursor position
        this.insertTextAtCursor(markdownRefs);
        this.hasUnsavedChanges = true;
        this.contentChange$.next(this.markdownContent);

        const uploadedCount = response.uploaded;
        const failedCount = files.length - imageFiles.length;
        let message = `Successfully uploaded ${uploadedCount} image(s)!`;

        if (failedCount > 0) {
          message += ` ${failedCount} non-image file(s) were skipped.`;
        }

        this.showSuccess(message);
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.showError('Error uploading images. Please try again.');
      }
    });
  }

  /**
   * Import image from URL
   */
  importImageFromUrl() {
    const url = prompt('Enter image URL:');

    if (!url || url.trim() === '') {
      return;
    }

    this.imageRepositoryService.importFromUrl(url.trim(), this.documentId).subscribe({
      next: (response) => {
        console.log('Image imported from URL:', response);

        // Generate markdown reference
        const markdownRef = this.imageRepositoryService.generateMarkdownReference(
          response.imageId,
          response.originalName,
          response.originalName
        );

        // Insert at cursor position
        this.insertTextAtCursor(markdownRef);
        this.hasUnsavedChanges = true;
        this.contentChange$.next(this.markdownContent);

        this.showSuccess('Successfully imported image from URL!');
      },
      error: (error) => {
        console.error('Import from URL error:', error);
        const errorMessage = error.error?.message || 'Error importing image from URL. Please check the URL and try again.';
        this.showError(errorMessage);
      }
    });
  }

  /**
   * Toggle gallery visibility
   */
  toggleGallery() {
    this.showGallery = !this.showGallery;
  }

  /**
   * Handle image selection from gallery
   */
  onImageSelected(image: ImageMetadata) {
    // Generate markdown reference for the selected image
    const markdownRef = this.imageRepositoryService.generateMarkdownReference(
      image.imageId,
      image.originalName,
      image.originalName
    );

    // Insert at cursor position
    this.insertTextAtCursor(markdownRef);
    this.hasUnsavedChanges = true;
    this.contentChange$.next(this.markdownContent);

    console.log(`Inserted image: ${image.originalName}`);
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      this.uploadImageFiles(fileArray);
    }
  }

  /**
   * Get editor mode for the markdown-editor component
   */
  getEditorMode(): string {
    return this.showPreview ? 'split' : 'editor';
  }

  /**
   * Perform undo operation
   */
  performUndo() {
    if (this.undoHistory.length > 1) {
      // Save current state to redo
      this.redoHistory.push(this.markdownContent);

      // Remove current state from undo
      this.undoHistory.pop();

      // Get previous state
      const previousState = this.undoHistory[this.undoHistory.length - 1];
      this.markdownContent = previousState;
      this.hasUnsavedChanges = true;
      this.updatePreview(this.markdownContent);
    }
  }

  /**
   * Perform redo operation
   */
  performRedo() {
    if (this.redoHistory.length > 0) {
      // Get next state from redo
      const nextState = this.redoHistory.pop();
      if (nextState) {
        // Add current state to undo
        this.undoHistory.push(this.markdownContent);

        // Apply next state
        this.markdownContent = nextState;
        this.hasUnsavedChanges = true;
        this.updatePreview(this.markdownContent);
      }
    }
  }

  /**
   * Discard unsaved changes
   */
  discardChanges() {
    const confirm = window.confirm('Are you sure you want to discard all unsaved changes?');
    if (confirm) {
      // Reload the last saved content or reset to empty
      if (this.undoHistory.length > 0) {
        this.markdownContent = this.undoHistory[0];
      } else {
        this.markdownContent = '# New Document\n\nStart writing...';
      }
      this.hasUnsavedChanges = false;
      this.updatePreview(this.markdownContent);
    }
  }

  /**
   * Insert markdown formatting
   */
  insertMarkdown(type: string) {
    // This method will be enhanced to handle cursor position and selection
    // For now, it provides basic insertion at the end

    switch (type) {
      case 'bold':
        this.markdownContent += '**bold text**';
        break;
      case 'italic':
        this.markdownContent += '*italic text*';
        break;
      case 'strikethrough':
        this.markdownContent += '~~strikethrough text~~';
        break;
      case 'inline-code':
        this.markdownContent += '`code`';
        break;
      case 'h1':
        this.markdownContent += '\n# Heading 1\n';
        break;
      case 'h2':
        this.markdownContent += '\n## Heading 2\n';
        break;
      case 'h3':
        this.markdownContent += '\n### Heading 3\n';
        break;
      case 'h4':
        this.markdownContent += '\n#### Heading 4\n';
        break;
      case 'h5':
        this.markdownContent += '\n##### Heading 5\n';
        break;
      case 'h6':
        this.markdownContent += '\n###### Heading 6\n';
        break;
      case 'ul':
        this.markdownContent += '\n- List item 1\n- List item 2\n- List item 3\n';
        break;
      case 'ol':
        this.markdownContent += '\n1. List item 1\n2. List item 2\n3. List item 3\n';
        break;
      case 'task':
        this.markdownContent += '\n- [ ] Task 1\n- [ ] Task 2\n- [x] Task 3 (completed)\n';
        break;
      case 'indent':
        // Add indentation to selected lines
        this.markdownContent += '  ';
        break;
      case 'outdent':
        // Remove indentation from selected lines
        // This would require cursor position awareness
        break;
      case 'link':
        this.markdownContent += '[link text](https://example.com)';
        break;
      case 'image':
        this.markdownContent += '![alt text](image-url)';
        break;
      case 'blockquote':
        this.markdownContent += '\n> Blockquote text\n';
        break;
      case 'code-block':
        this.markdownContent += '\n```javascript\n// Code block\nconsole.log("Hello World");\n```\n';
        break;
      case 'table':
        this.markdownContent += '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Data     | Data     |\n| Row 2    | Data     | Data     |\n';
        break;
      case 'hr':
        this.markdownContent += '\n---\n';
        break;
      case 'footnote':
        this.markdownContent += 'Text with footnote[^1]\n\n[^1]: Footnote content';
        break;
      case 'emoji':
        this.markdownContent += ' :smile: ';
        break;
      default:
        console.warn('Unknown markdown type:', type);
    }

    // Trigger content change
    this.onContentChange();
  }

  /**
   * Resize functionality
   */
  private resizingPanel: 'sidebar' | 'editor' | null = null;
  private startX: number = 0;
  private startWidth: number = 0;

  onResizeStart(event: MouseEvent, panel: 'sidebar' | 'editor') {
    event.preventDefault();
    this.resizingPanel = panel;
    this.startX = event.clientX;

    // Get the current width of the panel being resized
    if (panel === 'sidebar' && this.sidebar) {
      this.startWidth = this.sidebar.nativeElement.offsetWidth;
    } else if (panel === 'editor' && this.editorPane) {
      this.startWidth = this.editorPane.nativeElement.offsetWidth;
    }

    // Add resizing class to container
    const container = document.querySelector('.studio-container');
    container?.classList.add('resizing');

    // Add resizing class to the handle
    (event.target as HTMLElement).classList.add('resizing');
  }

  @HostListener('document:mousemove', ['$event'])
  onResizeMove(event: MouseEvent) {
    if (!this.resizingPanel) return;

    const delta = event.clientX - this.startX;
    const newWidth = this.startWidth + delta;

    if (this.resizingPanel === 'sidebar' && this.sidebar) {
      const element = this.sidebar.nativeElement;
      const minWidth = 200;
      const maxWidth = 600;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      element.style.width = `${clampedWidth}px`;
    } else if (this.resizingPanel === 'editor' && this.editorPane) {
      const element = this.editorPane.nativeElement;
      const minWidth = 300;
      const maxWidth = 1200;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      element.style.width = `${clampedWidth}px`;
      element.style.flex = 'none';
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onResizeEnd(event: MouseEvent) {
    if (!this.resizingPanel) return;

    // Remove resizing class from container
    const container = document.querySelector('.studio-container');
    container?.classList.remove('resizing');

    // Remove resizing class from all handles
    document.querySelectorAll('.resize-handle.resizing').forEach(handle => {
      handle.classList.remove('resizing');
    });

    this.resizingPanel = null;
  }

  // ==========================================
  // Plugin System Methods
  // ==========================================

  /**
   * Initialize plugins and register built-in ones
   */
  private initializePlugins() {
    // Register built-in plugins
    this.pluginService.registerPlugin(wordFrequencyPlugin);
    this.pluginService.registerPlugin(readingLevelPlugin);
    this.pluginService.registerPlugin(cloudSyncPlugin);

    // Subscribe to plugin changes
    this.pluginService.plugins$.pipe(takeUntil(this.destroy$)).subscribe(plugins => {
      this.plugins = plugins;
      this.updatePluginComponents();
    });

    // Initial update
    this.updatePluginComponents();
  }

  /**
   * Update plugin-provided components
   */
  private updatePluginComponents() {
    this.pluginToolbarButtons = this.pluginService.getToolbarButtons();
    this.pluginCommands = this.pluginService.getCommands();
    this.pluginExporters = this.pluginService.getExporters();
  }

  /**
   * Toggle plugin manager panel
   */
  togglePluginManager() {
    this.showPluginManager = !this.showPluginManager;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string) {
    this.pluginService.enablePlugin(pluginId);
    this.showSuccess(`Plugin enabled`);
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string) {
    this.pluginService.disablePlugin(pluginId);
    this.showSuccess(`Plugin disabled`);
  }

  /**
   * Toggle plugin enabled state
   */
  togglePlugin(plugin: Plugin) {
    if (plugin.enabled) {
      this.disablePlugin(plugin.id);
    } else {
      this.enablePlugin(plugin.id);
    }
  }

  /**
   * Execute a plugin command
   */
  executePluginCommand(command: PluginCommand) {
    try {
      command.action();
    } catch (error) {
      console.error(`Error executing plugin command ${command.id}:`, error);
      this.showError(`Failed to execute command: ${command.name}`);
    }
  }

  /**
   * Execute a plugin exporter
   */
  async executePluginExport(exporter: PluginExporter) {
    try {
      const blob = await exporter.export(this.markdownContent, this.documentTitle);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.documentTitle || 'document'}.${exporter.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showSuccess(`Exported as ${exporter.name}`);
    } catch (error) {
      console.error(`Error executing plugin export ${exporter.id}:`, error);
      this.showError(`Failed to export: ${exporter.name}`);
    }
  }

  /**
   * Trigger plugin content change hooks
   */
  private triggerPluginContentChange() {
    this.pluginService.triggerContentChange(this.markdownContent);
  }

  /**
   * Trigger plugin before save hooks
   */
  private triggerPluginBeforeSave(): string {
    return this.pluginService.triggerBeforeSave(this.markdownContent);
  }

  /**
   * Trigger plugin after save hooks
   */
  private triggerPluginAfterSave() {
    this.pluginService.triggerAfterSave(this.markdownContent);
  }

  /**
   * Trigger plugin load hooks
   */
  private triggerPluginLoad() {
    this.pluginService.triggerLoad(this.markdownContent);
  }
}
