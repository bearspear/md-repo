import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SavedSearch } from '../../services/user-preferences-engine.service';

@Component({
  selector: 'app-saved-searches-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './saved-searches-panel.component.html',
  styleUrls: ['./saved-searches-panel.component.css']
})
export class SavedSearchesPanelComponent {
  @Input() savedSearches: SavedSearch[] = [];
  @Output() apply = new EventEmitter<SavedSearch>();
  @Output() delete = new EventEmitter<number>();

  onApply(search: SavedSearch): void {
    this.apply.emit(search);
  }

  onDelete(index: number): void {
    this.delete.emit(index);
  }
}
