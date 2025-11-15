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
import { SearchManagementService } from './services/search-management.service';
import { AnnotationService, Annotation } from './services/annotation.service';
import { AnnotationManagerService } from './services/annotation-manager.service';
import { CollectionService, Collection } from './services/collection.service';
import { FavoritesService } from './services/favorites.service';
import { SearchHistoryService } from './services/search-history.service';
import { SearchHistoryInteractionService } from './services/search-history-interaction.service';
import { RecentDocumentsService, RecentDoc } from './services/recent-documents.service';
import { UIStateService } from './services/ui-state.service';
import { DocumentStateService, TocItem } from './services/document-state.service';
import { SearchStateService, SearchResultWithCollections } from './services/search-state.service';
import { AnnotationStateService } from './services/annotation-state.service';
import { AnnotationHighlightService } from './services/annotation-highlight.service';
import { EditorStateService } from './services/editor-state.service';
import { EditorManagerService } from './services/editor-manager.service';
import { CollectionManagerService } from './services/collection-manager.service';
import { FindReplaceService } from './services/find-replace.service';
import { UploadManagerService } from './services/upload-manager.service';
import { SavedSearchesService, SavedSearch } from './services/saved-searches.service';
import { SavedSearchCoordinatorService } from './services/saved-search-coordinator.service';
import { ExportManagerService } from './services/export-manager.service';
import { SettingsManagerService } from './services/settings-manager.service';
import { RelatedDocumentsManagerService } from './services/related-documents-manager.service';
import { DocumentIndexService } from './services/document-index.service';
import { DocumentNavigationService } from './services/document-navigation.service';
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
    private searchService: SearchService,
    public searchManager: SearchManagementService,
    private annotationService: AnnotationService,
    public annotationManager: AnnotationManagerService,
    private collectionService: CollectionService,
    public favoritesService: FavoritesService,
    public searchHistoryService: SearchHistoryService,
    public searchHistoryInteraction: SearchHistoryInteractionService,
    public recentDocumentsService: RecentDocumentsService,
    public uiState: UIStateService,
    public docState: DocumentStateService,
    public searchState: SearchStateService,
    public annotationState: AnnotationStateService,
    private annotationHighlight: AnnotationHighlightService,
    public editorState: EditorStateService,
    public editorManager: EditorManagerService,
    private dialog: MatDialog,
    public collectionManager: CollectionManagerService,
    public findReplace: FindReplaceService,
    public uploadManager: UploadManagerService,
    public savedSearchesService: SavedSearchesService,
    public savedSearchCoordinator: SavedSearchCoordinatorService,
    public exportManager: ExportManagerService,
    public settingsManager: SettingsManagerService,
    public relatedDocsManager: RelatedDocumentsManagerService,
    public documentIndex: DocumentIndexService,
    public docNav: DocumentNavigationService,
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
    if (this.docState.selectedDocument && this.documentContent) {
      this.addIdsToHeadings();
    }

    // Apply highlights after the markdown content is rendered
    if (this.docState.selectedDocument && this.docState.annotations.length > 0 && !this.annotationState.highlightsApplied) {
      setTimeout(() => this.applyHighlights(), 100);
    }
  }

  ngAfterViewInit() {
    // CodeMirror will be initialized when edit mode is activated
    // This ensures the container exists before we try to attach the editor

    // Register collections sidebar
    if (this.collectionsSidebar) {
      this.collectionManager.registerSidebar(this.collectionsSidebar);
    }

    // Register find input
    if (this.findInput) {
      this.findReplace.registerFindInput(this.findInput);
    }
  }

  ngOnDestroy() {
  }

  onSearchInput(query: string) {
    this.searchManager.onSearchInput(query);
  }

  performSearch(query: string) {
    this.searchManager.performSearch(query, () => this.loadCollectionsForResults());
  }

  toggleTopic(topic: string) {
    this.searchManager.toggleTopic(topic);
  }

  clearFilters() {
    this.searchManager.clearFilters();
  }

  toggleTag(tag: string) {
    this.searchManager.toggleTag(tag);
  }

  isTagSelected(tag: string): boolean {
    return this.searchManager.isTagSelected(tag);
  }

  onDateFilterChange() {
    this.searchManager.onDateFilterChange();
  }

  onContentTypeChange() {
    this.searchManager.onContentTypeChange();
  }

  hasActiveFilters(): boolean {
    return this.searchManager.hasActiveFilters();
  }

  isTopicSelected(topic: string): boolean {
    return this.searchManager.isTopicSelected(topic);
  }

  openDocument(result: SearchResult) {
    this.docNav.openDocument(result, (doc) => this.addToRecentDocuments(doc), (topics) => this.findRelatedDocuments(topics), (path) => this.loadAnnotations(path));
  }

  closeDocument() {
    this.docNav.closeDocument();
  }

  // Document viewer methods
  generateToc(markdown: string): TocItem[] {
    return this.docNav.generateToc(markdown);
  }

  toggleFullscreen() {
    this.docNav.toggleFullscreen();
  }

  toggleToc() {
    this.docNav.toggleToc();
  }

  cyclePreviewMode() {
    this.editorState.cyclePreviewMode();
  }

  async copyMarkdown() {
    await this.docNav.copyMarkdown(this.docState.selectedDocument?.rawContent);
  }

  scrollToSection(id: string) {
    this.docNav.scrollToSection(id, this.documentContent);
  }

  // Add IDs to rendered headings for TOC navigation
  addIdsToHeadings() {
    this.docNav.addIdsToHeadings(this.documentContent);
  }

  printDocument() {
    this.docNav.printDocument();
  }

  formatDate(timestamp: number): string {
    return this.docNav.formatDate(timestamp);
  }

  // Upload methods
  onFileSelected(event: Event) {
    this.uploadManager.onFileSelected(event);
  }

  onDragOver(event: DragEvent) {
    this.uploadManager.onDragOver(event);
  }

  onDragLeave(event: DragEvent) {
    this.uploadManager.onDragLeave(event);
  }

  onDrop(event: DragEvent) {
    this.uploadManager.onDrop(event);
  }

  uploadFiles(files: File[]) {
    this.uploadManager.uploadFiles(files, () => this.refreshDocuments());
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
    this.uploadManager.closeUploadDialog();
  }

  // Settings methods
  openSettingsDialog() {
    this.settingsManager.openSettingsDialog();
  }

  loadConfig() {
    this.settingsManager.loadConfig();
  }

  updateWatchDirectory() {
    this.settingsManager.updateWatchDirectory(() => this.refreshDocuments());
  }

  closeSettingsDialog() {
    this.settingsManager.closeSettingsDialog();
  }

  // Search History methods
  addToSearchHistory(query: string) {
    this.searchHistoryInteraction.addToSearchHistory(query);
  }

  useSearchHistory(query: string) {
    this.searchHistoryInteraction.useSearchHistory(query, (q) => this.performSearch(q));
  }

  clearSearchHistory() {
    this.searchHistoryInteraction.clearSearchHistory();
  }

  // Saved Searches
  saveCurrentSearch(name: string) {
    this.savedSearchCoordinator.saveCurrentSearch(name);
  }

  applySavedSearch(search: any) {
    this.savedSearchCoordinator.applySavedSearch(search, (q) => this.performSearch(q));
  }

  deleteSavedSearch(index: number) {
    this.savedSearchCoordinator.deleteSavedSearch(index);
  }

  promptAndSaveSearch() {
    this.savedSearchCoordinator.promptAndSaveSearch();
  }

  onSearchFocus() {
    this.searchHistoryInteraction.onSearchFocus();
  }

  onSearchBlur() {
    this.searchHistoryInteraction.onSearchBlur();
  }

  // Favorites methods
  toggleFavorite(path: string) {
    this.favoritesService.toggle(path);
  }

  isFavorite(path: string): boolean {
    return this.favoritesService.isFavorite(path);
  }

  openFavoriteDocument(path: string) {
    const result = this.searchState.searchResults.find(r => r.path === path);
    if (result) {
      this.openDocument(result);
    }
  }

  // Recent documents methods
  addToRecentDocuments(doc: RecentDoc) {
    this.recentDocumentsService.add(doc);
  }

  clearRecentDocuments() {
    this.recentDocumentsService.clear();
    this.uiState.setState('showRecent', false);
  }

  openRecentDocument(doc: RecentDoc) {
    this.docNav.openRecentDocument(doc, (d) => this.addToRecentDocuments(d), (topics) => this.findRelatedDocuments(topics));
  }

  // Related documents
  findRelatedDocuments(currentTopics: string[]) {
    this.relatedDocsManager.findRelatedDocuments(currentTopics);
  }

  // Index page methods
  toggleIndex() {
    this.documentIndex.toggleIndex();
  }

  loadAllDocuments() {
    this.documentIndex.loadAllDocuments();
  }

  groupDocumentsByLetter() {
    this.documentIndex.groupDocumentsByLetter();
  }

  openDocumentFromIndex(doc: SearchResult) {
    this.documentIndex.openDocumentFromIndex(doc, (d) => this.openDocument(d));
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
    this.annotationManager.loadAnnotations(documentPath);
  }

  applyHighlights() {
    this.annotationManager.applyHighlights(this.documentContent, this.editAnnotation.bind(this));
  }

  onTextSelection() {
    this.annotationManager.onTextSelection();
  }

  saveAnnotation() {
    this.annotationManager.saveAnnotation(() => {});
  }

  editAnnotation(annotation: Annotation) {
    this.annotationManager.editAnnotation(annotation);
  }

  deleteAnnotation(annotation: Annotation) {
    this.annotationManager.deleteAnnotation(annotation);
  }

  closeAnnotationDialog() {
    this.annotationManager.closeAnnotationDialog();
  }

  // Export methods
  exportAnnotationsAsJSON() {
    this.exportManager.exportAnnotationsAsJSON(
      this.docState.annotations,
      this.docState.selectedDocument?.title,
      this.docState.selectedDocument?.path
    );
  }

  exportAnnotationsAsCSV() {
    this.exportManager.exportAnnotationsAsCSV(
      this.docState.annotations,
      this.docState.selectedDocument?.title
    );
  }

  exportSearchResults(format: 'json' | 'csv') {
    this.exportManager.exportSearchResults(
      this.searchState.searchResults,
      this.searchState.searchQuery,
      format
    );
  }

  // Document Editing Methods
  toggleEditMode() {
    this.editorManager.toggleEditMode();
  }

  onContentChange() {
    this.editorManager.onContentChange();
  }

  saveDocument() {
    this.editorManager.saveDocument();
  }

  discardChanges() {
    this.editorManager.discardChanges();
  }

  insertMarkdown(type: string) {
    this.editorManager.insertMarkdown(type);
  }

  // Find & Replace Methods
  toggleFindReplace(withReplace: boolean = false) {
    this.findReplace.toggle(withReplace);
  }

  findNext() {
    this.findReplace.findNext();
  }

  findPrevious() {
    this.findReplace.findPrevious();
  }

  replaceNext() {
    this.findReplace.replaceNext();
  }

  replaceAll() {
    this.findReplace.replaceAll();
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
    this.collectionManager.createCollection();
  }

  onEditCollection(collection: Collection) {
    this.collectionManager.editCollection(collection);
  }

  onDeleteCollection(collection: Collection) {
    this.collectionManager.deleteCollection(collection);
  }

  onCollectionSelected(collection: Collection | null) {
    this.collectionManager.selectCollection(collection, this.searchManager.hasSearched);
  }

  openDocumentCollectionsDialog(document: SearchResult) {
    this.collectionManager.openDocumentCollectionsDialog(document);
  }

  loadCollectionsForResults() {
    this.collectionManager.loadCollectionsForResults();
  }

  filterSearchResultsByCollection(collectionId: string) {
    this.collectionManager.filterSearchResultsByCollection(collectionId);
  }
}
