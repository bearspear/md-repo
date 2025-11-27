import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApplicationStateService } from './application-state.service';

// Re-export types for backward compatibility
export interface RecentDoc {
  path: string;
  title: string;
  viewedAt: number;
  topics: string[];
}

export interface SavedSearch {
  name: string;
  query: string;
  filters: {
    topics?: string[];
    tags?: string[];
    contentType?: string;
    dateFrom?: number;
    dateTo?: number;
  };
}

/**
 * Unified User Preferences Engine Service
 * Consolidates: FavoritesService, RecentDocumentsService, SearchPersistenceService, FindReplaceService
 * Manages all user preferences including favorites, recent documents, search history/saved searches, and find/replace
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesEngineService {
  // ============================================
  // Favorites
  // ============================================
  private readonly FAVORITES_KEY = 'md-reader-favorites';
  private favoritesSubject = new BehaviorSubject<string[]>([]);
  public favorites$: Observable<string[]> = this.favoritesSubject.asObservable();

  // ============================================
  // Recent Documents
  // ============================================
  private readonly RECENT_KEY = 'md-reader-recent';
  private readonly MAX_RECENT_ITEMS = 20;
  private recentSubject = new BehaviorSubject<RecentDoc[]>([]);
  public recent$: Observable<RecentDoc[]> = this.recentSubject.asObservable();

  // ============================================
  // Search Persistence
  // ============================================
  private readonly HISTORY_KEY = 'md-reader-search-history';
  private readonly SAVED_SEARCHES_KEY = 'md-reader-saved-searches';
  private readonly MAX_HISTORY_ITEMS = 10;
  private historySubject = new BehaviorSubject<string[]>([]);
  public history$: Observable<string[]> = this.historySubject.asObservable();
  private savedSearches: SavedSearch[] = [];

  // ============================================
  // Find/Replace
  // ============================================
  findText = '';
  replaceText = '';
  currentMatchIndex = 0;
  totalMatches = 0;
  private findMatches: number[] = [];
  private findInputRef: ElementRef | null = null;

  constructor(
    private appState: ApplicationStateService
  ) {
    this.loadFavorites();
    this.loadRecentDocuments();
    this.loadHistory();
    this.loadSavedSearches();
  }

  // ============================================
  // FAVORITES METHODS
  // ============================================

  /**
   * Load favorites from localStorage
   */
  private loadFavorites(): void {
    const stored = localStorage.getItem(this.FAVORITES_KEY);
    if (stored) {
      try {
        const favorites = JSON.parse(stored);
        this.favoritesSubject.next(favorites);
      } catch (e) {
        this.favoritesSubject.next([]);
      }
    }
  }

  /**
   * Get current favorites synchronously
   */
  getFavorites(): string[] {
    return this.favoritesSubject.value;
  }

  /**
   * Toggle a document path in favorites
   */
  toggleFavorite(path: string): void {
    const favorites = [...this.favoritesSubject.value];
    const index = favorites.indexOf(path);

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(path);
    }

    this.saveFavorites(favorites);
  }

  /**
   * Check if a path is favorited
   */
  isFavorite(path: string): boolean {
    return this.favoritesSubject.value.includes(path);
  }

  /**
   * Add a path to favorites
   */
  addFavorite(path: string): void {
    if (!this.isFavorite(path)) {
      const favorites = [...this.favoritesSubject.value, path];
      this.saveFavorites(favorites);
    }
  }

  /**
   * Remove a path from favorites
   */
  removeFavorite(path: string): void {
    const favorites = this.favoritesSubject.value.filter(p => p !== path);
    this.saveFavorites(favorites);
  }

  /**
   * Clear all favorites
   */
  clearFavorites(): void {
    this.saveFavorites([]);
  }

  /**
   * Save favorites to localStorage and update observable
   */
  private saveFavorites(favorites: string[]): void {
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    this.favoritesSubject.next(favorites);
  }

  // ============================================
  // RECENT DOCUMENTS METHODS
  // ============================================

  /**
   * Load recent documents from localStorage
   */
  private loadRecentDocuments(): void {
    const stored = localStorage.getItem(this.RECENT_KEY);
    if (stored) {
      try {
        const recent = JSON.parse(stored);
        this.recentSubject.next(recent);
      } catch (e) {
        this.recentSubject.next([]);
      }
    }
  }

  /**
   * Get current recent documents synchronously
   */
  getRecent(): RecentDoc[] {
    return this.recentSubject.value;
  }

  /**
   * Add a document to recent documents
   */
  addRecent(doc: RecentDoc): void {
    let recent = [...this.recentSubject.value];

    // Remove if already exists
    recent = recent.filter(d => d.path !== doc.path);

    // Add to beginning
    recent.unshift(doc);

    // Limit to MAX_RECENT_ITEMS
    if (recent.length > this.MAX_RECENT_ITEMS) {
      recent = recent.slice(0, this.MAX_RECENT_ITEMS);
    }

    this.saveRecent(recent);
  }

  /**
   * Clear all recent documents
   */
  clearRecent(): void {
    localStorage.removeItem(this.RECENT_KEY);
    this.recentSubject.next([]);
  }

  /**
   * Save recent documents to localStorage and update observable
   */
  private saveRecent(recent: RecentDoc[]): void {
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(recent));
    this.recentSubject.next(recent);
  }

  // ============================================
  // SEARCH HISTORY METHODS
  // ============================================

  /**
   * Load search history from localStorage
   */
  private loadHistory(): void {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    if (stored) {
      try {
        const history = JSON.parse(stored);
        this.historySubject.next(history);
      } catch (e) {
        this.historySubject.next([]);
      }
    }
  }

  /**
   * Get current search history synchronously
   */
  getHistory(): string[] {
    return this.historySubject.value;
  }

  /**
   * Add a query to search history
   */
  addToHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    let history = [...this.historySubject.value];

    // Remove if already exists
    history = history.filter(q => q !== trimmedQuery);

    // Add to beginning
    history.unshift(trimmedQuery);

    // Limit to MAX_HISTORY_ITEMS
    if (history.length > this.MAX_HISTORY_ITEMS) {
      history = history.slice(0, this.MAX_HISTORY_ITEMS);
    }

    this.saveHistory(history);
  }

  /**
   * Clear all search history
   */
  clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
    this.historySubject.next([]);
    this.appState.setState('showSearchHistory', false);
  }

  /**
   * Save history to localStorage and update observable
   */
  private saveHistory(history: string[]): void {
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    this.historySubject.next(history);
  }

  /**
   * Use a search from history
   */
  useFromHistory(query: string, onSearch: (query: string) => void): void {
    this.appState.setSearchQuery(query);
    this.appState.setState('showSearchHistory', false);
    onSearch(query);
  }

  /**
   * Handle search input focus - show history if available
   */
  onSearchFocus(): void {
    if (this.getHistory().length > 0 && !this.appState.searchQuery) {
      this.appState.setState('showSearchHistory', true);
    }
  }

  /**
   * Handle search input blur with delay for history item clicks
   */
  onSearchBlur(): void {
    setTimeout(() => {
      this.appState.setState('showSearchHistory', false);
    }, 200);
  }

  // ============================================
  // SAVED SEARCHES METHODS
  // ============================================

  /**
   * Load saved searches from localStorage
   */
  private loadSavedSearches(): void {
    const stored = localStorage.getItem(this.SAVED_SEARCHES_KEY);
    if (stored) {
      try {
        this.savedSearches = JSON.parse(stored);
      } catch (e) {
        this.savedSearches = [];
      }
    }
  }

  /**
   * Get all saved searches
   */
  getSavedSearches(): SavedSearch[] {
    return this.savedSearches;
  }

  /**
   * Save a new search or update existing one
   */
  saveSearch(search: SavedSearch): void {
    if (!search.name || !search.query) return;

    // Check if search with same name exists
    const existingIndex = this.savedSearches.findIndex(s => s.name === search.name);
    if (existingIndex >= 0) {
      this.savedSearches[existingIndex] = search;
    } else {
      this.savedSearches.push(search);
    }

    this.persistSavedSearches();
  }

  /**
   * Delete a saved search by index
   */
  deleteSavedSearch(index: number): void {
    this.savedSearches.splice(index, 1);
    this.persistSavedSearches();
  }

  /**
   * Persist saved searches to localStorage
   */
  private persistSavedSearches(): void {
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(this.savedSearches));
  }

  /**
   * Prompt user for search name and return it
   */
  promptForSearchName(): string | null {
    return window.prompt('Enter a name for this search:');
  }

  /**
   * Save the current search with all active filters
   */
  saveCurrentSearch(name: string, selectedContentType: string = ''): void {
    const dateOptions = this.appState.getSearchOptions();
    const search: SavedSearch = {
      name: name.trim(),
      query: this.appState.searchQuery,
      filters: {
        topics: this.appState.selectedTopics.length > 0 ? this.appState.selectedTopics : undefined,
        tags: this.appState.selectedTags.length > 0 ? this.appState.selectedTags : undefined,
        contentType: selectedContentType || undefined,
        dateFrom: dateOptions.dateFrom,
        dateTo: dateOptions.dateTo
      }
    };
    this.saveSearch(search);
  }

  /**
   * Apply a saved search and execute it
   */
  applySavedSearch(
    search: SavedSearch,
    onSearch: (query: string) => void,
    setContentType: (type: string) => void
  ): void {
    this.appState.applySearch(search.query, search.filters);
    setContentType(search.filters.contentType || '');
    this.appState.setState('showSavedSearches', false);
    onSearch(search.query);
  }

  /**
   * Prompt for search name and save current search
   */
  promptAndSaveCurrentSearch(selectedContentType: string = ''): void {
    const name = this.promptForSearchName();
    if (name) {
      this.saveCurrentSearch(name, selectedContentType);
    }
  }

  // ============================================
  // FIND/REPLACE METHODS
  // ============================================

  /**
   * Register the find input element reference for auto-focus
   */
  registerFindInput(input: ElementRef): void {
    this.findInputRef = input;
  }

  /**
   * Toggle find/replace panel visibility
   */
  toggleFindReplace(withReplace: boolean = false): void {
    this.appState.toggle('showFindReplace');
    this.appState.setState('showReplace', withReplace);

    if (this.appState.showFindReplace) {
      // Focus find input after view updates
      setTimeout(() => {
        if (this.findInputRef) {
          this.findInputRef.nativeElement.focus();
        }
      }, 100);
    } else {
      // Reset find/replace state
      this.resetFindReplace();
    }
  }

  /**
   * Find next occurrence
   */
  findNext(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      this.buildMatches(content, searchText);
    }

    if (this.findMatches.length === 0) {
      this.totalMatches = 0;
      this.currentMatchIndex = 0;
      return;
    }

    // Move to next match
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.findMatches.length;
    this.selectMatch(textarea, content);
  }

  /**
   * Find previous occurrence
   */
  findPrevious(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      this.buildMatches(content, searchText);
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
    this.selectMatch(textarea, content);
  }

  /**
   * Replace current match and find next
   */
  replaceNext(): void {
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

  /**
   * Replace all occurrences
   */
  replaceAll(): void {
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
    this.resetFindReplace();
  }

  /**
   * Reset find/replace state
   */
  private resetFindReplace(): void {
    this.findText = '';
    this.replaceText = '';
    this.currentMatchIndex = 0;
    this.totalMatches = 0;
    this.findMatches = [];
  }

  /**
   * Build array of all match positions
   */
  private buildMatches(content: string, searchText: string): void {
    this.findMatches = [];
    let index = 0;
    while ((index = content.indexOf(searchText, index)) !== -1) {
      this.findMatches.push(index);
      index++;
    }
    this.totalMatches = this.findMatches.length;
  }

  /**
   * Select and scroll to current match
   */
  private selectMatch(textarea: HTMLTextAreaElement, content: string): void {
    const matchPos = this.findMatches[this.currentMatchIndex];
    textarea.focus();
    textarea.setSelectionRange(matchPos, matchPos + this.findText.length);
    textarea.scrollTop = textarea.scrollHeight * (matchPos / content.length);
  }
}
