import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchResult } from '../../services/search-engine.service';

@Component({
  selector: 'app-document-index',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './document-index.component.html',
  styleUrls: ['./document-index.component.css']
})
export class DocumentIndexComponent {
  @Input() alphabetSections: string[] = [];
  @Input() groupedDocuments: { [key: string]: SearchResult[] } = {};
  @Input() totalDocuments: number = 0;
  @Input() favoriteChecker!: (path: string) => boolean;

  @Output() openDocument = new EventEmitter<SearchResult>();
  @Output() toggleFavorite = new EventEmitter<string>();

  onOpenDocument(doc: SearchResult): void {
    this.openDocument.emit(doc);
  }

  onToggleFavorite(event: Event, path: string): void {
    event.stopPropagation();
    this.toggleFavorite.emit(path);
  }

  isFavorite(path: string): boolean {
    return this.favoriteChecker ? this.favoriteChecker(path) : false;
  }
}
