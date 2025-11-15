import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Topic, Tag } from '../../services/search.service';

@Component({
  selector: 'app-search-filters-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './search-filters-container.component.html',
  styleUrls: ['./search-filters-container.component.css']
})
export class SearchFiltersContainerComponent {
  @Input() showFilters: boolean = false;
  @Input() hasActiveFilters: boolean = false;
  @Input() availableTopics: Topic[] = [];
  @Input() availableTags: Tag[] = [];
  @Input() selectedTopics: string[] = [];
  @Input() selectedTags: string[] = [];
  @Input() contentType: string = '';
  @Input() dateFrom: Date | null = null;
  @Input() dateTo: Date | null = null;
  @Input() canSaveSearch: boolean = false;

  @Output() toggleFilters = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() toggleTopic = new EventEmitter<string>();
  @Output() toggleTag = new EventEmitter<string>();
  @Output() contentTypeChange = new EventEmitter<string>();
  @Output() dateChange = new EventEmitter<void>();
  @Output() saveSearch = new EventEmitter<void>();

  onToggleFilters(): void {
    this.toggleFilters.emit();
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onToggleTopic(topic: string): void {
    this.toggleTopic.emit(topic);
  }

  onToggleTag(tag: string): void {
    this.toggleTag.emit(tag);
  }

  onContentTypeChange(): void {
    this.contentTypeChange.emit(this.contentType);
  }

  onDateChange(): void {
    this.dateChange.emit();
  }

  onSaveSearch(): void {
    this.saveSearch.emit();
  }

  isTopicSelected(topic: string): boolean {
    return this.selectedTopics.includes(topic);
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }
}
