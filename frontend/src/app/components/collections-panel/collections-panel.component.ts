import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CollectionsSidebarComponent } from '../collections-sidebar/collections-sidebar.component';

@Component({
  selector: 'app-collections-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    CollectionsSidebarComponent
  ],
  templateUrl: './collections-panel.component.html',
  styleUrls: ['./collections-panel.component.css']
})
export class CollectionsPanelComponent {
  @Output() close = new EventEmitter<void>();
  @Output() createCollection = new EventEmitter<void>();
  @Output() editCollection = new EventEmitter<any>();
  @Output() deleteCollection = new EventEmitter<any>();
  @Output() collectionSelected = new EventEmitter<any>();

  onClose(): void {
    this.close.emit();
  }

  onCreateCollection(): void {
    this.createCollection.emit();
  }

  onEditCollection(event: any): void {
    this.editCollection.emit(event);
  }

  onDeleteCollection(event: any): void {
    this.deleteCollection.emit(event);
  }

  onCollectionSelected(event: any): void {
    this.collectionSelected.emit(event);
  }
}
