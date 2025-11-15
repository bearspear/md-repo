import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchResult, Topic, Tag } from './search.service';
import { Collection } from './collection.service';

export interface SearchResultWithCollections extends SearchResult {
  collections?: Collection[];
}

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

@Injectable({
  providedIn: 'root'
})
export class SearchStateService {
  private readonly initialState: SearchState = {
    searchQuery: '',
    searchResults: [],
    availableTopics: [],
    selectedTopics: [],
    availableTags: [],
    selectedTags: [],
    dateFrom: null,
    dateTo: null
  };

  private stateSubject = new BehaviorSubject<SearchState>(this.initialState);
  public state$: Observable<SearchState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current search state synchronously
   */
  getState(): SearchState {
    return this.stateSubject.value;
  }

  /**
   * Update a single search state property
   */
  setState<K extends keyof SearchState>(key: K, value: SearchState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Update multiple search state properties at once
   */
  setMultipleStates(updates: Partial<SearchState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.setState('searchQuery', query);
  }

  /**
   * Set search results
   */
  setSearchResults(results: SearchResultWithCollections[]): void {
    this.setState('searchResults', results);
  }

  /**
   * Clear search results
   */
  clearSearchResults(): void {
    this.setState('searchResults', []);
  }

  /**
   * Set available topics (top 20)
   */
  setAvailableTopics(topics: Topic[]): void {
    this.setState('availableTopics', topics.slice(0, 20));
  }

  /**
   * Set available tags (top 20)
   */
  setAvailableTags(tags: Tag[]): void {
    this.setState('availableTags', tags.slice(0, 20));
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.setMultipleStates({
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
    this.setMultipleStates({
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
    const state = this.getState();
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
    const state = this.getState();
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
   * Reset all search state to initial values
   */
  reset(): void {
    this.stateSubject.next(this.initialState);
  }

  // Convenience getters for individual properties
  get searchQuery(): string { return this.getState().searchQuery; }
  get searchResults(): SearchResultWithCollections[] { return this.getState().searchResults; }
  get availableTopics(): Topic[] { return this.getState().availableTopics; }
  get selectedTopics(): string[] { return this.getState().selectedTopics; }
  get availableTags(): Tag[] { return this.getState().availableTags; }
  get selectedTags(): string[] { return this.getState().selectedTags; }
  get dateFrom(): Date | null { return this.getState().dateFrom; }
  get dateTo(): Date | null { return this.getState().dateTo; }
}
