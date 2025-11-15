import { Injectable } from '@angular/core';
import { Annotation } from './annotation.service';
import { AnnotationStateService } from './annotation-state.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationHighlightService {

  constructor(private annotationState: AnnotationStateService) {}

  /**
   * Apply highlights to all annotations in the document
   */
  applyHighlights(
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
    this.annotationState.markHighlightsApplied();
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
          span.style.backgroundColor = this.annotationState.getColorStyle(annotation.color);
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
