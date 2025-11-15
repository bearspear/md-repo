import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchResultWithCollections } from '../../services/search-state.service';

@Component({
  selector: 'app-search-result-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './search-result-card.component.html',
  styleUrls: ['./search-result-card.component.css']
})
export class SearchResultCardComponent {
  @Input() result!: SearchResultWithCollections;
  @Input() isFavorite: boolean = false;

  @Output() openDocument = new EventEmitter<SearchResultWithCollections>();
  @Output() toggleFavorite = new EventEmitter<string>();
  @Output() openCollections = new EventEmitter<SearchResultWithCollections>();

  onOpenDocument(): void {
    this.openDocument.emit(this.result);
  }

  onToggleFavorite(event: Event): void {
    event.stopPropagation();
    this.toggleFavorite.emit(this.result.path);
  }

  onOpenCollections(event: Event): void {
    event.stopPropagation();
    this.openCollections.emit(this.result);
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
