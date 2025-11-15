import { Injectable } from '@angular/core';
import { SearchStateService, SearchResultWithCollections } from './search-state.service';
import { DocumentStateService } from './document-state.service';
import { SearchResult } from './search.service';

@Injectable({
  providedIn: 'root'
})
export class RelatedDocumentsManagerService {

  constructor(
    private searchState: SearchStateService,
    private docState: DocumentStateService
  ) {}

  /**
   * Find documents related to the current document based on shared topics
   * Scores documents by number of shared topics and returns top 5
   */
  findRelatedDocuments(currentTopics: string[]): void {
    if (currentTopics.length === 0 || !this.searchState.searchResults || this.searchState.searchResults.length === 0) {
      this.docState.setState('relatedDocuments', []);
      return;
    }

    // Score documents by number of shared topics
    const scoredDocs = this.searchState.searchResults
      .filter(doc => doc.path !== this.docState.selectedDocument?.path)
      .map(doc => {
        const sharedTopics = doc.topics.filter(t => currentTopics.includes(t));
        return {
          doc,
          score: sharedTopics.length
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.doc);

    this.docState.setState('relatedDocuments', scoredDocs);
  }
}
