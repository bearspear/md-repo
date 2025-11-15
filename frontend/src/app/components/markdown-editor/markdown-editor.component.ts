import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
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

  onContentChange() {
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
    this.insertMarkdown.emit(type);
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
}
