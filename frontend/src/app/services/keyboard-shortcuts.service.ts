import { Injectable, ElementRef } from '@angular/core';
import { ApplicationStateService } from './application-state.service';
import { UserPreferencesEngineService } from './user-preferences-engine.service';

/**
 * Keyboard shortcut configuration for handlers
 */
export interface KeyboardShortcutHandlers {
  onFocusSearch: () => void;
  onCloseDocument: () => void;
  onCloseUploadDialog: () => void;
  onCloseSettingsDialog: () => void;
  onToggleFindReplace: (withReplace: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {

  constructor(
    private appState: ApplicationStateService,
    private userPrefs: UserPreferencesEngineService
  ) {}

  /**
   * Handle keyboard events for global shortcuts
   */
  handleKeyboardEvent(event: KeyboardEvent, handlers: KeyboardShortcutHandlers): void {
    // "/" to focus search
    if (event.key === '/' && !this.isInputFocused(event)) {
      event.preventDefault();
      handlers.onFocusSearch();
    }

    // "Escape" to close modals
    if (event.key === 'Escape') {
      if (this.appState.showFindReplace) {
        this.appState.setState('showFindReplace', false);
        this.userPrefs.findText = '';
        this.userPrefs.replaceText = '';
        this.userPrefs.currentMatchIndex = 0;
        this.userPrefs.totalMatches = 0;
      } else if (this.appState.showKeyboardShortcutsDialog) {
        this.closeKeyboardShortcuts();
      } else if (this.appState.selectedDocument) {
        handlers.onCloseDocument();
      } else if (this.appState.showUploadDialog) {
        handlers.onCloseUploadDialog();
      } else if (this.appState.showSettingsDialog) {
        handlers.onCloseSettingsDialog();
      } else if (this.appState.showIndex) {
        this.appState.setState('showIndex', false);
      } else if (this.appState.showFilters) {
        this.appState.setState('showFilters', false);
      }
    }

    // Ctrl+F / Cmd+F to open find panel
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      handlers.onToggleFindReplace(false);
    }

    // Ctrl+H / Cmd+H to open find & replace panel
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
      event.preventDefault();
      handlers.onToggleFindReplace(true);
    }
  }

  /**
   * Check if an input element is currently focused
   */
  isInputFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  }

  /**
   * Show keyboard shortcuts dialog
   */
  showKeyboardShortcuts(): void {
    this.appState.setState('showKeyboardShortcutsDialog', true);
  }

  /**
   * Close keyboard shortcuts dialog
   */
  closeKeyboardShortcuts(): void {
    this.appState.setState('showKeyboardShortcutsDialog', false);
  }
}
