import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MarkdownModule } from 'ngx-markdown';
import { SearchService, SearchResult, Topic, Tag } from './services/search.service';
import { AnnotationService, Annotation } from './services/annotation.service';
import { CollectionService, Collection } from './services/collection.service';
import { CollectionsSidebarComponent } from './components/collections-sidebar/collections-sidebar.component';
import { CollectionDialogComponent } from './components/collection-dialog/collection-dialog.component';
import { DocumentCollectionsDialogComponent } from './components/document-collections-dialog/document-collections-dialog.component';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';


interface TocItem {
  level: number;
  text: string;
  id: string;
}

interface RecentDoc {
  path: string;
  title: string;
  viewedAt: number;
  topics: string[];
}

interface SearchResultWithCollections extends SearchResult {
  collections?: Collection[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDialogModule,
    MarkdownModule,
    CollectionsSidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  title = 'Markdown Reader';
  searchQuery = '';
  searchResults: SearchResultWithCollections[] = [];
  isSearching = false;
  hasSearched = false;
  totalDocuments = 0;
  totalWords = 0;
  selectedDocument: any = null;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('documentContent') documentContent!: ElementRef;
  @ViewChild('findInput') findInput!: ElementRef;
  @ViewChild(CollectionsSidebarComponent) collectionsSidebar!: CollectionsSidebarComponent;

  // Document viewer enhancements
  documentToc: TocItem[] = [];
  isFullscreen = false;
  showToc = true;
  copySuccess = false;

  // Annotations
  annotations: Annotation[] = [];
  selectedText = '';
  selectionRange: { start: number; end: number } | null = null;
  showAnnotationDialog = false;
  currentAnnotation: Partial<Annotation> = { color: 'yellow', note: '' };
  editingAnnotation: Annotation | null = null;
  availableColors = [
    { name: 'Yellow', value: 'yellow', color: '#fef3c7' },
    { name: 'Green', value: 'green', color: '#d1fae5' },
    { name: 'Blue', value: 'blue', color: '#dbeafe' },
    { name: 'Pink', value: 'pink', color: '#fce7f3' },
    { name: 'Purple', value: 'purple', color: '#e9d5ff' }
  ];

  // Filters
  availableTopics: Topic[] = [];
  selectedTopics: string[] = [];
  showFilters = false;

  // Upload
  showUploadDialog = false;
  uploadProgress: string[] = [];
  isUploading = false;
  dragOver = false;

  // Settings
  showSettingsDialog = false;
  currentConfig: any = null;
  newWatchDirectory = '';
  settingsMessage = '';
  settingsError = '';
  isUpdatingSettings = false;

  // Search History
  searchHistory: string[] = [];
  showSearchHistory = false;
  private readonly MAX_HISTORY_ITEMS = 10;
  private readonly HISTORY_KEY = 'md-reader-search-history';

  // Document Organization
  favorites: string[] = [];
  recentDocuments: RecentDoc[] = [];
  relatedDocuments: SearchResult[] = [];
  showFavorites = false;
  showRecent = false;
  private readonly MAX_RECENT_ITEMS = 20;
  private readonly FAVORITES_KEY = 'md-reader-favorites';
  private readonly RECENT_KEY = 'md-reader-recent';

  // Index Page
  showIndex = false;
  allDocuments: SearchResult[] = [];
  groupedDocuments: { [key: string]: SearchResult[] } = {};
  alphabetSections: string[] = [];

  // Collections
  showCollections = false;
  collections: Collection[] = [];
  selectedCollection: Collection | null = null;
  showCollectionDialog = false;
  collectionDialogMode: 'create' | 'edit' = 'create';
  currentCollection: Partial<Collection> = {};
  availableCollectionColors: string[] = [];

  // Advanced Search
  showSearchHelp = false;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  selectedContentType: string = '';
  availableTags: Tag[] = [];
  selectedTags: string[] = [];
  showAdvancedFilters = false;

  // Saved Searches
  savedSearches: Array<{
    name: string;
    query: string;
    filters: {
      topics?: string[];
      tags?: string[];
      contentType?: string;
      dateFrom?: number;
      dateTo?: number;
    };
  }> = [];
  showSavedSearches = false;
  private readonly SAVED_SEARCHES_KEY = 'md-reader-saved-searches';

  // Document Editing
  isEditMode = false;
  editedContent = '';
  isSaving = false;
  hasUnsavedChanges = false;
  lastSavedAt: Date | null = null;
  private saveTimeout: any = null;
  private readonly AUTO_SAVE_DELAY = 2000; // 2 seconds

  // Editor Preview Modes: 'editor' = editor only, 'split' = side-by-side, 'preview' = preview only
  previewMode: 'editor' | 'split' | 'preview' = 'editor';
  private searchSubject = new Subject<string>();
  private highlightsApplied = false;

  // Find & Replace
  showFindReplace = false;
  showReplace = false;
  findText = '';
  replaceText = '';
  currentMatchIndex = 0;
  totalMatches = 0;
  private findMatches: number[] = [];

  // Keyboard Shortcuts Dialog
  showKeyboardShortcutsDialog = false;

  constructor(
    private searchService: SearchService,
    private annotationService: AnnotationService,
    private collectionService: CollectionService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Load stats
    this.searchService.getStats().subscribe(stats => {
      this.totalDocuments = stats.totalDocuments;
      this.totalWords = stats.totalWords;
    });

    // Load topics for filtering
    this.searchService.getTopics().subscribe(topics => {
      this.availableTopics = topics.slice(0, 20); // Top 20 topics
    });

    // Load tags for filtering
    this.searchService.getTags().subscribe(tags => {
      this.availableTags = tags.slice(0, 20); // Top 20 tags
    });

    // Load search history
    this.loadSearchHistory();

    // Load saved searches
    this.loadSavedSearches();

    // Load favorites and recent documents
    this.loadFavorites();
    this.loadRecentDocuments();

    // Load available collection colors
    this.availableCollectionColors = this.collectionService.getAvailableColors();

    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.performSearch(query);
      });
  }

  ngAfterViewChecked() {
    // Add IDs to headings for TOC navigation
    if (this.selectedDocument && this.documentContent) {
      this.addIdsToHeadings();
    }

    // Apply highlights after the markdown content is rendered
    if (this.selectedDocument && this.annotations.length > 0 && !this.highlightsApplied) {
      setTimeout(() => this.applyHighlights(), 100);
    }
  }

  ngAfterViewInit() {
    // CodeMirror will be initialized when edit mode is activated
    // This ensures the container exists before we try to attach the editor
  }

  ngOnDestroy() {
    // Clear any pending save timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }

  onSearchInput(query: string) {
    this.searchQuery = query;
    if (query.trim().length > 0) {
      this.searchSubject.next(query);
    } else {
      this.searchResults = [];
      this.hasSearched = false;
    }
  }

  performSearch(query: string) {
    if (query.trim().length === 0) return;

    this.isSearching = true;
    this.hasSearched = true;
    this.showSearchHistory = false;

    const searchOptions: any = {};

    // Add topic filters
    if (this.selectedTopics.length > 0) {
      searchOptions.topics = this.selectedTopics;
    }

    // Add tag filters
    if (this.selectedTags.length > 0) {
      searchOptions.tags = this.selectedTags;
    }

    // Add content type filter
    if (this.selectedContentType) {
      searchOptions.contentType = this.selectedContentType;
    }

    // Add date range filters
    if (this.dateFrom) {
      searchOptions.dateFrom = this.dateFrom.getTime();
    }
    if (this.dateTo) {
      searchOptions.dateTo = this.dateTo.getTime();
    }

    this.searchService.search(query, searchOptions).subscribe({
      next: (response) => {
        this.searchResults = response.results;
        this.loadCollectionsForResults();
        this.isSearching = false;
        this.addToSearchHistory(query);
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
      }
    });
  }

  toggleTopic(topic: string) {
    const index = this.selectedTopics.indexOf(topic);
    if (index >= 0) {
      this.selectedTopics.splice(index, 1);
    } else {
      this.selectedTopics.push(topic);
    }

    // Re-run search if we have a query
    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  clearFilters() {
    this.selectedTopics = [];
    this.selectedTags = [];
    this.selectedContentType = '';
    this.dateFrom = null;
    this.dateTo = null;
    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }

    // Re-run search if we have a query
    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  onDateFilterChange() {
    // Re-run search when date filter changes
    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  onContentTypeChange() {
    // Re-run search when content type changes
    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  hasActiveFilters(): boolean {
    return this.selectedTopics.length > 0 ||
           this.selectedTags.length > 0 ||
           this.selectedContentType !== '' ||
           this.dateFrom !== null ||
           this.dateTo !== null;
  }

  isTopicSelected(topic: string): boolean {
    return this.selectedTopics.includes(topic);
  }

  openDocument(result: SearchResult) {
    this.searchService.getDocument(result.path).subscribe({
      next: (doc) => {
        this.selectedDocument = doc;
        this.documentToc = this.generateToc(doc.rawContent);
        this.isFullscreen = false;
        this.showToc = true;

        // Track recent view
        this.addToRecentDocuments({
          path: doc.path,
          title: doc.title,
          viewedAt: Date.now(),
          topics: doc.topics || []
        });

        // Find related documents based on shared topics
        this.findRelatedDocuments(doc.topics || []);

        // Load annotations for this document
        this.loadAnnotations(doc.path);
      },
      error: (error) => {
        console.error('Error loading document:', error);
      }
    });
  }

  closeDocument() {
    this.selectedDocument = null;
    this.documentToc = [];
    this.isFullscreen = false;
    this.copySuccess = false;
    this.annotations = [];
    this.showAnnotationDialog = false;
    this.highlightsApplied = false;
  }

  // Document viewer methods
  generateToc(markdown: string): TocItem[] {
    const toc: TocItem[] = [];
    const lines = markdown.split('\n');
    const headerRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach(line => {
      const match = line.match(headerRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        toc.push({ level, text, id });
      }
    });

    return toc;
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }

  toggleToc() {
    this.showToc = !this.showToc;
  }

  cyclePreviewMode() {
    const modes: ('editor' | 'split' | 'preview')[] = ['editor', 'split', 'preview'];
    const currentIndex = modes.indexOf(this.previewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.previewMode = modes[nextIndex];
  }

  async copyMarkdown() {
    if (this.selectedDocument?.rawContent) {
      try {
        await navigator.clipboard.writeText(this.selectedDocument.rawContent);
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy markdown:', error);
      }
    }
  }

  scrollToSection(id: string) {
    // First, ensure IDs are added to headings
    this.addIdsToHeadings();

    // Find the element by ID
    const element = document.getElementById(id);
    if (element && this.documentContent) {
      // Scroll within the document content container
      const container = this.documentContent.nativeElement;
      const elementTop = element.offsetTop;

      // Smooth scroll to the element with offset for header
      container.scrollTo({
        top: elementTop - 80, // 80px offset for header/spacing
        behavior: 'smooth'
      });
    }
  }

  // Add IDs to rendered headings for TOC navigation
  addIdsToHeadings() {
    if (!this.documentContent) return;

    const contentElement = this.documentContent.nativeElement;
    const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading: Element) => {
      const text = heading.textContent || '';
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      if (id && !heading.id) {
        heading.id = id;
      }
    });
  }

  printDocument() {
    window.print();
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  // Upload methods
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer?.files) {
      const mdFiles = Array.from(event.dataTransfer.files).filter(
        file => file.name.endsWith('.md')
      );
      if (mdFiles.length > 0) {
        this.uploadFiles(mdFiles);
      }
    }
  }

  uploadFiles(files: File[]) {
    this.isUploading = true;
    this.uploadProgress = [];

    if (files.length === 1) {
      const file = files[0];
      this.uploadProgress.push(`Uploading ${file.name}...`);

      this.searchService.uploadFile(file).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${file.name} uploaded successfully`);
          this.isUploading = false;
          this.refreshDocuments();
          setTimeout(() => this.showUploadDialog = false, 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading ${file.name}: ${error.error?.error || error.message}`);
          this.isUploading = false;
        }
      });
    } else {
      this.uploadProgress.push(`Uploading ${files.length} files...`);

      this.searchService.uploadMultipleFiles(files).subscribe({
        next: (response) => {
          this.uploadProgress.push(`✓ ${files.length} files uploaded successfully`);
          this.isUploading = false;
          this.refreshDocuments();
          setTimeout(() => this.showUploadDialog = false, 2000);
        },
        error: (error) => {
          this.uploadProgress.push(`✗ Error uploading files: ${error.error?.error || error.message}`);
          this.isUploading = false;
        }
      });
    }
  }

  refreshDocuments() {
    this.searchService.getStats().subscribe(stats => {
      this.totalDocuments = stats.totalDocuments;
      this.totalWords = stats.totalWords;
    });

    this.searchService.getTopics().subscribe(topics => {
      this.availableTopics = topics.slice(0, 20);
    });

    if (this.searchQuery.trim().length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  closeUploadDialog() {
    this.showUploadDialog = false;
    this.uploadProgress = [];
  }

  // Settings methods
  openSettingsDialog() {
    this.showSettingsDialog = true;
    this.settingsMessage = '';
    this.settingsError = '';
    this.loadConfig();
  }

  loadConfig() {
    this.searchService.getConfig().subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.newWatchDirectory = config.watchDirectory;
      },
      error: (error) => {
        console.error('Error loading config:', error);
        this.settingsError = 'Failed to load configuration';
      }
    });
  }

  updateWatchDirectory() {
    if (!this.newWatchDirectory || this.newWatchDirectory.trim().length === 0) {
      this.settingsError = 'Please enter a valid directory path';
      return;
    }

    this.isUpdatingSettings = true;
    this.settingsError = '';
    this.settingsMessage = '';

    this.searchService.updateWatchDirectory(this.newWatchDirectory).subscribe({
      next: (response) => {
        this.settingsMessage = 'Watch directory updated successfully! Re-indexing...';
        this.currentConfig = response.config;
        this.isUpdatingSettings = false;
        this.refreshDocuments();
        setTimeout(() => {
          this.settingsMessage = 'Configuration saved and documents re-indexed!';
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating watch directory:', error);
        this.settingsError = error.error?.error || 'Failed to update watch directory';
        this.isUpdatingSettings = false;
      }
    });
  }

  closeSettingsDialog() {
    this.showSettingsDialog = false;
    this.settingsMessage = '';
    this.settingsError = '';
  }

  // Search History methods
  loadSearchHistory() {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    if (stored) {
      try {
        this.searchHistory = JSON.parse(stored);
      } catch (e) {
        this.searchHistory = [];
      }
    }
  }

  addToSearchHistory(query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);

    // Add to beginning
    this.searchHistory.unshift(trimmedQuery);

    // Limit to MAX_HISTORY_ITEMS
    if (this.searchHistory.length > this.MAX_HISTORY_ITEMS) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_ITEMS);
    }

    // Save to localStorage
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.searchHistory));
  }

  useSearchHistory(query: string) {
    this.searchQuery = query;
    this.showSearchHistory = false;
    this.performSearch(query);
  }

  clearSearchHistory() {
    this.searchHistory = [];
    localStorage.removeItem(this.HISTORY_KEY);
    this.showSearchHistory = false;
  }

  // Saved Searches
  loadSavedSearches() {
    const stored = localStorage.getItem(this.SAVED_SEARCHES_KEY);
    if (stored) {
      try {
        this.savedSearches = JSON.parse(stored);
      } catch (e) {
        this.savedSearches = [];
      }
    }
  }

  saveCurrentSearch(name: string) {
    if (!name || !this.searchQuery) return;

    const search = {
      name: name.trim(),
      query: this.searchQuery,
      filters: {
        topics: this.selectedTopics.length > 0 ? this.selectedTopics : undefined,
        tags: this.selectedTags.length > 0 ? this.selectedTags : undefined,
        contentType: this.selectedContentType || undefined,
        dateFrom: this.dateFrom ? this.dateFrom.getTime() : undefined,
        dateTo: this.dateTo ? this.dateTo.getTime() : undefined
      }
    };

    // Check if search with same name exists
    const existingIndex = this.savedSearches.findIndex(s => s.name === name.trim());
    if (existingIndex >= 0) {
      this.savedSearches[existingIndex] = search;
    } else {
      this.savedSearches.push(search);
    }

    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(this.savedSearches));
  }

  applySavedSearch(search: any) {
    this.searchQuery = search.query;
    this.selectedTopics = search.filters.topics || [];
    this.selectedTags = search.filters.tags || [];
    this.selectedContentType = search.filters.contentType || '';
    this.dateFrom = search.filters.dateFrom ? new Date(search.filters.dateFrom) : null;
    this.dateTo = search.filters.dateTo ? new Date(search.filters.dateTo) : null;
    this.showSavedSearches = false;
    this.performSearch(search.query);
  }

  deleteSavedSearch(index: number) {
    this.savedSearches.splice(index, 1);
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(this.savedSearches));
  }

  promptAndSaveSearch() {
    const name = window.prompt('Enter a name for this search:');
    if (name) {
      this.saveCurrentSearch(name);
    }
  }

  onSearchFocus() {
    if (this.searchHistory.length > 0 && !this.searchQuery) {
      this.showSearchHistory = true;
    }
  }

  onSearchBlur() {
    // Delay to allow click on history items
    setTimeout(() => {
      this.showSearchHistory = false;
    }, 200);
  }

  // Favorites methods
  loadFavorites() {
    const stored = localStorage.getItem(this.FAVORITES_KEY);
    if (stored) {
      try {
        this.favorites = JSON.parse(stored);
      } catch (e) {
        this.favorites = [];
      }
    }
  }

  toggleFavorite(path: string) {
    const index = this.favorites.indexOf(path);
    if (index >= 0) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(path);
    }
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(this.favorites));
  }

  isFavorite(path: string): boolean {
    return this.favorites.includes(path);
  }

  // Recent documents methods
  loadRecentDocuments() {
    const stored = localStorage.getItem(this.RECENT_KEY);
    if (stored) {
      try {
        this.recentDocuments = JSON.parse(stored);
      } catch (e) {
        this.recentDocuments = [];
      }
    }
  }

  addToRecentDocuments(doc: RecentDoc) {
    // Remove if already exists
    this.recentDocuments = this.recentDocuments.filter(d => d.path !== doc.path);

    // Add to beginning
    this.recentDocuments.unshift(doc);

    // Limit to MAX_RECENT_ITEMS
    if (this.recentDocuments.length > this.MAX_RECENT_ITEMS) {
      this.recentDocuments = this.recentDocuments.slice(0, this.MAX_RECENT_ITEMS);
    }

    // Save to localStorage
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(this.recentDocuments));
  }

  clearRecentDocuments() {
    this.recentDocuments = [];
    localStorage.removeItem(this.RECENT_KEY);
    this.showRecent = false;
  }

  openRecentDocument(doc: RecentDoc) {
    // Create a SearchResult-like object to reuse openDocument
    this.searchService.getDocument(doc.path).subscribe({
      next: (fullDoc) => {
        this.selectedDocument = fullDoc;
        this.documentToc = this.generateToc(fullDoc.rawContent);
        this.isFullscreen = false;
        this.showToc = true;
        this.addToRecentDocuments({
          path: fullDoc.path,
          title: fullDoc.title,
          viewedAt: Date.now(),
          topics: fullDoc.topics || []
        });
        this.findRelatedDocuments(fullDoc.topics || []);
      },
      error: (error) => {
        console.error('Error loading document:', error);
      }
    });
  }

  // Related documents
  findRelatedDocuments(currentTopics: string[]) {
    if (currentTopics.length === 0 || !this.searchResults || this.searchResults.length === 0) {
      this.relatedDocuments = [];
      return;
    }

    // Score documents by number of shared topics
    const scoredDocs = this.searchResults
      .filter(doc => doc.path !== this.selectedDocument?.path)
      .map(doc => {
        const sharedTopics = doc.topics.filter(t => currentTopics.includes(t));
        return {
          doc,
          score: sharedTopics.length
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.doc);

    this.relatedDocuments = scoredDocs;
  }

  // Index page methods
  toggleIndex() {
    this.showIndex = !this.showIndex;
    if (this.showIndex && this.allDocuments.length === 0) {
      this.loadAllDocuments();
    }
  }

  loadAllDocuments() {
    this.searchService.getAllDocuments(1000, 0).subscribe({
      next: (response) => {
        this.allDocuments = response.documents;
        this.groupDocumentsByLetter();
      },
      error: (error) => {
        console.error('Error loading all documents:', error);
      }
    });
  }

  groupDocumentsByLetter() {
    this.groupedDocuments = {};
    this.alphabetSections = [];

    // Group documents by first letter of title
    this.allDocuments.forEach(doc => {
      const firstLetter = doc.title.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

      if (!this.groupedDocuments[letter]) {
        this.groupedDocuments[letter] = [];
      }
      this.groupedDocuments[letter].push(doc);
    });

    // Sort documents within each group alphabetically
    Object.keys(this.groupedDocuments).forEach(letter => {
      this.groupedDocuments[letter].sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    });

    // Create sorted list of sections (# first, then A-Z)
    this.alphabetSections = Object.keys(this.groupedDocuments).sort((a, b) => {
      if (a === '#') return -1;
      if (b === '#') return 1;
      return a.localeCompare(b);
    });
  }

  openDocumentFromIndex(doc: SearchResult) {
    this.showIndex = false;
    this.openDocument(doc);
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // "/" to focus search
    if (event.key === '/' && !this.isInputFocused(event)) {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }

    // "Escape" to close modals
    if (event.key === 'Escape') {
      if (this.showFindReplace) {
        this.showFindReplace = false;
        this.findText = '';
        this.replaceText = '';
        this.currentMatchIndex = 0;
        this.totalMatches = 0;
        this.findMatches = [];
      } else if (this.showKeyboardShortcutsDialog) {
        this.closeKeyboardShortcuts();
      } else if (this.selectedDocument) {
        this.closeDocument();
      } else if (this.showUploadDialog) {
        this.closeUploadDialog();
      } else if (this.showSettingsDialog) {
        this.closeSettingsDialog();
      } else if (this.showIndex) {
        this.showIndex = false;
      } else if (this.showFilters) {
        this.showFilters = false;
      }
    }

    // Ctrl+F / Cmd+F to open find panel
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.toggleFindReplace(false);
    }

    // Ctrl+H / Cmd+H to open find & replace panel
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
      event.preventDefault();
      this.toggleFindReplace(true);
    }
  }

  private isInputFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  }

  // Annotation methods
  loadAnnotations(documentPath: string) {
    this.highlightsApplied = false;
    this.annotationService.getAnnotations(documentPath).subscribe({
      next: (response) => {
        this.annotations = response.annotations;
        this.highlightsApplied = false;
      },
      error: (error) => {
        console.error('Error loading annotations:', error);
        this.annotations = [];
      }
    });
  }

  applyHighlights() {
    if (!this.documentContent || !this.selectedDocument || this.annotations.length === 0) {
      return;
    }

    const contentElement = this.documentContent.nativeElement;
    const markdownElement = contentElement.querySelector('markdown');

    if (!markdownElement) {
      return;
    }

    // Sort annotations by start offset (descending) to apply from end to start
    const sortedAnnotations = [...this.annotations].sort((a, b) => b.startOffset - a.startOffset);

    // Apply highlights to the text content
    this.highlightTextInElement(markdownElement, sortedAnnotations);
    this.highlightsApplied = true;
  }

  private highlightTextInElement(element: Element, annotations: Annotation[]) {
    // Get all text nodes
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Build a map of character positions to text nodes
    let charOffset = 0;
    const nodeMap: { node: Text, start: number, end: number }[] = [];

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      // Skip empty nodes and code blocks
      const parent = textNode.parentElement;
      if (text.trim().length === 0 || parent?.tagName === 'CODE' || parent?.tagName === 'PRE') {
        continue;
      }

      nodeMap.push({
        node: textNode,
        start: charOffset,
        end: charOffset + text.length
      });
      charOffset += text.length;
    }

    // Apply annotations
    for (const annotation of annotations) {
      for (const nodeInfo of nodeMap) {
        // Check if this annotation overlaps with this text node
        if (annotation.endOffset <= nodeInfo.start || annotation.startOffset >= nodeInfo.end) {
          continue; // No overlap
        }

        // Calculate the overlap
        const overlapStart = Math.max(annotation.startOffset, nodeInfo.start);
        const overlapEnd = Math.min(annotation.endOffset, nodeInfo.end);

        // Calculate positions within the text node
        const nodeStart = overlapStart - nodeInfo.start;
        const nodeEnd = overlapEnd - nodeInfo.start;

        const text = nodeInfo.node.textContent || '';

        // Split the text node and wrap the overlapping part
        if (nodeStart >= 0 && nodeEnd <= text.length && nodeStart < nodeEnd) {
          const before = text.substring(0, nodeStart);
          const highlighted = text.substring(nodeStart, nodeEnd);
          const after = text.substring(nodeEnd);

          const span = document.createElement('span');
          span.className = 'annotation-highlight';
          span.style.backgroundColor = this.getColorStyle(annotation.color);
          span.style.cursor = 'pointer';
          span.title = annotation.note || 'Click to view annotation';
          span.textContent = highlighted;

          // Add click handler to show annotation details
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editAnnotation(annotation);
          });

          const parent = nodeInfo.node.parentNode;
          if (parent) {
            if (before) {
              parent.insertBefore(document.createTextNode(before), nodeInfo.node);
            }
            parent.insertBefore(span, nodeInfo.node);
            if (after) {
              parent.insertBefore(document.createTextNode(after), nodeInfo.node);
            }
            parent.removeChild(nodeInfo.node);
          }
        }
      }
    }
  }

  onTextSelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);

      // Get the text content of the document
      const documentText = this.selectedDocument.rawContent;

      // Find the start and end offsets in the raw content
      // This is a simplified approach - in production you'd want more robust offset calculation
      const startOffset = documentText.indexOf(selectedText);

      if (startOffset !== -1) {
        this.selectedText = selectedText;
        this.selectionRange = {
          start: startOffset,
          end: startOffset + selectedText.length
        };
        this.currentAnnotation = {
          color: 'yellow',
          note: '',
          selectedText: selectedText,
          startOffset: startOffset,
          endOffset: startOffset + selectedText.length
        };
        this.showAnnotationDialog = true;
        this.editingAnnotation = null;
      }
    }
  }

  saveAnnotation() {
    if (!this.selectedDocument || !this.selectionRange) return;

    const annotation = {
      id: this.editingAnnotation?.id || this.generateAnnotationId(),
      documentPath: this.selectedDocument.path,
      selectedText: this.selectedText,
      note: this.currentAnnotation.note || '',
      color: this.currentAnnotation.color || 'yellow',
      startOffset: this.selectionRange.start,
      endOffset: this.selectionRange.end
    };

    if (this.editingAnnotation) {
      // Update existing annotation
      this.annotationService.updateAnnotation(annotation.id, {
        note: annotation.note,
        color: annotation.color
      }).subscribe({
        next: () => {
          this.loadAnnotations(this.selectedDocument.path);
          this.closeAnnotationDialog();
        },
        error: (error) => {
          console.error('Error updating annotation:', error);
        }
      });
    } else {
      // Create new annotation
      this.annotationService.createAnnotation(annotation).subscribe({
        next: () => {
          this.highlightsApplied = false;
          this.loadAnnotations(this.selectedDocument.path);
          this.closeAnnotationDialog();
        },
        error: (error) => {
          console.error('Error creating annotation:', error);
        }
      });
    }
  }

  editAnnotation(annotation: Annotation) {
    this.editingAnnotation = annotation;
    this.currentAnnotation = {
      note: annotation.note,
      color: annotation.color,
      selectedText: annotation.selectedText
    };
    this.selectedText = annotation.selectedText;
    this.selectionRange = {
      start: annotation.startOffset,
      end: annotation.endOffset
    };
    this.showAnnotationDialog = true;
  }

  deleteAnnotation(annotation: Annotation) {
    if (confirm('Are you sure you want to delete this annotation?')) {
      this.annotationService.deleteAnnotation(annotation.id).subscribe({
        next: () => {
          this.highlightsApplied = false;
          this.loadAnnotations(this.selectedDocument.path);
        },
        error: (error) => {
          console.error('Error deleting annotation:', error);
        }
      });
    }
  }

  closeAnnotationDialog() {
    this.showAnnotationDialog = false;
    this.selectedText = '';
    this.selectionRange = null;
    this.currentAnnotation = { color: 'yellow', note: '' };
    this.editingAnnotation = null;

    // Clear text selection
    window.getSelection()?.removeAllRanges();
  }

  private generateAnnotationId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getColorStyle(colorName: string): string {
    const color = this.availableColors.find(c => c.value === colorName);
    return color ? color.color : '#fef3c7';
  }

  // Export methods
  exportAnnotationsAsJSON() {
    if (this.annotations.length === 0) {
      alert('No annotations to export');
      return;
    }

    const exportData = {
      document: {
        title: this.selectedDocument?.title,
        path: this.selectedDocument?.path
      },
      annotations: this.annotations.map(a => ({
        id: a.id,
        selectedText: a.selectedText,
        note: a.note,
        color: a.color,
        startOffset: a.startOffset,
        endOffset: a.endOffset,
        createdAt: new Date(a.createdAt).toISOString(),
        updatedAt: new Date(a.updatedAt).toISOString()
      })),
      exportedAt: new Date().toISOString()
    };

    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      `annotations-${this.selectedDocument?.title || 'document'}.json`,
      'application/json'
    );
  }

  exportAnnotationsAsCSV() {
    if (this.annotations.length === 0) {
      alert('No annotations to export');
      return;
    }

    const headers = ['ID', 'Selected Text', 'Note', 'Color', 'Start Offset', 'End Offset', 'Created At', 'Updated At'];
    const rows = this.annotations.map(a => [
      a.id,
      `"${a.selectedText.replace(/"/g, '""')}"`,
      `"${(a.note || '').replace(/"/g, '""')}"`,
      a.color,
      a.startOffset.toString(),
      a.endOffset.toString(),
      new Date(a.createdAt).toISOString(),
      new Date(a.updatedAt).toISOString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    this.downloadFile(
      csv,
      `annotations-${this.selectedDocument?.title || 'document'}.csv`,
      'text/csv'
    );
  }

  exportSearchResults(format: 'json' | 'csv') {
    if (this.searchResults.length === 0) {
      alert('No search results to export');
      return;
    }

    if (format === 'json') {
      const exportData = {
        query: this.searchQuery,
        totalResults: this.searchResults.length,
        results: this.searchResults.map(r => ({
          title: r.title,
          path: r.path,
          wordCount: r.wordCount,
          topics: r.topics,
          tags: r.tags,
          contentType: r.contentType,
          modifiedAt: new Date(r.modifiedAt).toISOString(),
          snippet: r.snippet
        })),
        exportedAt: new Date().toISOString()
      };

      this.downloadFile(
        JSON.stringify(exportData, null, 2),
        `search-results-${this.searchQuery}.json`,
        'application/json'
      );
    } else {
      const headers = ['Title', 'Path', 'Word Count', 'Topics', 'Tags', 'Content Type', 'Modified At'];
      const rows = this.searchResults.map(r => [
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.path.replace(/"/g, '""')}"`,
        r.wordCount.toString(),
        `"${r.topics.join(', ')}"`,
        `"${r.tags.join(', ')}"`,
        r.contentType,
        new Date(r.modifiedAt).toISOString()
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      this.downloadFile(
        csv,
        `search-results-${this.searchQuery}.csv`,
        'text/csv'
      );
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Document Editing Methods
  toggleEditMode() {
    if (this.isEditMode && this.hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to exit edit mode?')) {
        return;
      }
    }

    this.isEditMode = !this.isEditMode;

    if (this.isEditMode) {
      // Enter edit mode - load raw content
      this.editedContent = this.selectedDocument?.rawContent || '';
      this.hasUnsavedChanges = false;
    } else {
      // Exit edit mode - clear save timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
    }
  }

  onContentChange() {
    this.hasUnsavedChanges = true;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout for auto-save
    this.saveTimeout = setTimeout(() => {
      this.saveDocument();
    }, this.AUTO_SAVE_DELAY);
  }

  saveDocument() {
    if (!this.selectedDocument || !this.hasUnsavedChanges) {
      return;
    }

    this.isSaving = true;

    this.searchService.saveDocument(this.selectedDocument.path, this.editedContent).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.hasUnsavedChanges = false;
        this.lastSavedAt = new Date();

        // Update the selected document's raw content
        this.selectedDocument.rawContent = this.editedContent;

        // Re-render the markdown content (update content property)
        this.selectedDocument.content = this.editedContent;

        console.log('Document saved successfully');
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Error saving document:', error);
        alert('Failed to save document: ' + (error.error?.error || error.message));
      }
    });
  }

  discardChanges() {
    if (confirm('Are you sure you want to discard all changes?')) {
      this.editedContent = this.selectedDocument?.rawContent || '';
      this.hasUnsavedChanges = false;

      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
    }
  }

  insertMarkdown(type: string) {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = '';

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'heading':
        newText = `## ${selectedText || 'Heading'}`;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        break;
      case 'list':
        newText = `- ${selectedText || 'list item'}`;
        break;
      case 'strikethrough':
        newText = `~~${selectedText || 'strikethrough text'}~~`;
        break;
      case 'blockquote':
        newText = `> ${selectedText || 'blockquote'}`;
        break;
      case 'table':
        newText = `| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |`;
        break;
      case 'image':
        newText = `![${selectedText || 'alt text'}](image-url)`;
        break;
      case 'hr':
        newText = `\n---\n`;
        break;
      case 'task':
        newText = `- [ ] ${selectedText || 'task item'}`;
        break;
    }

    // Use execCommand for proper undo/redo support
    textarea.focus();
    textarea.setSelectionRange(start, end);
    document.execCommand('insertText', false, newText);
  }

  // Find & Replace Methods
  toggleFindReplace(withReplace: boolean = false) {
    this.showFindReplace = !this.showFindReplace;
    this.showReplace = withReplace;

    if (this.showFindReplace) {
      // Focus find input after view updates
      setTimeout(() => {
        if (this.findInput) {
          this.findInput.nativeElement.focus();
        }
      }, 100);
    } else {
      // Reset find/replace state
      this.findText = '';
      this.replaceText = '';
      this.currentMatchIndex = 0;
      this.totalMatches = 0;
      this.findMatches = [];
    }
  }

  findNext() {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      let index = 0;
      while ((index = content.indexOf(searchText, index)) !== -1) {
        this.findMatches.push(index);
        index++;
      }
      this.totalMatches = this.findMatches.length;
    }

    if (this.findMatches.length === 0) {
      this.totalMatches = 0;
      this.currentMatchIndex = 0;
      return;
    }

    // Move to next match
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.findMatches.length;
    const matchPos = this.findMatches[this.currentMatchIndex];

    // Select the match
    textarea.focus();
    textarea.setSelectionRange(matchPos, matchPos + this.findText.length);
    textarea.scrollTop = textarea.scrollHeight * (matchPos / content.length);
  }

  findPrevious() {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      let index = 0;
      while ((index = content.indexOf(searchText, index)) !== -1) {
        this.findMatches.push(index);
        index++;
      }
      this.totalMatches = this.findMatches.length;
    }

    if (this.findMatches.length === 0) {
      this.totalMatches = 0;
      this.currentMatchIndex = 0;
      return;
    }

    // Move to previous match
    this.currentMatchIndex = this.currentMatchIndex === 0
      ? this.findMatches.length - 1
      : this.currentMatchIndex - 1;
    const matchPos = this.findMatches[this.currentMatchIndex];

    // Select the match
    textarea.focus();
    textarea.setSelectionRange(matchPos, matchPos + this.findText.length);
    textarea.scrollTop = textarea.scrollHeight * (matchPos / content.length);
  }

  replaceNext() {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    // Check if current selection matches find text
    if (selectedText.toLowerCase() === this.findText.toLowerCase()) {
      // Replace current selection
      textarea.setSelectionRange(start, end);
      document.execCommand('insertText', false, this.replaceText);

      // Reset matches to force recalculation
      this.findMatches = [];
    }

    // Find next occurrence
    this.findNext();
  }

  replaceAll() {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Use regex for case-insensitive global replace
    const regex = new RegExp(this.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = textarea.value.replace(regex, this.replaceText);

    // Replace entire content
    textarea.value = newContent;
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);

    // Reset find state
    this.findMatches = [];
    this.currentMatchIndex = 0;
    this.totalMatches = 0;
  }

  // Keyboard Shortcuts Dialog Methods
  showKeyboardShortcuts() {
    this.showKeyboardShortcutsDialog = true;
  }

  closeKeyboardShortcuts() {
    this.showKeyboardShortcutsDialog = false;
  }

  // Collection Methods
  onCreateCollection() {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '500px',
      data: {
        mode: 'create',
        availableColors: this.availableCollectionColors
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Create the collection
        this.collectionService.createCollection(result).subscribe({
          next: (response) => {
            console.log('Collection created:', response);
            // Refresh the sidebar
            if (this.collectionsSidebar) {
              this.collectionsSidebar.refresh();
            }
          },
          error: (error) => {
            console.error('Error creating collection:', error);
            alert('Failed to create collection: ' + (error.error?.error || error.message));
          }
        });
      }
    });
  }

  onEditCollection(collection: Collection) {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '500px',
      data: {
        mode: 'edit',
        collection: collection,
        availableColors: this.availableCollectionColors
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the collection
        this.collectionService.updateCollection(collection.id, result).subscribe({
          next: (response) => {
            console.log('Collection updated:', response);
            // Refresh the sidebar
            if (this.collectionsSidebar) {
              this.collectionsSidebar.refresh();
            }
          },
          error: (error) => {
            console.error('Error updating collection:', error);
            alert('Failed to update collection: ' + (error.error?.error || error.message));
          }
        });
      }
    });
  }

  onDeleteCollection(collection: Collection) {
    const confirmMessage = `Are you sure you want to delete the collection "${collection.name}"? This will not delete the documents, only the collection.`;
    if (confirm(confirmMessage)) {
      this.collectionService.deleteCollection(collection.id).subscribe({
        next: () => {
          console.log('Collection deleted');
          // Clear selection if this was the selected collection
          if (this.selectedCollection?.id === collection.id) {
            this.selectedCollection = null;
          }
          // Refresh the sidebar
          if (this.collectionsSidebar) {
            this.collectionsSidebar.refresh();
          }
        },
        error: (error) => {
          console.error('Error deleting collection:', error);
          alert('Failed to delete collection: ' + (error.error?.error || error.message));
        }
      });
    }
  }

  onCollectionSelected(collection: Collection | null) {
    this.selectedCollection = collection;
    console.log('Selected collection:', collection);

    // Filter search results by selected collection
    if (collection && this.hasSearched) {
      this.filterSearchResultsByCollection(collection.id);
    } else if (!collection && this.hasSearched) {
      // Re-run search without collection filter
      this.performSearch(this.searchQuery);
    }
  }

  openDocumentCollectionsDialog(document: SearchResult) {
    const dialogRef = this.dialog.open(DocumentCollectionsDialogComponent, {
      width: '500px',
      data: {
        documentPath: document.path,
        documentTitle: document.title
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Collections were changed, refresh the sidebar
        if (this.collectionsSidebar) {
          this.collectionsSidebar.refresh();
        }
      }
    });
  }

  loadCollectionsForResults() {
    // Load collections for each search result
    this.searchResults.forEach(result => {
      this.collectionService.getDocumentCollections(result.path).subscribe({
        next: (response) => {
          result.collections = response.collections;
        },
        error: (error) => {
          console.error('Error loading collections for document:', error);
          result.collections = [];
        }
      });
    });
  }

  filterSearchResultsByCollection(collectionId: string) {
    // Get documents in the selected collection
    this.collectionService.getCollectionDocuments(collectionId).subscribe({
      next: (response) => {
        const collectionDocPaths = new Set(response.documents.map(d => d.path));
        // Filter current search results to only show documents in the collection
        this.searchResults = this.searchResults.filter(result =>
          collectionDocPaths.has(result.path)
        );
      },
      error: (error) => {
        console.error('Error filtering by collection:', error);
      }
    });
  }
}
