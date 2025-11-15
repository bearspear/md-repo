import { Injectable } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class SavedSearchesService {
  private savedSearches: SavedSearch[] = [];
  private readonly SAVED_SEARCHES_KEY = 'md-reader-saved-searches';

  constructor() {
    this.load();
  }

  /**
   * Get all saved searches
   */
  getAll(): SavedSearch[] {
    return this.savedSearches;
  }

  /**
   * Load saved searches from localStorage
   */
  load(): void {
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
   * Save a new search or update existing one
   */
  save(search: SavedSearch): void {
    if (!search.name || !search.query) return;

    // Check if search with same name exists
    const existingIndex = this.savedSearches.findIndex(s => s.name === search.name);
    if (existingIndex >= 0) {
      this.savedSearches[existingIndex] = search;
    } else {
      this.savedSearches.push(search);
    }

    this.persist();
  }

  /**
   * Delete a saved search by index
   */
  delete(index: number): void {
    this.savedSearches.splice(index, 1);
    this.persist();
  }

  /**
   * Prompt user for search name and return it
   */
  promptForName(): string | null {
    return window.prompt('Enter a name for this search:');
  }

  /**
   * Persist saved searches to localStorage
   */
  private persist(): void {
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(this.savedSearches));
  }
}
