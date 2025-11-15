import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import { SearchStateService } from './search-state.service';
import { CollectionService } from './collection.service';
import { CollectionManagerService } from './collection-manager.service';
import { SearchManagementService } from './search-management.service';

/**
 * Callbacks for component interactions
 */
export interface AppStateCallbacks {
  onStatsLoaded: (totalDocuments: number, totalWords: number) => void;
  onCollectionColorsLoaded: (colors: string[]) => void;
  onPerformSearch: (query: string) => void;
  onLoadCollectionsForResults: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationStateInitializerService {

  constructor(
    private searchService: SearchService,
    private searchState: SearchStateService,
    private collectionService: CollectionService,
    private collectionManager: CollectionManagerService,
    private searchManager: SearchManagementService
  ) {}

  /**
   * Initialize application state on startup
   * Loads stats, topics, tags, collection colors, and sets up search
   */
  initialize(callbacks: AppStateCallbacks): void {
    // Load stats
    this.searchService.getStats().subscribe(stats => {
      callbacks.onStatsLoaded(stats.totalDocuments, stats.totalWords);
    });

    // Load topics for filtering
    this.searchService.getTopics().subscribe(topics => {
      this.searchState.setAvailableTopics(topics);
    });

    // Load tags for filtering
    this.searchService.getTags().subscribe(tags => {
      this.searchState.setAvailableTags(tags);
    });

    // Load available collection colors
    const colors = this.collectionService.getAvailableColors();
    callbacks.onCollectionColorsLoaded(colors);

    // Setup debounced search
    this.searchManager.setupDebouncedSearch(callbacks.onLoadCollectionsForResults);

    // Setup collection manager
    const collectionColors = this.collectionManager.getAvailableColors();
    callbacks.onCollectionColorsLoaded(collectionColors);
    this.collectionManager.registerSearchCallback(callbacks.onPerformSearch);
  }

  /**
   * Refresh application state after changes (e.g., after upload)
   * Reloads stats, topics, and optionally performs search
   */
  refresh(callbacks: AppStateCallbacks): void {
    // Reload stats
    this.searchService.getStats().subscribe(stats => {
      callbacks.onStatsLoaded(stats.totalDocuments, stats.totalWords);
    });

    // Reload topics
    this.searchService.getTopics().subscribe(topics => {
      this.searchState.setAvailableTopics(topics);
    });

    // Perform search if there's an active query
    if (this.searchState.searchQuery.trim().length > 0) {
      callbacks.onPerformSearch(this.searchState.searchQuery);
    }
  }
}
