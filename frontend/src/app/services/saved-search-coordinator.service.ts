import { Injectable } from '@angular/core';
import { SavedSearchesService, SavedSearch } from './saved-searches.service';
import { SearchStateService } from './search-state.service';
import { SearchManagementService } from './search-management.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class SavedSearchCoordinatorService {

  constructor(
    private savedSearchesService: SavedSearchesService,
    private searchState: SearchStateService,
    private searchManager: SearchManagementService,
    private uiState: UIStateService
  ) {}

  /**
   * Save the current search with all active filters
   */
  saveCurrentSearch(name: string): void {
    const dateOptions = this.searchState.getSearchOptions();
    const search: SavedSearch = {
      name: name.trim(),
      query: this.searchState.searchQuery,
      filters: {
        topics: this.searchState.selectedTopics.length > 0 ? this.searchState.selectedTopics : undefined,
        tags: this.searchState.selectedTags.length > 0 ? this.searchState.selectedTags : undefined,
        contentType: this.searchManager.selectedContentType || undefined,
        dateFrom: dateOptions.dateFrom,
        dateTo: dateOptions.dateTo
      }
    };
    this.savedSearchesService.save(search);
  }

  /**
   * Apply a saved search and execute it
   */
  applySavedSearch(search: any, onSearch: (query: string) => void): void {
    this.searchState.applySearch(search.query, search.filters);
    this.searchManager.selectedContentType = search.filters.contentType || '';
    this.uiState.setState('showSavedSearches', false);
    onSearch(search.query);
  }

  /**
   * Delete a saved search by index
   */
  deleteSavedSearch(index: number): void {
    this.savedSearchesService.delete(index);
  }

  /**
   * Prompt for search name and save current search
   */
  promptAndSaveSearch(): void {
    const name = this.savedSearchesService.promptForName();
    if (name) {
      this.saveCurrentSearch(name);
    }
  }
}
