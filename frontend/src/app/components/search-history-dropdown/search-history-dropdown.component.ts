import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search-history-dropdown',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './search-history-dropdown.component.html',
  styleUrls: ['./search-history-dropdown.component.css']
})
export class SearchHistoryDropdownComponent {
  @Input() history: string[] = [];
  @Output() selectHistory = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  onSelectHistory(item: string): void {
    this.selectHistory.emit(item);
  }

  onClear(): void {
    this.clear.emit();
  }
}
