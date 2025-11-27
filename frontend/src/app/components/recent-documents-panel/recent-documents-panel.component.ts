import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RecentDoc } from '../../services/user-preferences-engine.service';

@Component({
  selector: 'app-recent-documents-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './recent-documents-panel.component.html',
  styleUrls: ['./recent-documents-panel.component.css']
})
export class RecentDocumentsPanelComponent {
  @Input() recentDocs: RecentDoc[] = [];
  @Output() openDocument = new EventEmitter<RecentDoc>();
  @Output() clear = new EventEmitter<void>();

  onOpenDocument(doc: RecentDoc): void {
    this.openDocument.emit(doc);
  }

  onClear(): void {
    this.clear.emit();
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
