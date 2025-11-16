import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MarkdownModule } from 'ngx-markdown';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { StudioDocumentService } from '../../services/studio-document.service';
import { ImportDocumentDialogComponent } from '../../components/import-document-dialog/import-document-dialog.component';
import { ExportDocumentDialogComponent } from '../../components/export-document-dialog/export-document-dialog.component';
import mermaid from 'mermaid';
import { Chart, registerables } from 'chart.js';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

@Component({
  selector: 'app-markdown-studio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MarkdownModule
  ],
  templateUrl: './markdown-studio.component.html',
  styleUrls: ['./markdown-studio.component.css']
})
export class MarkdownStudioComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Document ID
  documentId: string;

  // Editor content
  markdownContent: string = '# Welcome to Markdown Studio\n\nStart writing your markdown here...';

  // Preview content (rendered)
  previewContent: string = '';

  // Table of Contents
  tocItems: TocItem[] = [];

  // UI State
  showSidebar: boolean = true;
  showPreview: boolean = true;
  isFullscreen: boolean = false;

  // Document state
  documentTitle: string = 'Untitled Document';
  lastSaved: Date | null = null;
  hasUnsavedChanges: boolean = false;

  // Subjects for reactive updates
  private contentChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  // ViewChild for preview container scrolling
  @ViewChild('previewContainer') previewContainer?: ElementRef;

  constructor(
    private studioDocumentService: StudioDocumentService,
    private dialog: MatDialog
  ) {
    // Generate new document ID
    this.documentId = this.studioDocumentService.generateDocumentId();
  }

  ngOnInit() {
    // Register Chart.js components
    Chart.register(...registerables);

    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });

    // Set up debounced preview updates
    this.contentChange$
      .pipe(
        debounceTime(500), // Wait 500ms after user stops typing
        takeUntil(this.destroy$)
      )
      .subscribe(content => {
        this.updatePreview(content);
      });

    // Set up auto-save (2 second debounce)
    this.autoSave$
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.hasUnsavedChanges) {
          this.saveDocument();
        }
      });

    // Initial preview
    this.updatePreview(this.markdownContent);
  }

  /**
   * Render Mermaid diagrams after view updates
   */
  ngAfterViewChecked() {
    if (this.previewContainer) {
      const mermaidElements = this.previewContainer.nativeElement.querySelectorAll('.mermaid:not([data-processed])');

      if (mermaidElements.length > 0) {
        mermaidElements.forEach((element: Element, index: number) => {
          const id = `mermaid-${Date.now()}-${index}`;
          const code = element.textContent || '';

          // Mark as processing to avoid re-renders
          element.setAttribute('data-processed', 'true');

          try {
            mermaid.render(id, code).then((result) => {
              const container = document.createElement('div');
              container.innerHTML = result.svg;
              container.classList.add('mermaid-diagram');
              element.parentNode?.replaceChild(container, element);
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
              element.setAttribute('data-processed', 'error');
            });
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            element.setAttribute('data-processed', 'error');
          }
        });
      }

      // Render Chart.js charts
      const chartCanvases = this.previewContainer.nativeElement.querySelectorAll('.chart-canvas:not([data-chart-rendered])');

      if (chartCanvases.length > 0) {
        chartCanvases.forEach((canvas: any) => {
          try {
            const config = JSON.parse(canvas.getAttribute('data-chart-config') || '{}');
            canvas.setAttribute('data-chart-rendered', 'true');

            new Chart(canvas, {
              type: config.type || 'line',
              data: config.data || { datasets: [] },
              options: config.options || {}
            });
          } catch (error) {
            console.error('[CHART] Error rendering chart:', error);
            canvas.setAttribute('data-chart-rendered', 'error');
          }
        });
      }

      // Attach click handlers to copy buttons
      const copyButtons = this.previewContainer.nativeElement.querySelectorAll('.code-copy-btn:not([data-handler-attached])');

      if (copyButtons.length > 0) {
        copyButtons.forEach((button: HTMLElement) => {
          button.setAttribute('data-handler-attached', 'true');
          button.addEventListener('click', () => {
            const codeBlock = button.closest('.code-block-wrapper');
            if (codeBlock) {
              const lines = codeBlock.querySelectorAll('.line-content');
              const code = Array.from(lines).map((line: any) => line.textContent).join('\n');

              navigator.clipboard.writeText(code).then(() => {
                button.textContent = '✓';
                setTimeout(() => {
                  button.textContent = '📋';
                }, 2000);
              }).catch(err => {
                console.error('Failed to copy code:', err);
              });
            }
          });
        });
      }
    }
  }

  /**
   * Keyboard shortcuts handler
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveDocument();
    }

    // Ctrl+B or Cmd+B for bold
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      this.insertMarkdownBold();
    }

    // Ctrl+I or Cmd+I for italic
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault();
      this.insertMarkdownItalic();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Called when editor content changes
   */
  onContentChange() {
    this.hasUnsavedChanges = true;
    this.contentChange$.next(this.markdownContent);
    this.autoSave$.next(); // Trigger auto-save
  }

  /**
   * Update preview pane and TOC
   */
  private updatePreview(content: string) {
    this.previewContent = content;
    this.extractToc(content);
  }

  /**
   * Extract table of contents from markdown
   */
  private extractToc(content: string) {
    this.tocItems = [];
    const lines = content.split('\n');
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line) => {
      const match = line.match(headingRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.generateTocId(text);

        this.tocItems.push({ level, text, id });
      }
    });
  }

  /**
   * Generate a URL-safe ID from heading text
   */
  private generateTocId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  /**
   * Toggle preview pane
   */
  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /**
   * Save document
   */
  saveDocument() {
    const document = {
      id: this.documentId,
      title: this.documentTitle,
      content: this.markdownContent,
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString() // This will be preserved by backend if it exists
    };

    this.studioDocumentService.saveDocument(document).subscribe({
      next: (response) => {
        this.lastSaved = new Date();
        this.hasUnsavedChanges = false;
        console.log('Document saved successfully:', response);
      },
      error: (error) => {
        console.error('Error saving document:', error);
        alert('Error saving document. Please try again.');
      }
    });
  }

  /**
   * Export document
   */
  exportDocument() {
    // Get rendered HTML content from preview container
    let htmlContent = '';
    if (this.previewContainer) {
      const markdownElement = this.previewContainer.nativeElement.querySelector('markdown');
      if (markdownElement) {
        htmlContent = markdownElement.innerHTML;
      }
    }

    const dialogRef = this.dialog.open(ExportDocumentDialogComponent, {
      width: '600px',
      disableClose: false,
      data: {
        markdown: this.markdownContent,
        htmlContent: htmlContent,
        title: this.documentTitle
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        console.log(`Document exported successfully as ${result.format}`);
      }
    });
  }

  /**
   * Import document
   */
  importDocument() {
    const dialogRef = this.dialog.open(ImportDocumentDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.markdown) {
        // Load the converted markdown into the editor
        this.markdownContent = result.markdown;
        this.hasUnsavedChanges = true;

        // Update the document title based on the imported filename
        if (result.originalFilename) {
          const filenameWithoutExt = result.originalFilename.replace(/\.[^/.]+$/, '');
          this.documentTitle = filenameWithoutExt;
        }

        // Trigger preview update
        this.updatePreview(this.markdownContent);

        console.log(`Successfully imported ${result.originalFilename}`);
      }
    });
  }

  /**
   * Create new document
   */
  newDocument() {
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Continue without saving?');
      if (!confirm) return;
    }

    // Generate new document ID
    this.documentId = this.studioDocumentService.generateDocumentId();
    this.markdownContent = '# New Document\n\nStart writing...';
    this.documentTitle = 'Untitled Document';
    this.hasUnsavedChanges = false;
    this.lastSaved = null;
    this.updatePreview(this.markdownContent);
  }

  /**
   * Scroll to heading in preview pane
   */
  scrollToHeading(id: string) {
    if (!this.previewContainer) {
      console.warn('Preview container not available');
      return;
    }

    // Find the heading element in the preview pane
    const previewElement = this.previewContainer.nativeElement;
    const headingElement = previewElement.querySelector(`#${id}`);

    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn(`Heading with id "${id}" not found in preview`);
    }
  }

  /**
   * Insert bold markdown syntax
   */
  private insertMarkdownBold() {
    // TODO: Implement text insertion at cursor position
    console.log('Insert bold markdown');
  }

  /**
   * Insert italic markdown syntax
   */
  private insertMarkdownItalic() {
    // TODO: Implement text insertion at cursor position
    console.log('Insert italic markdown');
  }
}
