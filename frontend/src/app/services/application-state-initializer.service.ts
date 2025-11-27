import { Injectable } from '@angular/core';
import { SearchEngineService } from './search-engine.service';
import { UserPreferencesEngineService } from './user-preferences-engine.service';
import { ApplicationStateService } from './application-state.service';
import { CollectionEngineService } from './collection-engine.service';

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
    private searchEngine: SearchEngineService,
    private userPrefs: UserPreferencesEngineService,
    private appState: ApplicationStateService,
    private collectionEngine: CollectionEngineService
  ) {}

  /**
   * Initialize application state on startup
   * Loads stats, topics, tags, collection colors, and sets up search
   */
  initialize(callbacks: AppStateCallbacks): void {
    // Load stats
    this.searchEngine.getStats().subscribe(stats => {
      callbacks.onStatsLoaded(stats.totalDocuments, stats.totalWords);
    });

    // Load topics for filtering
    this.searchEngine.getTopics().subscribe(topics => {
      this.appState.setAvailableTopics(topics);
    });

    // Load tags for filtering
    this.searchEngine.getTags().subscribe(tags => {
      this.appState.setAvailableTags(tags);
    });

    // Load available collection colors
    const colors = this.collectionEngine.getAvailableColors();
    callbacks.onCollectionColorsLoaded(colors);

    // Setup debounced search
    this.searchEngine.setupDebouncedSearch(
      callbacks.onLoadCollectionsForResults,
      (q) => this.userPrefs.addToHistory(q)
    );

    // Setup collection manager
    this.collectionEngine.registerSearchCallback(callbacks.onPerformSearch);
  }

  /**
   * Refresh application state after changes (e.g., after upload)
   * Reloads stats, topics, and optionally performs search
   */
  refresh(callbacks: AppStateCallbacks): void {
    // Reload stats
    this.searchEngine.getStats().subscribe(stats => {
      callbacks.onStatsLoaded(stats.totalDocuments, stats.totalWords);
    });

    // Reload topics
    this.searchEngine.getTopics().subscribe(topics => {
      this.appState.setAvailableTopics(topics);
    });

    // Perform search if there's an active query
    if (this.appState.searchQuery.trim().length > 0) {
      callbacks.onPerformSearch(this.appState.searchQuery);
    }
  }
}
