import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type PreviewMode = 'editor' | 'split' | 'preview';

export interface EditorState {
  previewMode: PreviewMode;
}

@Injectable({
  providedIn: 'root'
})
export class EditorStateService {
  private readonly initialState: EditorState = {
    previewMode: 'editor'
  };

  private stateSubject = new BehaviorSubject<EditorState>(this.initialState);
  public state$: Observable<EditorState> = this.stateSubject.asObservable();

  constructor() {}

  /**
   * Get current editor state synchronously
   */
  getState(): EditorState {
    return this.stateSubject.value;
  }

  /**
   * Update a single editor state property
   */
  setState<K extends keyof EditorState>(key: K, value: EditorState[K]): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      [key]: value
    });
  }

  /**
   * Cycle through preview modes: editor -> split -> preview -> editor
   */
  cyclePreviewMode(): void {
    const modes: PreviewMode[] = ['editor', 'split', 'preview'];
    const currentIndex = modes.indexOf(this.stateSubject.value.previewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setState('previewMode', modes[nextIndex]);
  }

  /**
   * Reset all editor state to initial values
   */
  reset(): void {
    this.stateSubject.next(this.initialState);
  }

  // Convenience getter
  get previewMode(): PreviewMode {
    return this.getState().previewMode;
  }
}
