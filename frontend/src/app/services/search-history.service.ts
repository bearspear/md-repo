import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchHistoryService {
  private readonly HISTORY_KEY = 'md-reader-search-history';
  private readonly MAX_HISTORY_ITEMS = 10;
  private historySubject = new BehaviorSubject<string[]>([]);

  public history$: Observable<string[]> = this.historySubject.asObservable();

  constructor() {
    this.load();
  }

  /**
   * Load search history from localStorage
   */
  private load(): void {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    if (stored) {
      try {
        const history = JSON.parse(stored);
        this.historySubject.next(history);
      } catch (e) {
        this.historySubject.next([]);
      }
    }
  }

  /**
   * Get current search history synchronously
   */
  getHistory(): string[] {
    return this.historySubject.value;
  }

  /**
   * Add a query to search history
   */
  add(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    let history = [...this.historySubject.value];

    // Remove if already exists
    history = history.filter(q => q !== trimmedQuery);

    // Add to beginning
    history.unshift(trimmedQuery);

    // Limit to MAX_HISTORY_ITEMS
    if (history.length > this.MAX_HISTORY_ITEMS) {
      history = history.slice(0, this.MAX_HISTORY_ITEMS);
    }

    this.saveHistory(history);
  }

  /**
   * Clear all search history
   */
  clear(): void {
    localStorage.removeItem(this.HISTORY_KEY);
    this.historySubject.next([]);
  }

  /**
   * Save history to localStorage and update observable
   */
  private saveHistory(history: string[]): void {
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    this.historySubject.next(history);
  }
}
