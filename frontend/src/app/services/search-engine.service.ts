import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApplicationStateService } from './application-state.service';

// Types
export interface SearchResult {
  path: string;
  title: string;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  modifiedAt: number;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export interface Document {
  path: string;
  title: string;
  content: string;
  rawContent: string;
  frontmatter: any;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  createdAt: number;
  modifiedAt: number;
  indexedAt: number;
}

export interface Stats {
  totalDocuments: number;
  totalWords: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface Topic {
  name: string;
  count: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  tags?: string[];
  topics?: string[];
  contentType?: string;
  dateFrom?: number;
  dateTo?: number;
}

/**
 * Consolidated search engine service
 * Combines HTTP operations (former SearchService) with search orchestration (former SearchManagementService)
 */
@Injectable({
  providedIn: 'root'
})
export class SearchEngineService {
  private apiUrl = 'http://localhost:3011/api';
  private searchSubject = new Subject<string>();

  // State
  hasSearched = false;
  selectedContentType = '';

  constructor(
    private http: HttpClient,
    private appState: ApplicationStateService
  ) {}

  // ============================================
  // HTTP Operations (from SearchService)
  // ============================================

  /**
   * Perform search API call
   */
  search(query: string, options?: SearchOptions): Observable<SearchResponse> {
    let params = new HttpParams().set('q', query);

    if (options) {
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.offset) params = params.set('offset', options.offset.toString());
      if (options.tags && options.tags.length > 0) {
        params = params.set('tags', options.tags.join(','));
      }
      if (options.topics && options.topics.length > 0) {
        params = params.set('topics', options.topics.join(','));
      }
      if (options.contentType) {
        params = params.set('contentType', options.contentType);
      }
    }

    return this.http.get<SearchResponse>(`${this.apiUrl}/search`, { params });
  }

  getDocument(path: string): Observable<Document> {
    const params = new HttpParams().set('path', path);
    return this.http.get<Document>(`${this.apiUrl}/document`, { params });
  }

  getAllDocuments(limit: number, offset: number): Observable<{ total: number; documents: SearchResult[] }> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<{ total: number; documents: SearchResult[] }>(`${this.apiUrl}/documents`, { params });
  }

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`);
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  getTopics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.apiUrl}/topics`);
  }

  triggerReindex(): Observable<any> {
    return this.http.post(`${this.apiUrl}/index`, {});
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  uploadMultipleFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post(`${this.apiUrl}/upload/multiple`, formData);
  }

  getConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`);
  }

  updateWatchDirectory(directory: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/config/watch-directory`, { directory });
  }

  saveDocument(path: string, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/document`, { path, content });
  }

  // ============================================
  // Search Orchestration (from SearchManagementService)
  // ============================================

  /**
   * Initialize debounced search
   */
  setupDebouncedSearch(onSearchComplete: () => void, onHistoryAdd?: (query: string) => void): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.performSearch(query, onSearchComplete, onHistoryAdd);
      });
  }

  /**
   * Handle search input with debouncing
   */
  onSearchInput(query: string): void {
    this.appState.setSearchQuery(query);
    if (query.trim().length > 0) {
      this.searchSubject.next(query);
    } else {
      this.appState.clearSearchResults();
      this.hasSearched = false;
    }
  }

  /**
   * Perform search with all filters
   */
  performSearch(query: string, onSearchComplete: () => void, onHistoryAdd?: (query: string) => void): void {
    if (query.trim().length === 0) return;

    this.appState.setState('isSearching', true);
    this.hasSearched = true;
    this.appState.setState('showSearchHistory', false);

    const searchOptions: SearchOptions = {};

    // Add topic filters
    if (this.appState.selectedTopics.length > 0) {
      searchOptions.topics = this.appState.selectedTopics;
    }

    // Add tag filters
    if (this.appState.selectedTags.length > 0) {
      searchOptions.tags = this.appState.selectedTags;
    }

    // Add content type filter
    if (this.selectedContentType) {
      searchOptions.contentType = this.selectedContentType;
    }

    // Add date range filters from searchState
    const dateOptions = this.appState.getSearchOptions();
    if (dateOptions.dateFrom) {
      searchOptions.dateFrom = dateOptions.dateFrom;
    }
    if (dateOptions.dateTo) {
      searchOptions.dateTo = dateOptions.dateTo;
    }

    this.search(query, searchOptions).subscribe({
      next: (response) => {
        this.appState.setSearchResults(response.results);
        this.appState.setState('isSearching', false);
        if (onHistoryAdd) {
          onHistoryAdd(query);
        }
        onSearchComplete();
      },
      error: (error) => {
        console.error('Search error:', error);
        this.appState.setState('isSearching', false);
      }
    });
  }

  /**
   * Trigger search with current query
   */
  triggerSearch(): void {
    if (this.appState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.appState.searchQuery);
    }
  }

  /**
   * Toggle topic filter
   */
  toggleTopic(topic: string): void {
    const selectedTopics = [...this.appState.selectedTopics];
    const index = selectedTopics.indexOf(topic);
    if (index >= 0) {
      selectedTopics.splice(index, 1);
    } else {
      selectedTopics.push(topic);
    }
    this.appState.setSearchState('selectedTopics', selectedTopics);
    this.triggerSearch();
  }

  /**
   * Toggle tag filter
   */
  toggleTag(tag: string): void {
    const selectedTags = [...this.appState.selectedTags];
    const index = selectedTags.indexOf(tag);
    if (index >= 0) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tag);
    }
    this.appState.setSearchState('selectedTags', selectedTags);
    this.triggerSearch();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.appState.clearFilters();
    this.selectedContentType = '';
    this.triggerSearch();
  }

  /**
   * Handle date filter changes
   */
  onDateFilterChange(): void {
    this.triggerSearch();
  }

  /**
   * Handle content type filter changes
   */
  onContentTypeChange(): void {
    this.triggerSearch();
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return this.appState.hasActiveFilters() || this.selectedContentType !== '';
  }

  /**
   * Check if tag is selected
   */
  isTagSelected(tag: string): boolean {
    return this.appState.selectedTags.includes(tag);
  }

  /**
   * Check if topic is selected
   */
  isTopicSelected(topic: string): boolean {
    return this.appState.selectedTopics.includes(topic);
  }
}
