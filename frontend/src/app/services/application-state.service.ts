import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchResult, Topic, Tag } from './search-engine.service';
import { Collection } from './collection-engine.service';
import { Annotation } from './annotation-engine.service';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SearchResultWithCollections extends SearchResult {
  collections?: Collection[];
}

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

export interface AnnotationColor {
  name: string;
  value: string;
  color: string;
}

// ============================================
// UI STATE
// ============================================

export interface UIState {
  // Search & Navigation
  isSearching: boolean;
  showSearchHistory: boolean;
  showSearchHelp: boolean;
  showAdvancedFilters: boolean;
  showFilters: boolean;
  showSavedSearches: boolean;
  showIndex: boolean;

  // Document View
  isFullscreen: boolean;
  showToc: boolean;
  showFindReplace: boolean;
  showReplace: boolean;
  isEditMode: boolean;
  isSaving: boolean;

  // Panels & Sidebars
  showFavorites: boolean;
  showRecent: boolean;
  showCollections: boolean;

  // Dialogs
  showAnnotationDialog: boolean;
  showUploadDialog: boolean;
  showSettingsDialog: boolean;
  showCollectionDialog: boolean;
  showKeyboardShortcutsDialog: boolean;

  // Loading States
  isUploading: boolean;
  isUpdatingSettings: boolean;
}

// ============================================
// SEARCH STATE
// ============================================

export interface SearchState {
  searchQuery: string;
  searchResults: SearchResultWithCollections[];
  availableTopics: Topic[];
  selectedTopics: string[];
  availableTags: Tag[];
  selectedTags: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
}

// ============================================
// DOCUMENT STATE
// ============================================

export interface DocumentState {
  selectedDocument: any | null;
  documentToc: TocItem[];
  relatedDocuments: SearchResult[];
  annotations: Annotation[];
  editedContent: string;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
}

// ============================================
// ANNOTATION STATE
// ============================================

export interface AnnotationState {
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  currentAnnotation: Partial<Annotation>;
  editingAnnotation: Annotation | null;
  highlightsApplied: boolean;
}

// ============================================
// COMBINED APPLICATION STATE
// ============================================

export interface ApplicationState {
  ui: UIState;
  search: SearchState;
  document: DocumentState;
  annotation: AnnotationState;
}

/**
 * Unified Application State Service
 * Consolidates: UIStateService, SearchStateService, DocumentStateService, AnnotationStateService
 * Manages all application state in a single, cohesive service
 */
@Injectable({
  providedIn: 'root'
})
export class ApplicationStateService {

  // ============================================
  // ANNOTATION COLOR CONSTANTS
  // ============================================

  public readonly availableColors: AnnotationColor[] = [
    { name: 'Yellow', value: 'yellow', color: '#fef3c7' },
    { name: 'Green', value: 'green', color: '#d1fae5' },
    { name: 'Blue', value: 'blue', color: '#dbeafe' },
    { name: 'Pink', value: 'pink', color: '#fce7f3' },
    { name: 'Purple', value: 'purple', color: '#e9d5ff' }
  ];

  // ============================================
  // INITIAL STATE
  // ============================================

  private readonly initialState: ApplicationState = {
    ui: {
      // Search & Navigation
      isSearching: false,
      showSearchHistory: false,
      showSearchHelp: false,
      showAdvancedFilters: false,
      showFilters: false,
      showSavedSearches: false,
      showIndex: false,

      // Document View
      isFullscreen: false,
      showToc: true,
      showFindReplace: false,
      showReplace: false,
      isEditMode: false,
      isSaving: false,

      // Panels & Sidebars
      showFavorites: false,
      showRecent: false,
      showCollections: false,

      // Dialogs
      showAnnotationDialog: false,
      showUploadDialog: false,
      showSettingsDialog: false,
      showCollectionDialog: false,
      showKeyboardShortcutsDialog: false,

      // Loading States
      isUploading: false,
      isUpdatingSettings: false,
    },
    search: {
      searchQuery: '',
      searchResults: [],
      availableTopics: [],
      selectedTopics: [],
      availableTags: [],
      selectedTags: [],
      dateFrom: null,
      dateTo: null
    },
    document: {
      selectedDocument: null,
      documentToc: [],
      relatedDocuments: [],
      annotations: [],
      editedContent: '',
      hasUnsavedChanges: false,
      lastSavedAt: null
    },
    annotation: {
      selectedText: '',
      selectionRange: null,
      currentAnnotation: { color: 'yellow', note: '' },
      editingAnnotation: null,
      highlightsApplied: false
    }
  };

  private stateSubject = new BehaviorSubject<ApplicationState>(this.initialState);
  public state$: Observable<ApplicationState> = this.stateSubject.asObservable();

  constructor() {}

  // ============================================
  // GENERIC STATE METHODS
  // ============================================

  /**
   * Get current application state synchronously
   */
  getState(): ApplicationState {
    return this.stateSubject.value;
  }

  /**
   * Update state immutably
   */
  private updateState(updates: Partial<ApplicationState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...updates
    });
  }

  /**
   * Reset all state to initial values
   */
  resetAll(): void {
    this.stateSubject.next(this.initialState);
  }

  // ============================================
  // UI STATE METHODS
  // ============================================

  /**
   * Get current UI state
   */
  getUIState(): UIState {
    return this.getState().ui;
  }

  /**
   * Update a single UI state property
   */
  setUIState<K extends keyof UIState>(key: K, value: UIState[K]): void {
    const currentState = this.getState();
    this.updateState({
      ui: {
        ...currentState.ui,
        [key]: value
      }
    });
  }

  /**
   * Update multiple UI state properties at once
   */
  setMultipleUIStates(updates: Partial<UIState>): void {
    const currentState = this.getState();
    this.updateState({
      ui: {
        ...currentState.ui,
        ...updates
      }
    });
  }

  /**
   * Toggle a boolean UI state property
   */
  toggleUI<K extends keyof UIState>(key: K): void {
    const currentValue = this.getUIState()[key];
    if (typeof currentValue === 'boolean') {
      this.setUIState(key, !currentValue as UIState[K]);
    }
  }

  /**
   * Close all panels (favorites, recent, collections)
   */
  closeAllPanels(): void {
    this.setMultipleUIStates({
      showFavorites: false,
      showRecent: false,
      showCollections: false,
      showIndex: false
    });
  }

  /**
   * Close all dialogs
   */
  closeAllDialogs(): void {
    this.setMultipleUIStates({
      showAnnotationDialog: false,
      showUploadDialog: false,
      showSettingsDialog: false,
      showCollectionDialog: false,
      showKeyboardShortcutsDialog: false
    });
  }

  /**
   * Reset UI state to initial values
   */
  resetUIState(): void {
    this.updateState({ ui: this.initialState.ui });
  }

  // UI State convenience getters
  get isSearching(): boolean { return this.getUIState().isSearching; }
  get showSearchHistory(): boolean { return this.getUIState().showSearchHistory; }
  get showSearchHelp(): boolean { return this.getUIState().showSearchHelp; }
  get showAdvancedFilters(): boolean { return this.getUIState().showAdvancedFilters; }
  get showFilters(): boolean { return this.getUIState().showFilters; }
  get showSavedSearches(): boolean { return this.getUIState().showSavedSearches; }
  get showIndex(): boolean { return this.getUIState().showIndex; }
  get isFullscreen(): boolean { return this.getUIState().isFullscreen; }
  get showToc(): boolean { return this.getUIState().showToc; }
  get showFindReplace(): boolean { return this.getUIState().showFindReplace; }
  get showReplace(): boolean { return this.getUIState().showReplace; }
  get isEditMode(): boolean { return this.getUIState().isEditMode; }
  get isSaving(): boolean { return this.getUIState().isSaving; }
  get showFavorites(): boolean { return this.getUIState().showFavorites; }
  get showRecent(): boolean { return this.getUIState().showRecent; }
  get showCollections(): boolean { return this.getUIState().showCollections; }
  get showAnnotationDialog(): boolean { return this.getUIState().showAnnotationDialog; }
  get showUploadDialog(): boolean { return this.getUIState().showUploadDialog; }
  get showSettingsDialog(): boolean { return this.getUIState().showSettingsDialog; }
  get showCollectionDialog(): boolean { return this.getUIState().showCollectionDialog; }
  get showKeyboardShortcutsDialog(): boolean { return this.getUIState().showKeyboardShortcutsDialog; }
  get isUploading(): boolean { return this.getUIState().isUploading; }
  get isUpdatingSettings(): boolean { return this.getUIState().isUpdatingSettings; }

  // ============================================
  // SEARCH STATE METHODS
  // ============================================

  /**
   * Get current search state
   */
  getSearchState(): SearchState {
    return this.getState().search;
  }

  /**
   * Update a single search state property
   */
  setSearchState<K extends keyof SearchState>(key: K, value: SearchState[K]): void {
    const currentState = this.getState();
    this.updateState({
      search: {
        ...currentState.search,
        [key]: value
      }
    });
  }

  /**
   * Update multiple search state properties at once
   */
  setMultipleSearchStates(updates: Partial<SearchState>): void {
    const currentState = this.getState();
    this.updateState({
      search: {
        ...currentState.search,
        ...updates
      }
    });
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.setSearchState('searchQuery', query);
  }

  /**
   * Set search results
   */
  setSearchResults(results: SearchResultWithCollections[]): void {
    this.setSearchState('searchResults', results);
  }

  /**
   * Clear search results
   */
  clearSearchResults(): void {
    this.setSearchState('searchResults', []);
  }

  /**
   * Set available topics (top 20)
   */
  setAvailableTopics(topics: Topic[]): void {
    this.setSearchState('availableTopics', topics.slice(0, 20));
  }

  /**
   * Set available tags (top 20)
   */
  setAvailableTags(tags: Tag[]): void {
    this.setSearchState('availableTags', tags.slice(0, 20));
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.setMultipleSearchStates({
      selectedTopics: [],
      selectedTags: [],
      dateFrom: null,
      dateTo: null
    });
  }

  /**
   * Apply search from saved search
   */
  applySearch(query: string, filters: {
    topics?: string[];
    tags?: string[];
    dateFrom?: number;
    dateTo?: number;
  }): void {
    this.setMultipleSearchStates({
      searchQuery: query,
      selectedTopics: filters.topics || [],
      selectedTags: filters.tags || [],
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : null,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : null
    });
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const state = this.getSearchState();
    return state.selectedTopics.length > 0 ||
           state.selectedTags.length > 0 ||
           state.dateFrom !== null ||
           state.dateTo !== null;
  }

  /**
   * Get search options for API call
   */
  getSearchOptions(): {
    dateFrom?: number;
    dateTo?: number;
  } {
    const state = this.getSearchState();
    const options: { dateFrom?: number; dateTo?: number } = {};

    if (state.dateFrom) {
      options.dateFrom = state.dateFrom.getTime();
    }
    if (state.dateTo) {
      options.dateTo = state.dateTo.getTime();
    }

    return options;
  }

  /**
   * Reset search state to initial values
   */
  resetSearchState(): void {
    this.updateState({ search: this.initialState.search });
  }

  // Search State convenience getters
  get searchQuery(): string { return this.getSearchState().searchQuery; }
  get searchResults(): SearchResultWithCollections[] { return this.getSearchState().searchResults; }
  get availableTopics(): Topic[] { return this.getSearchState().availableTopics; }
  get selectedTopics(): string[] { return this.getSearchState().selectedTopics; }
  get availableTags(): Tag[] { return this.getSearchState().availableTags; }
  get selectedTags(): string[] { return this.getSearchState().selectedTags; }
  get dateFrom(): Date | null { return this.getSearchState().dateFrom; }
  get dateTo(): Date | null { return this.getSearchState().dateTo; }

  // ============================================
  // DOCUMENT STATE METHODS
  // ============================================

  /**
   * Get current document state
   */
  getDocumentState(): DocumentState {
    return this.getState().document;
  }

  /**
   * Update a single document state property
   */
  setDocumentState<K extends keyof DocumentState>(key: K, value: DocumentState[K]): void {
    const currentState = this.getState();
    this.updateState({
      document: {
        ...currentState.document,
        [key]: value
      }
    });
  }

  /**
   * Update multiple document state properties at once
   */
  setMultipleDocumentStates(updates: Partial<DocumentState>): void {
    const currentState = this.getState();
    this.updateState({
      document: {
        ...currentState.document,
        ...updates
      }
    });
  }

  /**
   * Set the selected document and optionally update related state
   */
  selectDocument(document: any, toc: TocItem[] = []): void {
    this.setMultipleDocumentStates({
      selectedDocument: document,
      documentToc: toc,
      editedContent: document?.rawContent || '',
      hasUnsavedChanges: false
    });
  }

  /**
   * Clear the selected document and reset related state
   */
  clearDocument(): void {
    this.setMultipleDocumentStates({
      selectedDocument: null,
      documentToc: [],
      editedContent: '',
      hasUnsavedChanges: false,
      lastSavedAt: null,
      annotations: []
    });
  }

  /**
   * Update the edited content and mark as having unsaved changes
   */
  updateEditedContent(content: string): void {
    this.setMultipleDocumentStates({
      editedContent: content,
      hasUnsavedChanges: true
    });
  }

  /**
   * Mark content as saved
   */
  markAsSaved(): void {
    this.setMultipleDocumentStates({
      hasUnsavedChanges: false,
      lastSavedAt: new Date()
    });
  }

  /**
   * Reset editing state to current document content
   */
  resetEditingState(): void {
    const currentState = this.getState();
    this.setMultipleDocumentStates({
      editedContent: currentState.document.selectedDocument?.rawContent || '',
      hasUnsavedChanges: false
    });
  }

  /**
   * Update the document's content after save
   */
  updateDocumentContent(content: string): void {
    const currentState = this.getState();
    if (currentState.document.selectedDocument) {
      const updatedDoc = {
        ...currentState.document.selectedDocument,
        rawContent: content,
        content: content
      };
      this.setDocumentState('selectedDocument', updatedDoc);
    }
  }

  /**
   * Reset document state to initial values
   */
  resetDocumentState(): void {
    this.updateState({ document: this.initialState.document });
  }

  // Document State convenience getters
  get selectedDocument(): any | null { return this.getDocumentState().selectedDocument; }
  get documentToc(): TocItem[] { return this.getDocumentState().documentToc; }
  get relatedDocuments(): SearchResult[] { return this.getDocumentState().relatedDocuments; }
  get annotations(): Annotation[] { return this.getDocumentState().annotations; }
  get editedContent(): string { return this.getDocumentState().editedContent; }
  get hasUnsavedChanges(): boolean { return this.getDocumentState().hasUnsavedChanges; }
  get lastSavedAt(): Date | null { return this.getDocumentState().lastSavedAt; }

  // ============================================
  // ANNOTATION STATE METHODS
  // ============================================

  /**
   * Get current annotation state
   */
  getAnnotationState(): AnnotationState {
    return this.getState().annotation;
  }

  /**
   * Update a single annotation state property
   */
  setAnnotationState<K extends keyof AnnotationState>(key: K, value: AnnotationState[K]): void {
    const currentState = this.getState();
    this.updateState({
      annotation: {
        ...currentState.annotation,
        [key]: value
      }
    });
  }

  /**
   * Update multiple annotation state properties at once
   */
  setMultipleAnnotationStates(updates: Partial<AnnotationState>): void {
    const currentState = this.getState();
    this.updateState({
      annotation: {
        ...currentState.annotation,
        ...updates
      }
    });
  }

  /**
   * Handle text selection and prepare for annotation creation
   */
  handleTextSelection(selectedText: string, documentText: string): boolean {
    if (selectedText.trim().length === 0) return false;

    const startOffset = documentText.indexOf(selectedText);
    if (startOffset === -1) return false;

    this.setMultipleAnnotationStates({
      selectedText: selectedText.trim(),
      selectionRange: {
        start: startOffset,
        end: startOffset + selectedText.length
      },
      currentAnnotation: {
        color: 'yellow',
        note: '',
        selectedText: selectedText.trim(),
        startOffset: startOffset,
        endOffset: startOffset + selectedText.length
      },
      editingAnnotation: null
    });

    return true;
  }

  /**
   * Prepare to edit an existing annotation
   */
  prepareEditAnnotation(annotation: Annotation): void {
    this.setMultipleAnnotationStates({
      editingAnnotation: annotation,
      currentAnnotation: {
        note: annotation.note,
        color: annotation.color,
        selectedText: annotation.selectedText
      },
      selectedText: annotation.selectedText,
      selectionRange: {
        start: annotation.startOffset,
        end: annotation.endOffset
      }
    });
  }

  /**
   * Clear annotation dialog state
   */
  clearAnnotationDialog(): void {
    this.setMultipleAnnotationStates({
      selectedText: '',
      selectionRange: null,
      currentAnnotation: { color: 'yellow', note: '' },
      editingAnnotation: null
    });
  }

  /**
   * Mark highlights as needing to be reapplied
   */
  markHighlightsStale(): void {
    this.setAnnotationState('highlightsApplied', false);
  }

  /**
   * Mark highlights as applied
   */
  markHighlightsApplied(): void {
    this.setAnnotationState('highlightsApplied', true);
  }

  /**
   * Generate a unique annotation ID
   */
  generateAnnotationId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the color style for a color name
   */
  getColorStyle(colorName: string): string {
    const color = this.availableColors.find(c => c.value === colorName);
    return color ? color.color : '#fef3c7';
  }

  /**
   * Reset annotation state to initial values
   */
  resetAnnotationState(): void {
    this.updateState({ annotation: this.initialState.annotation });
  }

  // Annotation State convenience getters
  get selectedText(): string { return this.getAnnotationState().selectedText; }
  get selectionRange(): { start: number; end: number } | null { return this.getAnnotationState().selectionRange; }
  get currentAnnotation(): Partial<Annotation> { return this.getAnnotationState().currentAnnotation; }
  get editingAnnotation(): Annotation | null { return this.getAnnotationState().editingAnnotation; }
  get highlightsApplied(): boolean { return this.getAnnotationState().highlightsApplied; }

  // ============================================
  // LEGACY COMPATIBILITY ALIASES
  // ============================================

  /**
   * @deprecated Use setUIState instead
   */
  setState<K extends keyof UIState>(key: K, value: UIState[K]): void {
    this.setUIState(key, value);
  }

  /**
   * @deprecated Use setMultipleUIStates instead
   */
  setMultipleStates(updates: Partial<UIState>): void {
    this.setMultipleUIStates(updates);
  }

  /**
   * @deprecated Use toggleUI instead
   */
  toggle<K extends keyof UIState>(key: K): void {
    this.toggleUI(key);
  }

  /**
   * @deprecated Use resetUIState instead
   */
  reset(): void {
    this.resetUIState();
  }
}
