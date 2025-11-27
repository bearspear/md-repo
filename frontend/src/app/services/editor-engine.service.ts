import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchEngineService } from './search-engine.service';
import { ApplicationStateService } from './application-state.service';

// Types
export type PreviewMode = 'editor' | 'split' | 'preview';

export interface EditorState {
  previewMode: PreviewMode;
}

/**
 * Consolidated editor engine service
 * Combines state management and editing orchestration
 * Merges: EditorStateService + EditorManagerService
 */
@Injectable({
  providedIn: 'root'
})
export class EditorEngineService implements OnDestroy {
  // ============================================
  // State Management (from EditorStateService)
  // ============================================

  private initialState: EditorState = {
    previewMode: 'split'
  };

  private stateSubject = new BehaviorSubject<EditorState>(this.initialState);
  public state$: Observable<EditorState> = this.stateSubject.asObservable();

  // ============================================
  // Editing Orchestration (from EditorManagerService)
  // ============================================

  private saveTimeout: any = null;
  private readonly AUTO_SAVE_DELAY = 2000;

  constructor(
    private searchEngine: SearchEngineService,
    private appState: ApplicationStateService
  ) {}

  ngOnDestroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }

  // ============================================
  // State Management Methods
  // ============================================

  /**
   * Get current state
   */
  get state(): EditorState {
    return this.stateSubject.value;
  }

  /**
   * Set a specific state property
   */
  setState<K extends keyof EditorState>(key: K, value: EditorState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Get current preview mode
   */
  get previewMode(): PreviewMode {
    return this.stateSubject.value.previewMode;
  }

  /**
   * Set preview mode
   */
  set previewMode(mode: PreviewMode) {
    this.setState('previewMode', mode);
  }

  /**
   * Cycle through preview modes: editor -> split -> preview -> editor
   */
  cyclePreviewMode(): void {
    const modes: PreviewMode[] = ['editor', 'split', 'preview'];
    const currentIndex = modes.indexOf(this.stateSubject.value.previewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setState('previewMode', modes[nextIndex]);
  }

  /**
   * Reset state to initial values
   */
  resetState(): void {
    this.stateSubject.next(this.initialState);
  }

  // ============================================
  // Editing Orchestration Methods
  // ============================================

  /**
   * Toggle between edit and view modes
   * Returns true if switched to edit mode, false otherwise
   */
  toggleEditMode(): boolean {
    if (this.appState.isEditMode) {
      // Already in edit mode, do nothing
      return true;
    }

    if (!this.appState.selectedDocument) {
      console.warn('No document selected');
      return false;
    }

    // Switch to edit mode
    this.appState.setState('isEditMode', true);
    this.appState.setDocumentState('editedContent', this.appState.selectedDocument.content || '');

    console.log('Switched to edit mode');
    return true;
  }

  /**
   * Handle content changes in the editor (with auto-save)
   */
  onContentChange(): void {
    if (!this.appState.isEditMode || !this.appState.selectedDocument) {
      return;
    }

    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set up auto-save after delay
    this.saveTimeout = setTimeout(() => {
      this.saveDocument();
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Save the current document
   */
  saveDocument(): void {
    if (!this.appState.selectedDocument || !this.appState.isEditMode) {
      return;
    }

    const documentPath = this.appState.selectedDocument.path;
    const content = this.appState.editedContent;

    console.log('Saving document:', documentPath);

    this.searchEngine.saveDocument(documentPath, content).subscribe({
      next: (response: any) => {
        console.log('Document saved:', response);

        // Update the document content
        if (this.appState.selectedDocument) {
          this.appState.selectedDocument.content = content;
        }

        // Clear the save timeout
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
        }
      },
      error: (error: any) => {
        console.error('Error saving document:', error);
        alert('Failed to save document: ' + (error.error?.error || error.message));
      }
    });
  }

  /**
   * Discard changes and exit edit mode
   * Returns true if changes were discarded, false if cancelled
   */
  discardChanges(): boolean {
    if (!this.appState.isEditMode) {
      return false;
    }

    // Check if there are unsaved changes
    const hasChanges = this.appState.editedContent !== this.appState.selectedDocument?.content;

    if (hasChanges) {
      const confirmDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) {
        return false;
      }
    }

    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    // Exit edit mode
    this.appState.setState('isEditMode', false);
    this.appState.setDocumentState('editedContent', '');

    console.log('Exited edit mode');
    return true;
  }

  /**
   * Insert markdown formatting at cursor position
   */
  insertMarkdown(type: string): void {
    if (!this.appState.isEditMode) {
      return;
    }

    // Get the textarea element
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.appState.editedContent.substring(start, end);
    const beforeText = this.appState.editedContent.substring(0, start);
    const afterText = this.appState.editedContent.substring(end);

    let insertText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        insertText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? insertText.length : 2;
        break;
      case 'italic':
        insertText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? insertText.length : 1;
        break;
      case 'heading':
        insertText = `## ${selectedText || 'Heading'}`;
        cursorOffset = selectedText ? insertText.length : 3;
        break;
      case 'link':
        insertText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = selectedText ? insertText.length - 4 : 1;
        break;
      case 'code':
        insertText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? insertText.length : 1;
        break;
      case 'list':
        insertText = `- ${selectedText || 'list item'}`;
        cursorOffset = selectedText ? insertText.length : 2;
        break;
      default:
        return;
    }

    // Update content
    this.appState.setDocumentState('editedContent', beforeText + insertText + afterText);

    // Trigger auto-save
    this.onContentChange();

    // Set cursor position after Angular updates the view
    setTimeout(() => {
      const newCursorPos = start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }
}
