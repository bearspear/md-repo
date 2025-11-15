import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-search-results-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './search-results-header.component.html',
  styleUrls: ['./search-results-header.component.css']
})
export class SearchResultsHeaderComponent {
  @Input() resultCount: number = 0;
  @Input() searchQuery: string = '';

  @Output() exportJSON = new EventEmitter<void>();
  @Output() exportCSV = new EventEmitter<void>();
}
