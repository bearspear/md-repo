import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

@Component({
  selector: 'app-table-of-contents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-of-contents.component.html',
  styleUrls: ['./table-of-contents.component.css']
})
export class TableOfContentsComponent {
  @Input() tocItems: TocItem[] = [];
  @Output() scrollTo = new EventEmitter<string>();

  onItemClick(id: string): void {
    this.scrollTo.emit(id);
  }
}
