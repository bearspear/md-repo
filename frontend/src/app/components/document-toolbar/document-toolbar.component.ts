import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-document-toolbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './document-toolbar.component.html',
  styleUrls: ['./document-toolbar.component.css']
})
export class DocumentToolbarComponent {
  @Input() title: string = '';
  @Input() path: string = '';
  @Input() isEditMode: boolean = false;
  @Input() previewMode: string = 'editor';
  @Input() annotationsCount: number = 0;
  @Input() showToc: boolean = false;
  @Input() hasToc: boolean = false;
  @Input() copySuccess: boolean = false;
  @Input() isFullscreen: boolean = false;

  @Output() toggleEditMode = new EventEmitter<void>();
  @Output() cyclePreviewMode = new EventEmitter<void>();
  @Output() toggleToc = new EventEmitter<void>();
  @Output() copyMarkdown = new EventEmitter<void>();
  @Output() printDocument = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() closeDocument = new EventEmitter<void>();

  onToggleEditMode(): void {
    this.toggleEditMode.emit();
  }

  onCyclePreviewMode(): void {
    this.cyclePreviewMode.emit();
  }

  onToggleToc(): void {
    this.toggleToc.emit();
  }

  onCopyMarkdown(): void {
    this.copyMarkdown.emit();
  }

  onPrintDocument(): void {
    this.printDocument.emit();
  }

  onToggleFullscreen(): void {
    this.toggleFullscreen.emit();
  }

  onCloseDocument(): void {
    this.closeDocument.emit();
  }

  getPreviewModeTooltip(): string {
    if (this.previewMode === 'editor') return 'Preview: Editor Only';
    if (this.previewMode === 'split') return 'Preview: Split View';
    return 'Preview: Preview Only';
  }

  getPreviewModeIcon(): string {
    if (this.previewMode === 'editor') return 'code';
    if (this.previewMode === 'split') return 'view_column';
    return 'visibility';
  }
}
