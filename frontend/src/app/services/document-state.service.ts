import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SearchResult } from './search.service';
import { Annotation } from './annotation.service';

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

export interface DocumentState {
  selectedDocument: any | null;
  documentToc: TocItem[];
  relatedDocuments: SearchResult[];
  annotations: Annotation[];
  editedContent: string;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentStateService {
  private readonly initialState: DocumentState = {
    selectedDocument: null,
    documentToc: [],
    relatedDocuments: [],
    annotations: [],
    editedContent: '',
    hasUnsavedChanges: false,
    lastSavedAt: null
  };

  private stateSubject = new BehaviorSubject<DocumentState>(this.initialState);
  public state$: Observable<DocumentState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current document state synchronously
   */
  getState(): DocumentState {
    return this.stateSubject.value;
  }

  /**
   * Update a single document state property
   */
  setState<K extends keyof DocumentState>(key: K, value: DocumentState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Update multiple document state properties at once
   */
  setMultipleStates(updates: Partial<DocumentState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Set the selected document and optionally update related state
   */
  selectDocument(document: any, toc: TocItem[] = []): void {
    this.setMultipleStates({
      selectedDocument: document,
      documentToc: toc,
      editedContent: document?.rawContent || '',
      hasUnsavedChanges: false
    });
  }

  /**
   * Clear the selected document and reset related state
   */
  clearDocument(): void {
    this.setMultipleStates({
      selectedDocument: null,
      documentToc: [],
      editedContent: '',
      hasUnsavedChanges: false,
      lastSavedAt: null,
      annotations: []
    });
  }

  /**
   * Update the edited content and mark as having unsaved changes
   */
  updateEditedContent(content: string): void {
    this.setMultipleStates({
      editedContent: content,
      hasUnsavedChanges: true
    });
  }

  /**
   * Mark content as saved
   */
  markAsSaved(): void {
    this.setMultipleStates({
      hasUnsavedChanges: false,
      lastSavedAt: new Date()
    });
  }

  /**
   * Reset editing state to current document content
   */
  resetEditingState(): void {
    const currentState = this.stateSubject.value;
    this.setMultipleStates({
      editedContent: currentState.selectedDocument?.rawContent || '',
      hasUnsavedChanges: false
    });
  }

  /**
   * Update the document's content after save
   */
  updateDocumentContent(content: string): void {
    const currentState = this.stateSubject.value;
    if (currentState.selectedDocument) {
      const updatedDoc = {
        ...currentState.selectedDocument,
        rawContent: content,
        content: content
      };
      this.setState('selectedDocument', updatedDoc);
    }
  }

  /**
   * Reset all document state to initial values
   */
  reset(): void {
    this.stateSubject.next(this.initialState);
  }

  // Convenience getters for individual properties
  get selectedDocument(): any | null { return this.getState().selectedDocument; }
  get documentToc(): TocItem[] { return this.getState().documentToc; }
  get relatedDocuments(): SearchResult[] { return this.getState().relatedDocuments; }
  get annotations(): Annotation[] { return this.getState().annotations; }
  get editedContent(): string { return this.getState().editedContent; }
  get hasUnsavedChanges(): boolean { return this.getState().hasUnsavedChanges; }
  get lastSavedAt(): Date | null { return this.getState().lastSavedAt; }
}
