import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import { UIStateService } from './ui-state.service';
import { SearchStateService } from './search-state.service';
import { SearchHistoryService } from './search-history.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchManagementService {
  hasSearched = false;
  selectedContentType = '';
  private searchSubject = new Subject<string>();

  constructor(
    private searchService: SearchService,
    private uiState: UIStateService,
    private searchState: SearchStateService,
    private searchHistory: SearchHistoryService
  ) {}

  /**
   * Initialize debounced search
   */
  setupDebouncedSearch(onSearchComplete: () => void): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.performSearch(query, onSearchComplete);
      });
  }

  /**
   * Handle search input with debouncing
   */
  onSearchInput(query: string): void {
    this.searchState.setSearchQuery(query);
    if (query.trim().length > 0) {
      this.searchSubject.next(query);
    } else {
      this.searchState.clearSearchResults();
      this.hasSearched = false;
    }
  }

  /**
   * Perform search with all filters
   */
  performSearch(query: string, onSearchComplete: () => void): void {
    if (query.trim().length === 0) return;

    this.uiState.setState('isSearching', true);
    this.hasSearched = true;
    this.uiState.setState('showSearchHistory', false);

    const searchOptions: any = {};

    // Add topic filters
    if (this.searchState.selectedTopics.length > 0) {
      searchOptions.topics = this.searchState.selectedTopics;
    }

    // Add tag filters
    if (this.searchState.selectedTags.length > 0) {
      searchOptions.tags = this.searchState.selectedTags;
    }

    // Add content type filter
    if (this.selectedContentType) {
      searchOptions.contentType = this.selectedContentType;
    }

    // Add date range filters from searchState
    const dateOptions = this.searchState.getSearchOptions();
    if (dateOptions.dateFrom) {
      searchOptions.dateFrom = dateOptions.dateFrom;
    }
    if (dateOptions.dateTo) {
      searchOptions.dateTo = dateOptions.dateTo;
    }

    this.searchService.search(query, searchOptions).subscribe({
      next: (response) => {
        this.searchState.setSearchResults(response.results);
        this.uiState.setState('isSearching', false);
        this.searchHistory.add(query);
        onSearchComplete();
      },
      error: (error) => {
        console.error('Search error:', error);
        this.uiState.setState('isSearching', false);
      }
    });
  }

  /**
   * Toggle topic filter
   */
  toggleTopic(topic: string): void {
    const selectedTopics = [...this.searchState.selectedTopics];
    const index = selectedTopics.indexOf(topic);
    if (index >= 0) {
      selectedTopics.splice(index, 1);
    } else {
      selectedTopics.push(topic);
    }
    this.searchState.setState('selectedTopics', selectedTopics);

    // Re-run search if we have a query
    if (this.searchState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchState.searchQuery);
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchState.clearFilters();
    this.selectedContentType = '';
    if (this.searchState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchState.searchQuery);
    }
  }

  /**
   * Toggle tag filter
   */
  toggleTag(tag: string): void {
    const selectedTags = [...this.searchState.selectedTags];
    const index = selectedTags.indexOf(tag);
    if (index >= 0) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tag);
    }
    this.searchState.setState('selectedTags', selectedTags);

    // Re-run search if we have a query
    if (this.searchState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchState.searchQuery);
    }
  }

  /**
   * Check if tag is selected
   */
  isTagSelected(tag: string): boolean {
    return this.searchState.selectedTags.includes(tag);
  }

  /**
   * Handle date filter changes
   */
  onDateFilterChange(): void {
    // Re-run search when date filter changes
    if (this.searchState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchState.searchQuery);
    }
  }

  /**
   * Handle content type filter changes
   */
  onContentTypeChange(): void {
    // Re-run search when content type changes
    if (this.searchState.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchState.searchQuery);
    }
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return this.searchState.hasActiveFilters() ||
           this.selectedContentType !== '';
  }

  /**
   * Check if topic is selected
   */
  isTopicSelected(topic: string): boolean {
    return this.searchState.selectedTopics.includes(topic);
  }
}
