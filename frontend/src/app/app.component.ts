import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
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
import { SearchEngineService, SearchResult, Topic, Tag } from './services/search-engine.service';
import { UserPreferencesEngineService, SavedSearch, RecentDoc } from './services/user-preferences-engine.service';
import { AnnotationEngineService, Annotation } from './services/annotation-engine.service';
import { CollectionEngineService, Collection } from './services/collection-engine.service';
import { ApplicationStateService, TocItem, SearchResultWithCollections } from './services/application-state.service';
import { EditorEngineService } from './services/editor-engine.service';
import { ApplicationManagerService } from './services/application-manager.service';
import { DocumentEngineService } from './services/document-engine.service';
import { KeyboardShortcutsService, KeyboardShortcutHandlers } from './services/keyboard-shortcuts.service';
import { ApplicationStateInitializerService, AppStateCallbacks } from './services/application-state-initializer.service';
import { CollectionsSidebarComponent } from './components/collections-sidebar/collections-sidebar.component';
import { CollectionDialogComponent } from './components/collection-dialog/collection-dialog.component';
import { DocumentCollectionsDialogComponent } from './components/document-collections-dialog/document-collections-dialog.component';
import { SearchHelpPanelComponent } from './components/search-help-panel/search-help-panel.component';
import { SearchHistoryDropdownComponent } from './components/search-history-dropdown/search-history-dropdown.component';
import { WelcomeMessageComponent } from './components/welcome-message/welcome-message.component';
import { KeyboardShortcutsDialogComponent } from './components/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';
import { FavoritesPanelComponent } from './components/favorites-panel/favorites-panel.component';
import { RecentDocumentsPanelComponent } from './components/recent-documents-panel/recent-documents-panel.component';
import { SavedSearchesPanelComponent } from './components/saved-searches-panel/saved-searches-panel.component';
import { DocumentIndexComponent } from './components/document-index/document-index.component';
import { SearchResultCardComponent } from './components/search-result-card/search-result-card.component';
import { AnnotationsSectionComponent } from './components/annotations-section/annotations-section.component';
import { SearchFiltersContainerComponent } from './components/search-filters-container/search-filters-container.component';
import { DocumentToolbarComponent } from './components/document-toolbar/document-toolbar.component';
import { AnnotationDialogComponent } from './components/annotation-dialog/annotation-dialog.component';
import { UploadDialogComponent } from './components/upload-dialog/upload-dialog.component';
import { SettingsDialogComponent } from './components/settings-dialog/settings-dialog.component';
import { MarkdownEditorComponent } from './components/markdown-editor/markdown-editor.component';
import { AppToolbarComponent } from './components/app-toolbar/app-toolbar.component';
import { CollectionsPanelComponent } from './components/collections-panel/collections-panel.component';
import { TableOfContentsComponent } from './components/table-of-contents/table-of-contents.component';
import { RelatedDocumentsComponent } from './components/related-documents/related-documents.component';
import { SearchResultsHeaderComponent } from './components/search-results-header/search-results-header.component';
import { NoResultsMessageComponent } from './components/no-results-message/no-results-message.component';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
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
    CollectionsSidebarComponent,
    SearchHelpPanelComponent,
    SearchHistoryDropdownComponent,
    WelcomeMessageComponent,
    KeyboardShortcutsDialogComponent,
    FavoritesPanelComponent,
    RecentDocumentsPanelComponent,
    SavedSearchesPanelComponent,
    DocumentIndexComponent,
    SearchResultCardComponent,
    AnnotationsSectionComponent,
    SearchFiltersContainerComponent,
    DocumentToolbarComponent,
    AnnotationDialogComponent,
    UploadDialogComponent,
    SettingsDialogComponent,
    MarkdownEditorComponent,
    AppToolbarComponent,
    CollectionsPanelComponent,
    TableOfContentsComponent,
    RelatedDocumentsComponent,
    SearchResultsHeaderComponent,
    NoResultsMessageComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  title = 'Markdown Reader';
  totalDocuments = 0;
  totalWords = 0;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('documentContent') documentContent!: ElementRef;
  @ViewChild('findInput') findInput!: ElementRef;
  @ViewChild(CollectionsSidebarComponent) collectionsSidebar!: CollectionsSidebarComponent;

  // Search History

  // Collections
  availableCollectionColors: string[] = [];

  constructor(
    public searchEngine: SearchEngineService,
    public userPrefs: UserPreferencesEngineService,
    public annotationEngine: AnnotationEngineService,
    public collectionEngine: CollectionEngineService,
    public appState: ApplicationStateService,
    public editorEngine: EditorEngineService,
    private dialog: MatDialog,
    public appManager: ApplicationManagerService,
    public documentEngine: DocumentEngineService,
    public keyboardShortcuts: KeyboardShortcutsService,
    private appStateInitializer: ApplicationStateInitializerService
  ) {}

  ngOnInit() {
    const callbacks: AppStateCallbacks = {
      onStatsLoaded: (totalDocuments, totalWords) => {
        this.totalDocuments = totalDocuments;
        this.totalWords = totalWords;
      },
      onCollectionColorsLoaded: (colors) => {
        this.availableCollectionColors = colors;
      },
      onPerformSearch: (query) => this.performSearch(query),
      onLoadCollectionsForResults: () => this.loadCollectionsForResults()
    };

    this.appStateInitializer.initialize(callbacks);
  }

  ngAfterViewChecked() {
    // Add IDs to headings for TOC navigation
    if (this.appState.selectedDocument && this.documentContent) {
      this.addIdsToHeadings();
    }

    // Apply highlights after the markdown content is rendered
    if (this.appState.selectedDocument && this.appState.annotations.length > 0 && !this.appState.highlightsApplied) {
      setTimeout(() => this.applyHighlights(), 100);
    }
  }

  ngAfterViewInit() {
    // CodeMirror will be initialized when edit mode is activated
    // This ensures the container exists before we try to attach the editor

    // Register collections sidebar
    if (this.collectionsSidebar) {
      this.collectionEngine.registerSidebar(this.collectionsSidebar);
    }

    // Register find input
    if (this.findInput) {
      this.userPrefs.registerFindInput(this.findInput);
    }
  }

  ngOnDestroy() {
  }

  onSearchInput(query: string) {
    this.searchEngine.onSearchInput(query);
  }

  performSearch(query: string) {
    this.searchEngine.performSearch(
      query,
      () => this.loadCollectionsForResults(),
      (q) => this.userPrefs.addToHistory(q)
    );
  }

  toggleTopic(topic: string) {
    this.searchEngine.toggleTopic(topic);
  }

  clearFilters() {
    this.searchEngine.clearFilters();
  }

  toggleTag(tag: string) {
    this.searchEngine.toggleTag(tag);
  }

  isTagSelected(tag: string): boolean {
    return this.searchEngine.isTagSelected(tag);
  }

  onDateFilterChange() {
    this.searchEngine.onDateFilterChange();
  }

  onContentTypeChange() {
    this.searchEngine.onContentTypeChange();
  }

  hasActiveFilters(): boolean {
    return this.searchEngine.hasActiveFilters();
  }

  isTopicSelected(topic: string): boolean {
    return this.searchEngine.isTopicSelected(topic);
  }

  openDocument(result: SearchResult) {
    this.documentEngine.openDocument(result, (doc) => this.addToRecentDocuments(doc), (topics) => this.findRelatedDocuments(topics), (path) => this.loadAnnotations(path));
  }

  closeDocument() {
    this.documentEngine.closeDocument();
  }

  // Document viewer methods
  generateToc(markdown: string): TocItem[] {
    return this.documentEngine.generateToc(markdown);
  }

  toggleFullscreen() {
    this.documentEngine.toggleFullscreen();
  }

  toggleToc() {
    this.documentEngine.toggleToc();
  }

  cyclePreviewMode() {
    this.editorEngine.cyclePreviewMode();
  }

  async copyMarkdown() {
    await this.documentEngine.copyMarkdown(this.appState.selectedDocument?.rawContent);
  }

  scrollToSection(id: string) {
    this.documentEngine.scrollToSection(id, this.documentContent);
  }

  // Add IDs to rendered headings for TOC navigation
  addIdsToHeadings() {
    this.documentEngine.addIdsToHeadings(this.documentContent);
  }

  printDocument() {
    this.documentEngine.printDocument();
  }

  formatDate(timestamp: number): string {
    return this.documentEngine.formatDate(timestamp);
  }

  // Upload methods
  onFileSelected(event: Event) {
    this.appManager.onFileSelected(event);
  }

  onDragOver(event: DragEvent) {
    this.appManager.onDragOver(event);
  }

  onDragLeave(event: DragEvent) {
    this.appManager.onDragLeave(event);
  }

  onDrop(event: DragEvent) {
    this.appManager.onDrop(event);
  }

  uploadFiles(files: File[]) {
    this.appManager.uploadFiles(files, () => this.refreshDocuments());
  }

  refreshDocuments() {
    const callbacks: AppStateCallbacks = {
      onStatsLoaded: (totalDocuments, totalWords) => {
        this.totalDocuments = totalDocuments;
        this.totalWords = totalWords;
      },
      onCollectionColorsLoaded: (colors) => {
        this.availableCollectionColors = colors;
      },
      onPerformSearch: (query) => this.performSearch(query),
      onLoadCollectionsForResults: () => this.loadCollectionsForResults()
    };

    this.appStateInitializer.refresh(callbacks);
  }

  closeUploadDialog() {
    this.appManager.closeUploadDialog();
  }

  // Settings methods
  openSettingsDialog() {
    this.appManager.openSettingsDialog();
  }

  loadConfig() {
    this.appManager.loadConfig();
  }

  updateWatchDirectory() {
    this.appManager.updateWatchDirectory(() => this.refreshDocuments());
  }

  closeSettingsDialog() {
    this.appManager.closeSettingsDialog();
  }

  // Search History methods
  addToSearchHistory(query: string) {
    this.userPrefs.addToHistory(query);
  }

  useSearchHistory(query: string) {
    this.userPrefs.useFromHistory(query, (q) => this.performSearch(q));
  }

  clearSearchHistory() {
    this.userPrefs.clearHistory();
  }

  // Saved Searches
  saveCurrentSearch(name: string) {
    this.userPrefs.saveCurrentSearch(name, this.searchEngine.selectedContentType);
  }

  applySavedSearch(search: any) {
    this.userPrefs.applySavedSearch(
      search,
      (q) => this.performSearch(q),
      (type) => this.searchEngine.selectedContentType = type
    );
  }

  deleteSavedSearch(index: number) {
    this.userPrefs.deleteSavedSearch(index);
  }

  promptAndSaveSearch() {
    this.userPrefs.promptAndSaveCurrentSearch(this.searchEngine.selectedContentType);
  }

  onSearchFocus() {
    this.userPrefs.onSearchFocus();
  }

  onSearchBlur() {
    this.userPrefs.onSearchBlur();
  }

  // Favorites methods
  toggleFavorite(path: string) {
    this.userPrefs.toggleFavorite(path);
  }

  isFavorite(path: string): boolean {
    return this.userPrefs.isFavorite(path);
  }

  openFavoriteDocument(path: string) {
    const result = this.appState.searchResults.find(r => r.path === path);
    if (result) {
      this.openDocument(result);
    }
  }

  // Recent documents methods
  addToRecentDocuments(doc: RecentDoc) {
    this.userPrefs.addRecent(doc);
  }

  clearRecentDocuments() {
    this.userPrefs.clearRecent();
    this.appState.setState('showRecent', false);
  }

  openRecentDocument(doc: RecentDoc) {
    this.documentEngine.openRecentDocument(doc, (d) => this.addToRecentDocuments(d), (topics) => this.findRelatedDocuments(topics));
  }

  // Related documents
  findRelatedDocuments(currentTopics: string[]) {
    this.appManager.findRelatedDocuments(currentTopics);
  }

  // Index page methods
  toggleIndex() {
    this.documentEngine.toggleIndex();
  }

  loadAllDocuments() {
    this.documentEngine.loadAllDocuments();
  }

  groupDocumentsByLetter() {
    this.documentEngine.groupDocumentsByLetter();
  }

  openDocumentFromIndex(doc: SearchResult) {
    this.documentEngine.openDocumentFromIndex(doc, (d) => this.openDocument(d));
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.keyboardShortcuts.handleKeyboardEvent(event, {
      onFocusSearch: () => this.searchInput?.nativeElement.focus(),
      onCloseDocument: () => this.closeDocument(),
      onCloseUploadDialog: () => this.closeUploadDialog(),
      onCloseSettingsDialog: () => this.closeSettingsDialog(),
      onToggleFindReplace: (withReplace) => this.toggleFindReplace(withReplace)
    });
  }

  // Annotation methods
  loadAnnotations(documentPath: string) {
    this.annotationEngine.loadAnnotations(documentPath);
  }

  applyHighlights() {
    this.annotationEngine.applyHighlights(this.documentContent, this.editAnnotation.bind(this));
  }

  onTextSelection() {
    this.annotationEngine.onTextSelection();
  }

  saveAnnotation() {
    this.annotationEngine.saveAnnotation(() => {});
  }

  editAnnotation(annotation: Annotation) {
    this.annotationEngine.editAnnotation(annotation);
  }

  deleteAnnotation(annotation: Annotation) {
    this.annotationEngine.deleteAnnotationWithConfirm(annotation);
  }

  closeAnnotationDialog() {
    this.annotationEngine.closeAnnotationDialog();
  }

  // Export methods
  exportAnnotationsAsJSON() {
    this.appManager.exportAnnotationsAsJSON(
      this.appState.annotations,
      this.appState.selectedDocument?.title,
      this.appState.selectedDocument?.path
    );
  }

  exportAnnotationsAsCSV() {
    this.appManager.exportAnnotationsAsCSV(
      this.appState.annotations,
      this.appState.selectedDocument?.title
    );
  }

  exportSearchResults(format: 'json' | 'csv') {
    this.appManager.exportSearchResults(
      this.appState.searchResults,
      this.appState.searchQuery,
      format
    );
  }

  // Document Editing Methods
  toggleEditMode() {
    this.editorEngine.toggleEditMode();
  }

  onContentChange() {
    this.editorEngine.onContentChange();
  }

  saveDocument() {
    this.editorEngine.saveDocument();
  }

  discardChanges() {
    this.editorEngine.discardChanges();
  }

  insertMarkdown(type: string) {
    this.editorEngine.insertMarkdown(type);
  }

  // Find & Replace Methods
  toggleFindReplace(withReplace: boolean = false) {
    this.userPrefs.toggleFindReplace(withReplace);
  }

  findNext() {
    this.userPrefs.findNext();
  }

  findPrevious() {
    this.userPrefs.findPrevious();
  }

  replaceNext() {
    this.userPrefs.replaceNext();
  }

  replaceAll() {
    this.userPrefs.replaceAll();
  }

  // Keyboard Shortcuts Dialog Methods
  showKeyboardShortcuts() {
    this.keyboardShortcuts.showKeyboardShortcuts();
  }

  closeKeyboardShortcuts() {
    this.keyboardShortcuts.closeKeyboardShortcuts();
  }

  // Collection Methods
  onCreateCollection() {
    this.collectionEngine.createCollectionDialog();
  }

  onEditCollection(collection: Collection) {
    this.collectionEngine.editCollectionDialog(collection);
  }

  onDeleteCollection(collection: Collection) {
    this.collectionEngine.deleteCollectionWithConfirm(collection);
  }

  onCollectionSelected(collection: Collection | null) {
    this.collectionEngine.selectCollection(collection, this.searchEngine.hasSearched);
  }

  openDocumentCollectionsDialog(document: SearchResult) {
    this.collectionEngine.openDocumentCollectionsDialog(document);
  }

  loadCollectionsForResults() {
    this.collectionEngine.loadCollectionsForResults();
  }

  filterSearchResultsByCollection(collectionId: string) {
    this.collectionEngine.filterSearchResultsByCollection(collectionId);
  }
}
