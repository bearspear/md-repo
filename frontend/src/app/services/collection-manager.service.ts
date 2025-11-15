import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { CollectionService, Collection } from './collection.service';
import { SearchResult } from './search.service';
import { SearchStateService } from './search-state.service';
import { CollectionDialogComponent } from '../components/collection-dialog/collection-dialog.component';
import { DocumentCollectionsDialogComponent } from '../components/document-collections-dialog/document-collections-dialog.component';
import { CollectionsSidebarComponent } from '../components/collections-sidebar/collections-sidebar.component';

@Injectable({
  providedIn: 'root'
})
export class CollectionManagerService {
  private selectedCollectionSubject = new BehaviorSubject<Collection | null>(null);
  public selectedCollection$: Observable<Collection | null> = this.selectedCollectionSubject.asObservable();

  private collectionsSidebarRef: CollectionsSidebarComponent | null = null;
  private onSearchCallback: ((query: string) => void) | null = null;

  constructor(
    private collectionService: CollectionService,
    private searchState: SearchStateService,
    private dialog: MatDialog
  ) {}

  /**
   * Get available collection colors
   */
  getAvailableColors(): string[] {
    return this.collectionService.getAvailableColors();
  }

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
  createCollection(): void {
    const dialogRef = this.dialog.open(CollectionDialogComponent, {
      width: '500px',
      data: {
        mode: 'create',
        availableColors: this.getAvailableColors()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.collectionService.createCollection(result).subscribe({
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
  editCollection(collection: Collection): void {
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
        this.collectionService.updateCollection(collection.id, result).subscribe({
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
  deleteCollection(collection: Collection): void {
    const confirmMessage = `Are you sure you want to delete the collection "${collection.name}"? This will not delete the documents, only the collection.`;
    if (confirm(confirmMessage)) {
      this.collectionService.deleteCollection(collection.id).subscribe({
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
      this.onSearchCallback(this.searchState.searchQuery);
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
    this.searchState.searchResults.forEach(result => {
      this.collectionService.getDocumentCollections(result.path).subscribe({
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
    this.collectionService.getCollectionDocuments(collectionId).subscribe({
      next: (response) => {
        const collectionDocPaths = new Set(response.documents.map(d => d.path));
        // Filter current search results to only show documents in the collection
        const filteredResults = this.searchState.searchResults.filter(result =>
          collectionDocPaths.has(result.path)
        );
        this.searchState.setSearchResults(filteredResults);
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
