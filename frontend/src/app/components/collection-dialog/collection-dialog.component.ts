import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Collection } from '../../services/collection-engine.service';

export interface CollectionDialogData {
  mode: 'create' | 'edit';
  collection?: Collection;
  availableColors: string[];
}

@Component({
  selector: 'app-collection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create Collection' : 'Edit Collection' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" placeholder="Enter collection name" autofocus>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Description (optional)</mat-label>
        <textarea matInput [(ngModel)]="description" rows="3" placeholder="Enter description"></textarea>
      </mat-form-field>

      <div class="color-picker">
        <label>Color</label>
        <div class="color-options">
          <div *ngFor="let color of data.availableColors"
               class="color-option"
               [class.selected]="selectedColor === color"
               [style.background-color]="color"
               (click)="selectedColor = color">
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!name || !name.trim()">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .color-picker {
      margin-bottom: 16px;
    }

    .color-picker label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .color-options {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .color-option {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 3px solid transparent;
    }

    .color-option:hover {
      transform: scale(1.1);
    }

    .color-option.selected {
      border-color: var(--text-primary);
      box-shadow: 0 0 0 2px var(--surface);
    }

    mat-dialog-content {
      min-width: 400px;
      padding: 20px 24px;
    }
  `]
})
export class CollectionDialogComponent {
  name: string = '';
  description: string = '';
  selectedColor: string;

  constructor(
    public dialogRef: MatDialogRef<CollectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CollectionDialogData
  ) {
    if (data.mode === 'edit' && data.collection) {
      this.name = data.collection.name;
      this.description = data.collection.description || '';
      this.selectedColor = data.collection.color;
    } else {
      this.selectedColor = data.availableColors[0];
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.name || !this.name.trim()) {
      return;
    }

    const result = {
      name: this.name.trim(),
      description: this.description.trim(),
      color: this.selectedColor
    };

    this.dialogRef.close(result);
  }
}
