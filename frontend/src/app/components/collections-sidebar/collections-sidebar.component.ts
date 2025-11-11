import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { CollectionService, Collection } from '../../services/collection.service';

@Component({
  selector: 'app-collections-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="collections-sidebar">
      <div class="sidebar-header">
        <h3>Collections</h3>
        <button mat-icon-button (click)="onCreateCollection()" matTooltip="Create Collection">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="collections-list" *ngIf="!loading && collections.length > 0">
        <div *ngFor="let collection of collections"
             class="collection-item"
             [class.selected]="selectedCollection?.id === collection.id"
             (click)="selectCollection(collection)">
          <div class="collection-color" [style.background-color]="collection.color"></div>
          <div class="collection-info">
            <div class="collection-name">{{ collection.name }}</div>
            <div class="collection-count">{{ collection.documentCount }} documents</div>
          </div>
          <div class="collection-actions" (click)="$event.stopPropagation()">
            <button mat-icon-button (click)="onEditCollection(collection)" matTooltip="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button (click)="onDeleteCollection(collection)" matTooltip="Delete" class="delete-btn">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && collections.length === 0">
        <mat-icon>folder_open</mat-icon>
        <p>No collections yet</p>
        <button mat-raised-button color="primary" (click)="onCreateCollection()">
          Create Your First Collection
        </button>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading collections...</p>
      </div>
    </div>
  `,
  styles: [`
    .collections-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--surface);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }

    .sidebar-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }

    .collections-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .collection-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--background);
      border: 1px solid var(--border-color);
    }

    .collection-item:hover {
      background: #f3f4f6;
      border-color: var(--primary-color);
    }

    .collection-item.selected {
      background: #dbeafe;
      border-color: var(--primary-color);
    }

    .collection-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .collection-info {
      flex: 1;
      min-width: 0;
    }

    .collection-name {
      font-weight: 500;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collection-count {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .collection-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .collection-item:hover .collection-actions {
      opacity: 1;
    }

    .collection-actions button {
      width: 32px;
      height: 32px;
      line-height: 32px;
    }

    .collection-actions mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .delete-btn:hover mat-icon {
      color: #ef4444;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .empty-state p {
      margin: 0 0 16px 0;
      font-size: 0.95rem;
    }

    .loading-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }
  `]
})
export class CollectionsSidebarComponent implements OnInit {
  @Output() createCollection = new EventEmitter<void>();
  @Output() editCollection = new EventEmitter<Collection>();
  @Output() deleteCollection = new EventEmitter<Collection>();
  @Output() collectionSelected = new EventEmitter<Collection | null>();

  collections: Collection[] = [];
  selectedCollection: Collection | null = null;
  loading = true;

  constructor(private collectionService: CollectionService) {}

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.loading = true;
    this.collectionService.getAllCollections().subscribe({
      next: (response) => {
        this.collections = response.collections;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading collections:', error);
        this.loading = false;
      }
    });
  }

  selectCollection(collection: Collection) {
    if (this.selectedCollection?.id === collection.id) {
      // Deselect if clicking the same collection
      this.selectedCollection = null;
      this.collectionSelected.emit(null);
    } else {
      this.selectedCollection = collection;
      this.collectionSelected.emit(collection);
    }
  }

  onCreateCollection() {
    this.createCollection.emit();
  }

  onEditCollection(collection: Collection) {
    this.editCollection.emit(collection);
  }

  onDeleteCollection(collection: Collection) {
    this.deleteCollection.emit(collection);
  }

  refresh() {
    this.loadCollections();
  }
}
