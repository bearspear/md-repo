import { Injectable, OnDestroy } from '@angular/core';
import { SearchService } from './search.service';
import { DocumentStateService } from './document-state.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class EditorManagerService implements OnDestroy {
  private saveTimeout: any = null;
  private readonly AUTO_SAVE_DELAY = 2000; // 2 seconds

  constructor(
    private searchService: SearchService,
    private docState: DocumentStateService,
    private uiState: UIStateService
  ) {}

  ngOnDestroy() {
    this.clearSaveTimeout();
  }

  /**
   * Toggle edit mode with unsaved changes check
   */
  toggleEditMode(): boolean {
    if (this.uiState.isEditMode && this.docState.hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to exit edit mode?')) {
        return false;
      }
    }

    this.uiState.toggle('isEditMode');

    if (this.uiState.isEditMode) {
      // Enter edit mode - load raw content
      this.docState.resetEditingState();
    } else {
      // Exit edit mode - clear save timeout
      this.clearSaveTimeout();
    }

    return true;
  }

  /**
   * Handle content change with auto-save debouncing
   */
  onContentChange(): void {
    this.docState.setState('hasUnsavedChanges', true);

    // Clear existing timeout
    this.clearSaveTimeout();

    // Set new timeout for auto-save
    this.saveTimeout = setTimeout(() => {
      this.saveDocument();
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Save document via API
   */
  saveDocument(): void {
    if (!this.docState.selectedDocument || !this.docState.hasUnsavedChanges) {
      return;
    }

    this.uiState.setState('isSaving', true);

    this.searchService.saveDocument(
      this.docState.selectedDocument.path,
      this.docState.editedContent
    ).subscribe({
      next: (response) => {
        this.uiState.setState('isSaving', false);
        this.docState.markAsSaved();

        // Update the selected document's raw content
        this.docState.updateDocumentContent(this.docState.editedContent);

        console.log('Document saved successfully');
      },
      error: (error) => {
        this.uiState.setState('isSaving', false);
        console.error('Error saving document:', error);
        alert('Failed to save document: ' + (error.error?.error || error.message));
      }
    });
  }

  /**
   * Discard all changes and reset to original content
   */
  discardChanges(): boolean {
    if (!confirm('Are you sure you want to discard all changes?')) {
      return false;
    }

    this.docState.resetEditingState();
    this.clearSaveTimeout();
    return true;
  }

  /**
   * Insert markdown formatting at cursor position
   */
  insertMarkdown(type: string): void {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = '';

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'heading':
        newText = `## ${selectedText || 'Heading'}`;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        break;
      case 'list':
        newText = `- ${selectedText || 'list item'}`;
        break;
      case 'strikethrough':
        newText = `~~${selectedText || 'strikethrough text'}~~`;
        break;
      case 'blockquote':
        newText = `> ${selectedText || 'blockquote'}`;
        break;
      case 'table':
        newText = `| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |`;
        break;
      case 'image':
        newText = `![${selectedText || 'alt text'}](image-url)`;
        break;
      case 'hr':
        newText = `\n---\n`;
        break;
      case 'task':
        newText = `- [ ] ${selectedText || 'task item'}`;
        break;
    }

    // Use execCommand for proper undo/redo support
    textarea.focus();
    textarea.setSelectionRange(start, end);
    document.execCommand('insertText', false, newText);
  }

  /**
   * Clear the auto-save timeout
   */
  private clearSaveTimeout(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}
