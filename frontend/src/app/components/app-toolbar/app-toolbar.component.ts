import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './app-toolbar.component.html',
  styleUrls: ['./app-toolbar.component.css']
})
export class AppToolbarComponent {
  @Input() title: string = '';
  @Input() totalDocuments: number = 0;
  @Input() totalWords: number = 0;
  @Input() showIndex: boolean = false;
  @Input() showCollections: boolean = false;
  @Input() showFavorites: boolean = false;
  @Input() showRecent: boolean = false;
  @Input() favoritesCount: number = 0;
  @Input() recentCount: number = 0;

  @Output() toggleIndex = new EventEmitter<void>();
  @Output() toggleCollections = new EventEmitter<void>();
  @Output() toggleFavorites = new EventEmitter<void>();
  @Output() toggleRecent = new EventEmitter<void>();
  @Output() openUploadDialog = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  onToggleIndex(): void {
    this.toggleIndex.emit();
  }

  onToggleCollections(): void {
    this.toggleCollections.emit();
  }

  onToggleFavorites(): void {
    this.toggleFavorites.emit();
  }

  onToggleRecent(): void {
    this.toggleRecent.emit();
  }

  onOpenUploadDialog(): void {
    this.openUploadDialog.emit();
  }

  onOpenSettings(): void {
    this.openSettings.emit();
  }
}
