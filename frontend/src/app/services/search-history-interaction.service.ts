import { Injectable } from '@angular/core';
import { SearchHistoryService } from './search-history.service';
import { SearchStateService } from './search-state.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryInteractionService {

  constructor(
    private searchHistoryService: SearchHistoryService,
    private searchState: SearchStateService,
    private uiState: UIStateService
  ) {}

  /**
   * Add a query to search history
   */
  addToSearchHistory(query: string): void {
    this.searchHistoryService.add(query);
  }

  /**
   * Use a search from history
   */
  useSearchHistory(query: string, onSearch: (query: string) => void): void {
    this.searchState.setSearchQuery(query);
    this.uiState.setState('showSearchHistory', false);
    onSearch(query);
  }

  /**
   * Clear all search history
   */
  clearSearchHistory(): void {
    this.searchHistoryService.clear();
    this.uiState.setState('showSearchHistory', false);
  }

  /**
   * Handle search input focus
   */
  onSearchFocus(): void {
    if (this.searchHistoryService.getHistory().length > 0 && !this.searchState.searchQuery) {
      this.uiState.setState('showSearchHistory', true);
    }
  }

  /**
   * Handle search input blur with delay for history item clicks
   */
  onSearchBlur(): void {
    // Delay to allow click on history items
    setTimeout(() => {
      this.uiState.setState('showSearchHistory', false);
    }, 200);
  }
}
