import { Injectable, ElementRef } from '@angular/core';
import { AnnotationService, Annotation } from './annotation.service';
import { AnnotationStateService } from './annotation-state.service';
import { AnnotationHighlightService } from './annotation-highlight.service';
import { DocumentStateService } from './document-state.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationManagerService {

  constructor(
    private annotationService: AnnotationService,
    private annotationState: AnnotationStateService,
    private annotationHighlight: AnnotationHighlightService,
    private docState: DocumentStateService,
    private uiState: UIStateService
  ) {}

  /**
   * Load annotations for a document
   */
  loadAnnotations(documentPath: string): void {
    this.annotationState.markHighlightsStale();
    this.annotationService.getAnnotations(documentPath).subscribe({
      next: (response) => {
        this.docState.setState('annotations', response.annotations);
        this.annotationState.markHighlightsStale();
      },
      error: (error) => {
        console.error('Error loading annotations:', error);
        this.docState.setState('annotations', []);
      }
    });
  }

  /**
   * Apply highlights to document content
   */
  applyHighlights(documentContent: ElementRef, onEdit: (annotation: Annotation) => void): void {
    if (!documentContent || !this.docState.selectedDocument || this.docState.annotations.length === 0) {
      return;
    }

    const contentElement = documentContent.nativeElement;
    this.annotationHighlight.applyHighlights(
      contentElement,
      this.docState.annotations,
      onEdit
    );
  }

  /**
   * Handle text selection for creating new annotation
   */
  onTextSelection(): boolean {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      const documentText = this.docState.selectedDocument.rawContent;

      if (this.annotationState.handleTextSelection(selectedText, documentText)) {
        this.uiState.setState('showAnnotationDialog', true);
        return true;
      }
    }
    return false;
  }

  /**
   * Save annotation (create or update)
   */
  saveAnnotation(onComplete: () => void): void {
    if (!this.docState.selectedDocument || !this.annotationState.selectionRange) return;

    const annotation = {
      id: this.annotationState.editingAnnotation?.id || this.annotationState.generateAnnotationId(),
      documentPath: this.docState.selectedDocument.path,
      selectedText: this.annotationState.selectedText,
      note: this.annotationState.currentAnnotation.note || '',
      color: this.annotationState.currentAnnotation.color || 'yellow',
      startOffset: this.annotationState.selectionRange.start,
      endOffset: this.annotationState.selectionRange.end
    };

    if (this.annotationState.editingAnnotation) {
      // Update existing annotation
      this.annotationService.updateAnnotation(annotation.id, {
        note: annotation.note,
        color: annotation.color
      }).subscribe({
        next: () => {
          this.loadAnnotations(this.docState.selectedDocument.path);
          this.closeAnnotationDialog();
          if (onComplete) onComplete();
        },
        error: (error) => {
          console.error('Error updating annotation:', error);
        }
      });
    } else {
      // Create new annotation
      this.annotationService.createAnnotation(annotation).subscribe({
        next: () => {
          this.annotationState.markHighlightsStale();
          this.loadAnnotations(this.docState.selectedDocument.path);
          this.closeAnnotationDialog();
          if (onComplete) onComplete();
        },
        error: (error) => {
          console.error('Error creating annotation:', error);
        }
      });
    }
  }

  /**
   * Prepare to edit an existing annotation
   */
  editAnnotation(annotation: Annotation): void {
    this.annotationState.prepareEdit(annotation);
    this.uiState.setState('showAnnotationDialog', true);
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(annotation: Annotation): void {
    if (confirm('Are you sure you want to delete this annotation?')) {
      this.annotationService.deleteAnnotation(annotation.id).subscribe({
        next: () => {
          this.annotationState.markHighlightsStale();
          this.loadAnnotations(this.docState.selectedDocument.path);
        },
        error: (error) => {
          console.error('Error deleting annotation:', error);
        }
      });
    }
  }

  /**
   * Close annotation dialog and clear selection
   */
  closeAnnotationDialog(): void {
    this.uiState.setState('showAnnotationDialog', false);
    this.annotationState.clearAnnotationDialog();

    // Clear text selection
    window.getSelection()?.removeAllRanges();
  }
}
