import { Injectable } from '@angular/core';
import { SearchService, SearchResult } from './search.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentIndexService {
  allDocuments: SearchResult[] = [];
  groupedDocuments: { [key: string]: SearchResult[] } = {};
  alphabetSections: string[] = [];

  constructor(
    private searchService: SearchService,
    private uiState: UIStateService
  ) {}

  /**
   * Toggle index view and load documents if needed
   */
  toggleIndex(): void {
    this.uiState.toggle('showIndex');
    if (this.uiState.showIndex && this.allDocuments.length === 0) {
      this.loadAllDocuments();
    }
  }

  /**
   * Load all documents from server
   */
  loadAllDocuments(): void {
    this.searchService.getAllDocuments(1000, 0).subscribe({
      next: (response) => {
        this.allDocuments = response.documents;
        this.groupDocumentsByLetter();
      },
      error: (error) => {
        console.error('Error loading all documents:', error);
      }
    });
  }

  /**
   * Group documents by first letter of title
   */
  groupDocumentsByLetter(): void {
    this.groupedDocuments = {};
    this.alphabetSections = [];

    // Group documents by first letter of title
    this.allDocuments.forEach(doc => {
      const firstLetter = doc.title.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

      if (!this.groupedDocuments[letter]) {
        this.groupedDocuments[letter] = [];
      }
      this.groupedDocuments[letter].push(doc);
    });

    // Sort documents within each group alphabetically
    Object.keys(this.groupedDocuments).forEach(letter => {
      this.groupedDocuments[letter].sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    });

    // Create sorted list of sections (# first, then A-Z)
    this.alphabetSections = Object.keys(this.groupedDocuments).sort((a, b) => {
      if (a === '#') return -1;
      if (b === '#') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Close index and open specified document
   */
  openDocumentFromIndex(doc: SearchResult, onOpen: (doc: SearchResult) => void): void {
    this.uiState.setState('showIndex', false);
    onOpen(doc);
  }
}
