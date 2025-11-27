import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApplicationStateService } from './application-state.service';
import { SearchResult } from './search-engine.service';
import { CollectionDialogComponent } from '../components/collection-dialog/collection-dialog.component';
import { DocumentCollectionsDialogComponent } from '../components/document-collections-dialog/document-collections-dialog.component';
import { CollectionsSidebarComponent } from '../components/collections-sidebar/collections-sidebar.component';

// Types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  documentCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDocument {
  path: string;
  title: string;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  modifiedAt: number;
}

/**
 * Consolidated collection engine service
 * Combines HTTP operations and business logic orchestration
 * Merges: CollectionService + CollectionManagerService
 */
@Injectable({
  providedIn: 'root'
})
export class CollectionEngineService {
  private apiUrl = 'http://localhost:3011/api';

  // State management (from CollectionManagerService)
  private selectedCollectionSubject = new BehaviorSubject<Collection | null>(null);
  public selectedCollection$: Observable<Collection | null> = this.selectedCollectionSubject.asObservable();

  private collectionsSidebarRef: CollectionsSidebarComponent | null = null;
  private onSearchCallback: ((query: string) => void) | null = null;

  constructor(
    private http: HttpClient,
    private appState: ApplicationStateService,
    private dialog: MatDialog
  ) {}

  // ============================================
  // HTTP Operations (from CollectionService)
  // ============================================

  getAllCollections(): Observable<{ collections: Collection[] }> {
    return this.http.get<{ collections: Collection[] }>(`${this.apiUrl}/collections`);
  }

  getCollection(id: string): Observable<Collection> {
    return this.http.get<Collection>(`${this.apiUrl}/collections/${id}`);
  }

  createCollection(collection: Partial<Collection>): Observable<{ message: string; id: string }> {
    const id = this.generateId();
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/collections`, {
      id,
      ...collection
    });
  }

  updateCollection(id: string, updates: Partial<Collection>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/collections/${id}`, updates);
  }

  deleteCollection(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/collections/${id}`);
  }

  getCollectionDocuments(collectionId: string, limit = 100, offset = 0): Observable<{ documents: CollectionDocument[] }> {
    return this.http.get<{ documents: CollectionDocument[] }>(
      `${this.apiUrl}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`
    );
  }

  getDocumentCollections(documentPath: string): Observable<{ collections: Collection[] }> {
    return this.http.get<{ collections: Collection[] }>(
      `${this.apiUrl}/documents/collections?documentPath=${encodeURIComponent(documentPath)}`
    );
  }

  addDocumentToCollection(documentPath: string, collectionId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/documents`,
      { documentPath }
    );
  }

  removeDocumentFromCollection(documentPath: string, collectionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/documents`,
      { body: { documentPath } }
    );
  }

  addDocumentsToCollection(documentPaths: string[], collectionId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/collections/${collectionId}/documents/bulk`,
      { documentPaths, action: 'add' }
    );
  }

  removeDocumentsFromCollection(documentPaths: string[], collectionId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/collections/${collectionId}/documents/bulk`,
      { documentPaths, action: 'remove' }
    );
  }

  // ============================================
  // Utility Methods
  // ============================================

  private generateId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAvailableColors(): string[] {
    return [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1'  // indigo
    ];
  }

  // ============================================
  // Business Logic Orchestration (from CollectionManagerService)
  // ============================================

  /**
   * Get current selected collection
   */
  get selectedCollection(): Collection | null {
    return this.selectedCollectionSubject.value;
  }

  /**
   * Set selected collection
   */
  set selectedCollection(value: Collection | null) {
    this.selectedCollectionSubject.next(value);
  }

  /**
   * Register the collections sidebar component for refresh operations
   */
  registerSidebar(sidebar: CollectionsSidebarComponent): void {
    this.collectionsSidebarRef = sidebar;
  }

  /**
   * Register search callback for re-searching when collection filter is cleared
   */
  registerSearchCallback(callback: (query: string) => void): void {
    this.onSearchCallback = callback;
  }

  /**
   * Open dialog to create a new collection
   */
  createCollectionDialog(): void {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '500px',
      data: {
        mode: 'create',
        availableColors: this.getAvailableColors()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createCollection(result).subscribe({
          next: (response) => {
            console.log('Collection created:', response);
            this.refreshSidebar();
          },
          error: (error) => {
            console.error('Error creating collection:', error);
            alert('Failed to create collection: ' + (error.error?.error || error.message));
          }
        });
      }
    });
  }

  /**
   * Open dialog to edit an existing collection
   */
  editCollectionDialog(collection: Collection): void {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '500px',
      data: {
        mode: 'edit',
        collection: collection,
        availableColors: this.getAvailableColors()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateCollection(collection.id, result).subscribe({
          next: (response) => {
            console.log('Collection updated:', response);
            this.refreshSidebar();
          },
          error: (error) => {
            console.error('Error updating collection:', error);
            alert('Failed to update collection: ' + (error.error?.error || error.message));
          }
        });
      }
    });
  }

  /**
   * Delete a collection with confirmation
   */
  deleteCollectionWithConfirm(collection: Collection): void {
    const confirmMessage = `Are you sure you want to delete the collection "${collection.name}"? This will not delete the documents, only the collection.`;
    if (confirm(confirmMessage)) {
      this.deleteCollection(collection.id).subscribe({
        next: () => {
          console.log('Collection deleted');
          // Clear selection if this was the selected collection
          if (this.selectedCollection?.id === collection.id) {
            this.selectedCollection = null;
          }
          this.refreshSidebar();
        },
        error: (error) => {
          console.error('Error deleting collection:', error);
          alert('Failed to delete collection: ' + (error.error?.error || error.message));
        }
      });
    }
  }

  /**
   * Handle collection selection
   */
  selectCollection(collection: Collection | null, hasSearched: boolean): void {
    this.selectedCollection = collection;
    console.log('Selected collection:', collection);

    // Filter search results by selected collection
    if (collection && hasSearched) {
      this.filterSearchResultsByCollection(collection.id);
    } else if (!collection && hasSearched && this.onSearchCallback) {
      // Re-run search without collection filter
      this.onSearchCallback(this.appState.searchQuery);
    }
  }

  /**
   * Open dialog to manage document collections
   */
  openDocumentCollectionsDialog(document: SearchResult): void {
    const dialogRef = this.dialog.open(DocumentCollectionsDialogComponent, {
      width: '500px',
      data: {
        documentPath: document.path,
        documentTitle: document.title
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Collections were changed, refresh the sidebar
        this.refreshSidebar();
      }
    });
  }

  /**
   * Load collections for each search result
   */
  loadCollectionsForResults(): void {
    this.appState.searchResults.forEach(result => {
      this.getDocumentCollections(result.path).subscribe({
        next: (response) => {
          result.collections = response.collections;
        },
        error: (error) => {
          console.error('Error loading collections for document:', error);
          result.collections = [];
        }
      });
    });
  }

  /**
   * Filter search results by collection
   */
  filterSearchResultsByCollection(collectionId: string): void {
    this.getCollectionDocuments(collectionId).subscribe({
      next: (response) => {
        const collectionDocPaths = new Set(response.documents.map(d => d.path));
        // Filter current search results to only show documents in the collection
        const filteredResults = this.appState.searchResults.filter(result =>
          collectionDocPaths.has(result.path)
        );
        this.appState.setSearchResults(filteredResults);
      },
      error: (error) => {
        console.error('Error filtering by collection:', error);
      }
    });
  }

  /**
   * Refresh the collections sidebar
   */
  private refreshSidebar(): void {
    if (this.collectionsSidebarRef) {
      this.collectionsSidebarRef.refresh();
    }
  }
}
