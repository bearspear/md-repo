import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MarkdownModule
  ],
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.css']
})
export class MarkdownEditorComponent {
  // Inputs
  @Input() editedContent: string = '';
  @Input() previewMode: string = 'editor';
  @Input() isSaving: boolean = false;
  @Input() hasUnsavedChanges: boolean = false;
  @Input() lastSavedAt: Date | null = null;
  @Input() showFindReplace: boolean = false;
  @Input() showReplace: boolean = false;
  @Input() findText: string = '';
  @Input() replaceText: string = '';
  @Input() currentMatchIndex: number = 0;
  @Input() totalMatches: number = 0;
  @Input() showSaveControls: boolean = true; // Toggle to show/hide save/discard buttons and saving message

  // Outputs
  @Output() editedContentChange = new EventEmitter<string>();
  @Output() findTextChange = new EventEmitter<string>();
  @Output() replaceTextChange = new EventEmitter<string>();
  @Output() contentChange = new EventEmitter<void>();
  @Output() insertMarkdown = new EventEmitter<string>();
  @Output() toggleFindReplace = new EventEmitter<void>();
  @Output() showKeyboardShortcuts = new EventEmitter<void>();
  @Output() findNext = new EventEmitter<void>();
  @Output() findPrevious = new EventEmitter<void>();
  @Output() replaceNext = new EventEmitter<void>();
  @Output() replaceAll = new EventEmitter<void>();
  @Output() discardChanges = new EventEmitter<void>();
  @Output() saveDocument = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();

  // ViewChild for textarea
  @ViewChild('editorTextarea') editorTextarea?: ElementRef<HTMLTextAreaElement>;

  // Track cursor position
  private cursorPosition: number = 0;

  onContentChange() {
    this.saveCursorPosition();
    this.editedContentChange.emit(this.editedContent);
    this.contentChange.emit();
  }

  onFindTextChange() {
    this.findTextChange.emit(this.findText);
  }

  onReplaceTextChange() {
    this.replaceTextChange.emit(this.replaceText);
  }

  onInsertMarkdown(type: string) {
    this.saveCursorPosition();
    this.insertMarkdownAtCursor(type);
  }

  /**
   * Save current cursor position
   */
  saveCursorPosition() {
    if (this.editorTextarea?.nativeElement) {
      this.cursorPosition = this.editorTextarea.nativeElement.selectionStart;
    }
  }

  /**
   * Set cursor position
   */
  setCursorPosition(position: number) {
    if (this.editorTextarea?.nativeElement) {
      setTimeout(() => {
        this.editorTextarea!.nativeElement.focus();
        this.editorTextarea!.nativeElement.setSelectionRange(position, position);
      }, 0);
    }
  }

  /**
   * Insert markdown at cursor position
   */
  insertMarkdownAtCursor(type: string) {
    if (!this.editorTextarea?.nativeElement) return;

    const textarea = this.editorTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.editedContent.substring(start, end);
    const beforeText = this.editedContent.substring(0, start);
    const afterText = this.editedContent.substring(end);

    let insertText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        insertText = `**${selectedText || 'bold text'}**`;
        cursorOffset = insertText.length;
        break;
      case 'italic':
        insertText = `*${selectedText || 'italic text'}*`;
        cursorOffset = insertText.length;
        break;
      case 'strikethrough':
        insertText = `~~${selectedText || 'strikethrough text'}~~`;
        cursorOffset = insertText.length;
        break;
      case 'inline-code':
        insertText = `\`${selectedText || 'code'}\``;
        cursorOffset = insertText.length;
        break;
      case 'h1':
        insertText = `# ${selectedText || 'Heading 1'}`;
        cursorOffset = insertText.length;
        break;
      case 'h2':
        insertText = `## ${selectedText || 'Heading 2'}`;
        cursorOffset = insertText.length;
        break;
      case 'h3':
        insertText = `### ${selectedText || 'Heading 3'}`;
        cursorOffset = insertText.length;
        break;
      case 'h4':
        insertText = `#### ${selectedText || 'Heading 4'}`;
        cursorOffset = insertText.length;
        break;
      case 'h5':
        insertText = `##### ${selectedText || 'Heading 5'}`;
        cursorOffset = insertText.length;
        break;
      case 'h6':
        insertText = `###### ${selectedText || 'Heading 6'}`;
        cursorOffset = insertText.length;
        break;
      case 'ul':
        insertText = `- ${selectedText || 'List item'}`;
        cursorOffset = insertText.length;
        break;
      case 'ol':
        insertText = `1. ${selectedText || 'List item'}`;
        cursorOffset = insertText.length;
        break;
      case 'task':
        insertText = `- [ ] ${selectedText || 'Task item'}`;
        cursorOffset = insertText.length;
        break;
      case 'link':
        insertText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = insertText.length;
        break;
      case 'image':
        insertText = `![${selectedText || 'alt text'}](image-url)`;
        cursorOffset = insertText.length;
        break;
      case 'blockquote':
        insertText = `> ${selectedText || 'Quote'}`;
        cursorOffset = insertText.length;
        break;
      case 'code-block':
        insertText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
        cursorOffset = insertText.length;
        break;
      case 'table':
        insertText = '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
        cursorOffset = insertText.length;
        break;
      case 'hr':
        insertText = '\n---\n';
        cursorOffset = insertText.length;
        break;
      case 'footnote':
        insertText = `[^${selectedText || '1'}]`;
        cursorOffset = insertText.length;
        break;
      case 'emoji':
        insertText = ':smile:';
        cursorOffset = insertText.length;
        break;
      case 'indent':
        insertText = `  ${selectedText}`;
        cursorOffset = insertText.length;
        break;
      case 'outdent':
        insertText = selectedText.replace(/^  /, '');
        cursorOffset = insertText.length;
        break;
      default:
        return;
    }

    this.editedContent = beforeText + insertText + afterText;
    this.editedContentChange.emit(this.editedContent);
    this.contentChange.emit();

    // Set cursor position after insertion
    const newCursorPos = start + cursorOffset;
    this.setCursorPosition(newCursorPos);
  }

  onToggleFindReplace() {
    this.toggleFindReplace.emit();
  }

  onShowKeyboardShortcuts() {
    this.showKeyboardShortcuts.emit();
  }

  onFindNext() {
    this.findNext.emit();
  }

  onFindPrevious() {
    this.findPrevious.emit();
  }

  onReplaceNext() {
    this.replaceNext.emit();
  }

  onReplaceAll() {
    this.replaceAll.emit();
  }

  onDiscardChanges() {
    this.discardChanges.emit();
  }

  onSaveDocument() {
    this.saveDocument.emit();
  }

  onUndo() {
    this.undo.emit();
  }

  onRedo() {
    this.redo.emit();
  }
}
