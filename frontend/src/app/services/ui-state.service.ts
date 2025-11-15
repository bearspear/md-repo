import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class UIStateService {
  private readonly initialState: UIState = {
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
  };

  private stateSubject = new BehaviorSubject<UIState>(this.initialState);
  public state$: Observable<UIState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current UI state synchronously
   */
  getState(): UIState {
    return this.stateSubject.value;
  }

  /**
   * Update a single UI state property
   */
  setState<K extends keyof UIState>(key: K, value: UIState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Update multiple UI state properties at once
   */
  setMultipleStates(updates: Partial<UIState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Toggle a boolean UI state property
   */
  toggle<K extends keyof UIState>(key: K): void {
    const currentState = this.stateSubject.value;
    const currentValue = currentState[key];

    if (typeof currentValue === 'boolean') {
      this.setState(key, !currentValue as UIState[K]);
    }
  }

  /**
   * Reset all UI state to initial values
   */
  reset(): void {
    this.stateSubject.next(this.initialState);
  }

  /**
   * Close all panels (favorites, recent, collections)
   */
  closeAllPanels(): void {
    this.setMultipleStates({
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
    this.setMultipleStates({
      showAnnotationDialog: false,
      showUploadDialog: false,
      showSettingsDialog: false,
      showCollectionDialog: false,
      showKeyboardShortcutsDialog: false
    });
  }

  // Convenience getters for individual properties
  get isSearching(): boolean { return this.getState().isSearching; }
  get showSearchHistory(): boolean { return this.getState().showSearchHistory; }
  get showSearchHelp(): boolean { return this.getState().showSearchHelp; }
  get showAdvancedFilters(): boolean { return this.getState().showAdvancedFilters; }
  get showFilters(): boolean { return this.getState().showFilters; }
  get showSavedSearches(): boolean { return this.getState().showSavedSearches; }
  get showIndex(): boolean { return this.getState().showIndex; }
  get isFullscreen(): boolean { return this.getState().isFullscreen; }
  get showToc(): boolean { return this.getState().showToc; }
  get showFindReplace(): boolean { return this.getState().showFindReplace; }
  get showReplace(): boolean { return this.getState().showReplace; }
  get isEditMode(): boolean { return this.getState().isEditMode; }
  get isSaving(): boolean { return this.getState().isSaving; }
  get showFavorites(): boolean { return this.getState().showFavorites; }
  get showRecent(): boolean { return this.getState().showRecent; }
  get showCollections(): boolean { return this.getState().showCollections; }
  get showAnnotationDialog(): boolean { return this.getState().showAnnotationDialog; }
  get showUploadDialog(): boolean { return this.getState().showUploadDialog; }
  get showSettingsDialog(): boolean { return this.getState().showSettingsDialog; }
  get showCollectionDialog(): boolean { return this.getState().showCollectionDialog; }
  get showKeyboardShortcutsDialog(): boolean { return this.getState().showKeyboardShortcutsDialog; }
  get isUploading(): boolean { return this.getState().isUploading; }
  get isUpdatingSettings(): boolean { return this.getState().isUpdatingSettings; }
}
