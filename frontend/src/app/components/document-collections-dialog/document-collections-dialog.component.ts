import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionService, Collection } from '../../services/collection.service';

export interface DocumentCollectionsDialogData {
  documentPath: string;
  documentTitle: string;
}

@Component({
  selector: 'app-document-collections-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Manage Collections</h2>
    <p class="document-title">{{ data.documentTitle }}</p>

    <mat-dialog-content>
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading collections...</p>
      </div>

      <div *ngIf="!loading && collections.length === 0" class="empty-state">
        <p>No collections available. Create a collection first.</p>
      </div>

      <div *ngIf="!loading && collections.length > 0" class="collections-list">
        <div *ngFor="let collection of collections" class="collection-item">
          <mat-checkbox
            [(ngModel)]="collection.selected"
            [disabled]="saving"
            (change)="onCollectionToggle(collection)">
            <div class="collection-info">
              <div class="collection-color" [style.background-color]="collection.color"></div>
              <span class="collection-name">{{ collection.name }}</span>
              <span class="collection-count">({{ collection.documentCount }} docs)</span>
            </div>
          </mat-checkbox>
        </div>
      </div>

      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="saving">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="saving || !hasChanges">
        <span *ngIf="!saving">Save Changes</span>
        <span *ngIf="saving">Saving...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .document-title {
      margin: 0 24px 16px;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    mat-dialog-content {
      min-width: 400px;
      min-height: 200px;
      padding: 20px 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary);
    }

    .loading-container mat-spinner {
      margin-bottom: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary);
    }

    .collections-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .collection-item {
      padding: 8px;
      border-radius: var(--radius-md);
      transition: background-color 0.2s ease;
    }

    .collection-item:hover {
      background-color: #f3f4f6;
    }

    .collection-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .collection-color {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .collection-name {
      font-weight: 500;
    }

    .collection-count {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .error-message {
      margin-top: 16px;
      padding: 12px;
      background-color: #fef2f2;
      color: #dc2626;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }
  `]
})
export class DocumentCollectionsDialogComponent implements OnInit {
  collections: (Collection & { selected: boolean })[] = [];
  initialSelections: Set<string> = new Set();
  loading = true;
  saving = false;
  errorMessage = '';
  hasChanges = false;

  constructor(
    public dialogRef: MatDialogRef<DocumentCollectionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentCollectionsDialogData,
    private collectionService: CollectionService
  ) {}

  ngOnInit() {
    this.loadCollectionsAndAssignments();
  }

  loadCollectionsAndAssignments() {
    this.loading = true;
    this.errorMessage = '';

    // Load all collections
    this.collectionService.getAllCollections().subscribe({
      next: (response) => {
        const allCollections = response.collections.map(c => ({ ...c, selected: false }));

        // Load document's current collections
        this.collectionService.getDocumentCollections(this.data.documentPath).subscribe({
          next: (docResponse) => {
            const documentCollectionIds = new Set(docResponse.collections.map(c => c.id));

            // Mark collections that already contain this document
            this.collections = allCollections.map(c => ({
              ...c,
              selected: documentCollectionIds.has(c.id)
            }));

            // Store initial selections
            this.initialSelections = new Set(
              this.collections.filter(c => c.selected).map(c => c.id)
            );

            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading document collections:', error);
            // If error, just show all collections unselected
            this.collections = allCollections;
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading collections:', error);
        this.errorMessage = 'Failed to load collections';
        this.loading = false;
      }
    });
  }

  onCollectionToggle(collection: Collection & { selected: boolean }) {
    this.updateHasChanges();
  }

  updateHasChanges() {
    const currentSelections = new Set(
      this.collections.filter(c => c.selected).map(c => c.id)
    );

    // Check if selections have changed
    this.hasChanges =
      currentSelections.size !== this.initialSelections.size ||
      [...currentSelections].some(id => !this.initialSelections.has(id));
  }

  onSave() {
    if (!this.hasChanges) {
      this.dialogRef.close(false);
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const currentSelections = new Set(
      this.collections.filter(c => c.selected).map(c => c.id)
    );

    // Determine which collections to add and remove
    const toAdd = [...currentSelections].filter(id => !this.initialSelections.has(id));
    const toRemove = [...this.initialSelections].filter(id => !currentSelections.has(id));

    let operations = 0;
    let completedOperations = 0;
    let hasError = false;

    const checkComplete = () => {
      if (completedOperations === operations) {
        if (!hasError) {
          this.dialogRef.close(true); // true indicates changes were made
        } else {
          this.saving = false;
        }
      }
    };

    // Add to collections
    toAdd.forEach(collectionId => {
      operations++;
      this.collectionService.addDocumentToCollection(this.data.documentPath, collectionId).subscribe({
        next: () => {
          completedOperations++;
          checkComplete();
        },
        error: (error) => {
          console.error('Error adding to collection:', error);
          this.errorMessage = 'Some changes failed to save';
          hasError = true;
          completedOperations++;
          checkComplete();
        }
      });
    });

    // Remove from collections
    toRemove.forEach(collectionId => {
      operations++;
      this.collectionService.removeDocumentFromCollection(this.data.documentPath, collectionId).subscribe({
        next: () => {
          completedOperations++;
          checkComplete();
        },
        error: (error) => {
          console.error('Error removing from collection:', error);
          this.errorMessage = 'Some changes failed to save';
          hasError = true;
          completedOperations++;
          checkComplete();
        }
      });
    });

    // If no operations, close immediately
    if (operations === 0) {
      this.dialogRef.close(false);
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
