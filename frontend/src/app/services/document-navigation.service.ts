import { Injectable, ElementRef } from '@angular/core';
import { SearchService, SearchResult } from './search.service';
import { DocumentStateService, TocItem } from './document-state.service';
import { UIStateService } from './ui-state.service';
import { AnnotationStateService } from './annotation-state.service';
import { RecentDoc } from './recent-documents.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentNavigationService {
  copySuccess = false;

  constructor(
    private searchService: SearchService,
    private docState: DocumentStateService,
    private uiState: UIStateService,
    private annotationState: AnnotationStateService
  ) {}

  /**
   * Open a document from search results
   */
  openDocument(
    result: SearchResult,
    onRecentAdd: (doc: RecentDoc) => void,
    onRelatedFind: (topics: string[]) => void,
    onAnnotationsLoad: (path: string) => void
  ): void {
    this.searchService.getDocument(result.path).subscribe({
      next: (doc) => {
        const toc = this.generateToc(doc.rawContent);
        this.docState.selectDocument(doc, toc);
        this.uiState.setState('isFullscreen', false);
        this.uiState.setState('showToc', true);

        // Track recent view
        onRecentAdd({
          path: doc.path,
          title: doc.title,
          viewedAt: Date.now(),
          topics: doc.topics || []
        });

        // Find related documents based on shared topics
        onRelatedFind(doc.topics || []);

        // Load annotations for this document
        onAnnotationsLoad(doc.path);
      },
      error: (error) => {
        console.error('Error loading document:', error);
      }
    });
  }

  /**
   * Open a recent document
   */
  openRecentDocument(
    doc: RecentDoc,
    onRecentAdd: (doc: RecentDoc) => void,
    onRelatedFind: (topics: string[]) => void
  ): void {
    this.searchService.getDocument(doc.path).subscribe({
      next: (fullDoc) => {
        const toc = this.generateToc(fullDoc.rawContent);
        this.docState.selectDocument(fullDoc, toc);
        this.uiState.setState('isFullscreen', false);
        this.uiState.setState('showToc', true);
        onRecentAdd({
          path: fullDoc.path,
          title: fullDoc.title,
          viewedAt: Date.now(),
          topics: fullDoc.topics || []
        });
        onRelatedFind(fullDoc.topics || []);
      },
      error: (error) => {
        console.error('Error loading document:', error);
      }
    });
  }

  /**
   * Close the current document
   */
  closeDocument(): void {
    this.docState.clearDocument();
    this.uiState.setState('isFullscreen', false);
    this.copySuccess = false;
    this.uiState.setState('showAnnotationDialog', false);
    this.annotationState.markHighlightsStale();
  }

  /**
   * Generate table of contents from markdown
   */
  generateToc(markdown: string): TocItem[] {
    const toc: TocItem[] = [];
    const lines = markdown.split('\n');
    const headerRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach(line => {
      const match = line.match(headerRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        toc.push({ level, text, id });
      }
    });

    return toc;
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    this.uiState.toggle('isFullscreen');
  }

  /**
   * Toggle table of contents visibility
   */
  toggleToc(): void {
    this.uiState.toggle('showToc');
  }

  /**
   * Copy markdown content to clipboard
   */
  async copyMarkdown(rawContent?: string): Promise<void> {
    if (rawContent) {
      try {
        await navigator.clipboard.writeText(rawContent);
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy markdown:', error);
      }
    }
  }

  /**
   * Scroll to a specific section by ID
   */
  scrollToSection(id: string, documentContent: ElementRef): void {
    // First, ensure IDs are added to headings
    this.addIdsToHeadings(documentContent);

    // Find the element by ID
    const element = document.getElementById(id);
    if (element && documentContent) {
      // Scroll within the document content container
      const container = documentContent.nativeElement;
      const elementTop = element.offsetTop;

      // Smooth scroll to the element with offset for header
      container.scrollTo({
        top: elementTop - 80, // 80px offset for header/spacing
        behavior: 'smooth'
      });
    }
  }

  /**
   * Add IDs to rendered headings for TOC navigation
   */
  addIdsToHeadings(documentContent: ElementRef): void {
    if (!documentContent) return;

    const contentElement = documentContent.nativeElement;
    const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headings.forEach((heading: Element) => {
      const text = heading.textContent || '';
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      if (id && !heading.id) {
        heading.id = id;
      }
    });
  }

  /**
   * Print the current document
   */
  printDocument(): void {
    window.print();
  }

  /**
   * Format timestamp to date string
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
