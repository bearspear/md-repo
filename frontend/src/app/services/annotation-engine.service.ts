import { Injectable, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationStateService } from './application-state.service';

// Types
export interface Annotation {
  id: string;
  documentPath: string;
  selectedText: string;
  note: string;
  color: string;
  startOffset: number;
  endOffset: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Consolidated annotation engine service
 * Combines HTTP operations, business logic orchestration, and DOM highlighting
 * Merges: AnnotationService + AnnotationManagerService + AnnotationHighlightService
 */
@Injectable({
  providedIn: 'root'
})
export class AnnotationEngineService {
  private apiUrl = 'http://localhost:3011/api';

  constructor(
    private http: HttpClient,
    private appState: ApplicationStateService
  ) {}

  // ============================================
  // HTTP Operations (from AnnotationService)
  // ============================================

  getAnnotations(documentPath: string): Observable<{ annotations: Annotation[] }> {
    return this.http.get<{ annotations: Annotation[] }>(
      `${this.apiUrl}/annotations?documentPath=${encodeURIComponent(documentPath)}`
    );
  }

  createAnnotation(annotation: Omit<Annotation, 'createdAt' | 'updatedAt'>): Observable<any> {
    return this.http.post(`${this.apiUrl}/annotations`, annotation);
  }

  updateAnnotation(id: string, updates: { note?: string; color?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/annotations/${id}`, updates);
  }

  deleteAnnotation(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/annotations/${id}`);
  }

  // ============================================
  // Business Logic Orchestration (from AnnotationManagerService)
  // ============================================

  /**
   * Load annotations for a document
   */
  loadAnnotations(documentPath: string): void {
    this.appState.markHighlightsStale();
    this.getAnnotations(documentPath).subscribe({
      next: (response) => {
        this.appState.setDocumentState('annotations', response.annotations);
        this.appState.markHighlightsStale();
      },
      error: (error) => {
        console.error('Error loading annotations:', error);
        this.appState.setDocumentState('annotations', []);
      }
    });
  }

  /**
   * Apply highlights to document content
   */
  applyHighlights(documentContent: ElementRef, onEdit: (annotation: Annotation) => void): void {
    if (!documentContent || !this.appState.selectedDocument || this.appState.annotations.length === 0) {
      return;
    }

    const contentElement = documentContent.nativeElement;
    this.applyHighlightsToElement(
      contentElement,
      this.appState.annotations,
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
      const documentText = this.appState.selectedDocument.rawContent;

      if (this.appState.handleTextSelection(selectedText, documentText)) {
        this.appState.setState('showAnnotationDialog', true);
        return true;
      }
    }
    return false;
  }

  /**
   * Save annotation (create or update)
   */
  saveAnnotation(onComplete: () => void): void {
    if (!this.appState.selectedDocument || !this.appState.selectionRange) return;

    const annotation = {
      id: this.appState.editingAnnotation?.id || this.appState.generateAnnotationId(),
      documentPath: this.appState.selectedDocument.path,
      selectedText: this.appState.selectedText,
      note: this.appState.currentAnnotation.note || '',
      color: this.appState.currentAnnotation.color || 'yellow',
      startOffset: this.appState.selectionRange.start,
      endOffset: this.appState.selectionRange.end
    };

    if (this.appState.editingAnnotation) {
      // Update existing annotation
      this.updateAnnotation(annotation.id, {
        note: annotation.note,
        color: annotation.color
      }).subscribe({
        next: () => {
          this.loadAnnotations(this.appState.selectedDocument.path);
          this.closeAnnotationDialog();
          if (onComplete) onComplete();
        },
        error: (error) => {
          console.error('Error updating annotation:', error);
        }
      });
    } else {
      // Create new annotation
      this.createAnnotation(annotation).subscribe({
        next: () => {
          this.appState.markHighlightsStale();
          this.loadAnnotations(this.appState.selectedDocument.path);
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
    this.appState.prepareEditAnnotation(annotation);
    this.appState.setState('showAnnotationDialog', true);
  }

  /**
   * Delete an annotation
   */
  deleteAnnotationWithConfirm(annotation: Annotation): void {
    if (confirm('Are you sure you want to delete this annotation?')) {
      this.deleteAnnotation(annotation.id).subscribe({
        next: () => {
          this.appState.markHighlightsStale();
          this.loadAnnotations(this.appState.selectedDocument.path);
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
    this.appState.setState('showAnnotationDialog', false);
    this.appState.clearAnnotationDialog();

    // Clear text selection
    window.getSelection()?.removeAllRanges();
  }

  // ============================================
  // DOM Highlighting (from AnnotationHighlightService)
  // ============================================

  /**
   * Apply highlights to all annotations in the document
   */
  private applyHighlightsToElement(
    contentElement: HTMLElement,
    annotations: Annotation[],
    onAnnotationClick: (annotation: Annotation) => void
  ): void {
    if (!contentElement || annotations.length === 0) {
      return;
    }

    const markdownElement = contentElement.querySelector('markdown');
    if (!markdownElement) {
      return;
    }

    // Sort annotations by start offset (descending) to apply from end to start
    const sortedAnnotations = [...annotations].sort((a, b) => b.startOffset - a.startOffset);

    // Apply highlights to the text content
    this.highlightTextInElement(markdownElement, sortedAnnotations, onAnnotationClick);
    this.appState.markHighlightsApplied();
  }

  /**
   * Recursively highlight text in an element
   */
  private highlightTextInElement(
    element: Element,
    annotations: Annotation[],
    onAnnotationClick: (annotation: Annotation) => void
  ): void {
    // Get all text nodes
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Build a map of character positions to text nodes
    let charOffset = 0;
    const nodeMap: { node: Text, start: number, end: number }[] = [];

    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      // Skip empty nodes and code blocks
      const parent = textNode.parentElement;
      if (text.trim().length === 0 || parent?.tagName === 'CODE' || parent?.tagName === 'PRE') {
        continue;
      }

      nodeMap.push({
        node: textNode,
        start: charOffset,
        end: charOffset + text.length
      });
      charOffset += text.length;
    }

    // Apply annotations
    for (const annotation of annotations) {
      for (const nodeInfo of nodeMap) {
        // Check if this annotation overlaps with this text node
        if (annotation.endOffset <= nodeInfo.start || annotation.startOffset >= nodeInfo.end) {
          continue; // No overlap
        }

        // Calculate the overlap
        const overlapStart = Math.max(annotation.startOffset, nodeInfo.start);
        const overlapEnd = Math.min(annotation.endOffset, nodeInfo.end);

        // Calculate positions within the text node
        const nodeStart = overlapStart - nodeInfo.start;
        const nodeEnd = overlapEnd - nodeInfo.start;

        const text = nodeInfo.node.textContent || '';

        // Split the text node and wrap the overlapping part
        if (nodeStart >= 0 && nodeEnd <= text.length && nodeStart < nodeEnd) {
          const before = text.substring(0, nodeStart);
          const highlighted = text.substring(nodeStart, nodeEnd);
          const after = text.substring(nodeEnd);

          const span = document.createElement('span');
          span.className = 'annotation-highlight';
          span.style.backgroundColor = this.appState.getColorStyle(annotation.color);
          span.style.cursor = 'pointer';
          span.title = annotation.note || 'Click to view annotation';
          span.textContent = highlighted;

          // Add click handler to show annotation details
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            onAnnotationClick(annotation);
          });

          const parent = nodeInfo.node.parentNode;
          if (parent) {
            if (before) {
              parent.insertBefore(document.createTextNode(before), nodeInfo.node);
            }
            parent.insertBefore(span, nodeInfo.node);
            if (after) {
              parent.insertBefore(document.createTextNode(after), nodeInfo.node);
            }
            parent.removeChild(nodeInfo.node);
          }
        }
      }
    }
  }
}
