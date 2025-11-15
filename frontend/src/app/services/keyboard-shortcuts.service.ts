import { Injectable, ElementRef } from '@angular/core';
import { UIStateService } from './ui-state.service';
import { DocumentStateService } from './document-state.service';
import { FindReplaceService } from './find-replace.service';

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
    private uiState: UIStateService,
    private docState: DocumentStateService,
    private findReplace: FindReplaceService
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
      if (this.uiState.showFindReplace) {
        this.uiState.setState('showFindReplace', false);
        this.findReplace.findText = '';
        this.findReplace.replaceText = '';
        this.findReplace.currentMatchIndex = 0;
        this.findReplace.totalMatches = 0;
      } else if (this.uiState.showKeyboardShortcutsDialog) {
        this.closeKeyboardShortcuts();
      } else if (this.docState.selectedDocument) {
        handlers.onCloseDocument();
      } else if (this.uiState.showUploadDialog) {
        handlers.onCloseUploadDialog();
      } else if (this.uiState.showSettingsDialog) {
        handlers.onCloseSettingsDialog();
      } else if (this.uiState.showIndex) {
        this.uiState.setState('showIndex', false);
      } else if (this.uiState.showFilters) {
        this.uiState.setState('showFilters', false);
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
    this.uiState.setState('showKeyboardShortcutsDialog', true);
  }

  /**
   * Close keyboard shortcuts dialog
   */
  closeKeyboardShortcuts(): void {
    this.uiState.setState('showKeyboardShortcutsDialog', false);
  }
}
