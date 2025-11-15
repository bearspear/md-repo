import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-favorites-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './favorites-panel.component.html',
  styleUrls: ['./favorites-panel.component.css']
})
export class FavoritesPanelComponent {
  @Input() favorites: string[] = [];
  @Output() openDocument = new EventEmitter<string>();
  @Output() toggleFavorite = new EventEmitter<string>();

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  onOpenDocument(path: string): void {
    this.openDocument.emit(path);
  }

  onToggleFavorite(event: Event, path: string): void {
    event.stopPropagation();
    this.toggleFavorite.emit(path);
  }
}
