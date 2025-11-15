import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RecentDoc {
  path: string;
  title: string;
  viewedAt: number;
  topics: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RecentDocumentsService {
  private readonly RECENT_KEY = 'md-reader-recent';
  private readonly MAX_RECENT_ITEMS = 20;
  private recentSubject = new BehaviorSubject<RecentDoc[]>([]);

  public recent$: Observable<RecentDoc[]> = this.recentSubject.asObservable();

  constructor() {
    this.load();
  }

  /**
   * Load recent documents from localStorage
   */
  private load(): void {
    const stored = localStorage.getItem(this.RECENT_KEY);
    if (stored) {
      try {
        const recent = JSON.parse(stored);
        this.recentSubject.next(recent);
      } catch (e) {
        this.recentSubject.next([]);
      }
    }
  }

  /**
   * Get current recent documents synchronously
   */
  getRecent(): RecentDoc[] {
    return this.recentSubject.value;
  }

  /**
   * Add a document to recent documents
   */
  add(doc: RecentDoc): void {
    let recent = [...this.recentSubject.value];

    // Remove if already exists
    recent = recent.filter(d => d.path !== doc.path);

    // Add to beginning
    recent.unshift(doc);

    // Limit to MAX_RECENT_ITEMS
    if (recent.length > this.MAX_RECENT_ITEMS) {
      recent = recent.slice(0, this.MAX_RECENT_ITEMS);
    }

    this.saveRecent(recent);
  }

  /**
   * Clear all recent documents
   */
  clear(): void {
    localStorage.removeItem(this.RECENT_KEY);
    this.recentSubject.next([]);
  }

  /**
   * Save recent documents to localStorage and update observable
   */
  private saveRecent(recent: RecentDoc[]): void {
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(recent));
    this.recentSubject.next(recent);
  }
}
