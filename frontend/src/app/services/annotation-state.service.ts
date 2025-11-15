import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Annotation } from './annotation.service';

export interface AnnotationColor {
  name: string;
  value: string;
  color: string;
}

export interface AnnotationState {
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  currentAnnotation: Partial<Annotation>;
  editingAnnotation: Annotation | null;
  highlightsApplied: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationStateService {
  private readonly initialState: AnnotationState = {
    selectedText: '',
    selectionRange: null,
    currentAnnotation: { color: 'yellow', note: '' },
    editingAnnotation: null,
    highlightsApplied: false
  };

  public readonly availableColors: AnnotationColor[] = [
    { name: 'Yellow', value: 'yellow', color: '#fef3c7' },
    { name: 'Green', value: 'green', color: '#d1fae5' },
    { name: 'Blue', value: 'blue', color: '#dbeafe' },
    { name: 'Pink', value: 'pink', color: '#fce7f3' },
    { name: 'Purple', value: 'purple', color: '#e9d5ff' }
  ];

  private stateSubject = new BehaviorSubject<AnnotationState>(this.initialState);
  public state$: Observable<AnnotationState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current annotation state synchronously
   */
  getState(): AnnotationState {
    return this.stateSubject.value;
  }

  /**
   * Update a single annotation state property
   */
  setState<K extends keyof AnnotationState>(key: K, value: AnnotationState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Update multiple annotation state properties at once
   */
  setMultipleStates(updates: Partial<AnnotationState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Handle text selection and prepare for annotation creation
   */
  handleTextSelection(selectedText: string, documentText: string): boolean {
    if (selectedText.trim().length === 0) return false;

    const startOffset = documentText.indexOf(selectedText);
    if (startOffset === -1) return false;

    this.setMultipleStates({
      selectedText: selectedText.trim(),
      selectionRange: {
        start: startOffset,
        end: startOffset + selectedText.length
      },
      currentAnnotation: {
        color: 'yellow',
        note: '',
        selectedText: selectedText.trim(),
        startOffset: startOffset,
        endOffset: startOffset + selectedText.length
      },
      editingAnnotation: null
    });

    return true;
  }

  /**
   * Prepare to edit an existing annotation
   */
  prepareEdit(annotation: Annotation): void {
    this.setMultipleStates({
      editingAnnotation: annotation,
      currentAnnotation: {
        note: annotation.note,
        color: annotation.color,
        selectedText: annotation.selectedText
      },
      selectedText: annotation.selectedText,
      selectionRange: {
        start: annotation.startOffset,
        end: annotation.endOffset
      }
    });
  }

  /**
   * Clear annotation dialog state
   */
  clearAnnotationDialog(): void {
    this.setMultipleStates({
      selectedText: '',
      selectionRange: null,
      currentAnnotation: { color: 'yellow', note: '' },
      editingAnnotation: null
    });
  }

  /**
   * Mark highlights as needing to be reapplied
   */
  markHighlightsStale(): void {
    this.setState('highlightsApplied', false);
  }

  /**
   * Mark highlights as applied
   */
  markHighlightsApplied(): void {
    this.setState('highlightsApplied', true);
  }

  /**
   * Generate a unique annotation ID
   */
  generateAnnotationId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the color style for a color name
   */
  getColorStyle(colorName: string): string {
    const color = this.availableColors.find(c => c.value === colorName);
    return color ? color.color : '#fef3c7';
  }

  /**
   * Reset all annotation state to initial values
   */
  reset(): void {
    this.stateSubject.next(this.initialState);
  }

  // Convenience getters for individual properties
  get selectedText(): string { return this.getState().selectedText; }
  get selectionRange(): { start: number; end: number } | null { return this.getState().selectionRange; }
  get currentAnnotation(): Partial<Annotation> { return this.getState().currentAnnotation; }
  get editingAnnotation(): Annotation | null { return this.getState().editingAnnotation; }
  get highlightsApplied(): boolean { return this.getState().highlightsApplied; }
}
