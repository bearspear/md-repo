import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

export interface RelatedDocument {
  title: string;
  path: string;
  topics: string[];
  [key: string]: any;
}

@Component({
  selector: 'app-related-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatDividerModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './related-documents.component.html',
  styleUrls: ['./related-documents.component.css']
})
export class RelatedDocumentsComponent {
  @Input() relatedDocuments: RelatedDocument[] = [];
  @Output() openDocument = new EventEmitter<any>();

  onDocumentClick(document: RelatedDocument): void {
    this.openDocument.emit(document);
  }
}
