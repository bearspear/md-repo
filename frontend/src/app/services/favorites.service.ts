import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly FAVORITES_KEY = 'md-reader-favorites';
  private favoritesSubject = new BehaviorSubject<string[]>([]);

  public favorites$: Observable<string[]> = this.favoritesSubject.asObservable();

  constructor() {
    this.load();
  }

  /**
   * Load favorites from localStorage
   */
  private load(): void {
    const stored = localStorage.getItem(this.FAVORITES_KEY);
    if (stored) {
      try {
        const favorites = JSON.parse(stored);
        this.favoritesSubject.next(favorites);
      } catch (e) {
        this.favoritesSubject.next([]);
      }
    }
  }

  /**
   * Get current favorites synchronously
   */
  getFavorites(): string[] {
    return this.favoritesSubject.value;
  }

  /**
   * Toggle a document path in favorites
   */
  toggle(path: string): void {
    const favorites = [...this.favoritesSubject.value];
    const index = favorites.indexOf(path);

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(path);
    }

    this.saveFavorites(favorites);
  }

  /**
   * Check if a path is favorited
   */
  isFavorite(path: string): boolean {
    return this.favoritesSubject.value.includes(path);
  }

  /**
   * Add a path to favorites
   */
  add(path: string): void {
    if (!this.isFavorite(path)) {
      const favorites = [...this.favoritesSubject.value, path];
      this.saveFavorites(favorites);
    }
  }

  /**
   * Remove a path from favorites
   */
  remove(path: string): void {
    const favorites = this.favoritesSubject.value.filter(p => p !== path);
    this.saveFavorites(favorites);
  }

  /**
   * Clear all favorites
   */
  clear(): void {
    this.saveFavorites([]);
  }

  /**
   * Save favorites to localStorage and update observable
   */
  private saveFavorites(favorites: string[]): void {
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    this.favoritesSubject.next(favorites);
  }
}
