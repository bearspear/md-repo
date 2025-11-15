import { Injectable, ElementRef } from '@angular/core';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class FindReplaceService {
  findText = '';
  replaceText = '';
  currentMatchIndex = 0;
  totalMatches = 0;
  private findMatches: number[] = [];
  private findInputRef: ElementRef | null = null;

  constructor(private uiState: UIStateService) {}

  /**
   * Register the find input element reference for auto-focus
   */
  registerFindInput(input: ElementRef): void {
    this.findInputRef = input;
  }

  /**
   * Toggle find/replace panel visibility
   */
  toggle(withReplace: boolean = false): void {
    this.uiState.toggle('showFindReplace');
    this.uiState.setState('showReplace', withReplace);

    if (this.uiState.showFindReplace) {
      // Focus find input after view updates
      setTimeout(() => {
        if (this.findInputRef) {
          this.findInputRef.nativeElement.focus();
        }
      }, 100);
    } else {
      // Reset find/replace state
      this.reset();
    }
  }

  /**
   * Find next occurrence
   */
  findNext(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      this.buildMatches(content, searchText);
    }

    if (this.findMatches.length === 0) {
      this.totalMatches = 0;
      this.currentMatchIndex = 0;
      return;
    }

    // Move to next match
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.findMatches.length;
    this.selectMatch(textarea, content);
  }

  /**
   * Find previous occurrence
   */
  findPrevious(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.toLowerCase();
    const searchText = this.findText.toLowerCase();

    // Build array of all match positions
    if (this.findMatches.length === 0) {
      this.buildMatches(content, searchText);
    }

    if (this.findMatches.length === 0) {
      this.totalMatches = 0;
      this.currentMatchIndex = 0;
      return;
    }

    // Move to previous match
    this.currentMatchIndex = this.currentMatchIndex === 0
      ? this.findMatches.length - 1
      : this.currentMatchIndex - 1;
    this.selectMatch(textarea, content);
  }

  /**
   * Replace current match and find next
   */
  replaceNext(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    // Check if current selection matches find text
    if (selectedText.toLowerCase() === this.findText.toLowerCase()) {
      // Replace current selection
      textarea.setSelectionRange(start, end);
      document.execCommand('insertText', false, this.replaceText);

      // Reset matches to force recalculation
      this.findMatches = [];
    }

    // Find next occurrence
    this.findNext();
  }

  /**
   * Replace all occurrences
   */
  replaceAll(): void {
    if (!this.findText) return;

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Use regex for case-insensitive global replace
    const regex = new RegExp(this.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = textarea.value.replace(regex, this.replaceText);

    // Replace entire content
    textarea.value = newContent;
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);

    // Reset find state
    this.reset();
  }

  /**
   * Reset find/replace state
   */
  private reset(): void {
    this.findText = '';
    this.replaceText = '';
    this.currentMatchIndex = 0;
    this.totalMatches = 0;
    this.findMatches = [];
  }

  /**
   * Build array of all match positions
   */
  private buildMatches(content: string, searchText: string): void {
    this.findMatches = [];
    let index = 0;
    while ((index = content.indexOf(searchText, index)) !== -1) {
      this.findMatches.push(index);
      index++;
    }
    this.totalMatches = this.findMatches.length;
  }

  /**
   * Select and scroll to current match
   */
  private selectMatch(textarea: HTMLTextAreaElement, content: string): void {
    const matchPos = this.findMatches[this.currentMatchIndex];
    textarea.focus();
    textarea.setSelectionRange(matchPos, matchPos + this.findText.length);
    textarea.scrollTop = textarea.scrollHeight * (matchPos / content.length);
  }
}
