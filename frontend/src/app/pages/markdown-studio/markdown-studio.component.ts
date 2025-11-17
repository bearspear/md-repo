import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
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
import { SearchService } from '../../services/search.service';
import { ImportDocumentDialogComponent } from '../../components/import-document-dialog/import-document-dialog.component';
import { ExportDocumentDialogComponent } from '../../components/export-document-dialog/export-document-dialog.component';
import { ImageRepositoryService, ImageMetadata } from '../../services/image-repository.service';
import { ImageGalleryComponent } from '../../components/image-gallery/image-gallery.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
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
    MarkdownModule,
    ImageGalleryComponent,
    MarkdownEditorComponent
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
  showGallery: boolean = false;
  isFullscreen: boolean = false;
  isDraggingOver: boolean = false;

  // Document state
  documentTitle: string = 'Untitled Document';
  lastSaved: Date | null = null;
  hasUnsavedChanges: boolean = false;

  // Undo/Redo history
  private undoHistory: string[] = [];
  private redoHistory: string[] = [];
  private maxHistorySize: number = 50;

  // Subjects for reactive updates
  private contentChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  // ViewChild for preview container scrolling
  @ViewChild('previewContainer') previewContainer?: ElementRef;

  // ViewChild for markdown editor textarea
  @ViewChild('markdownEditor') markdownEditor?: ElementRef<HTMLTextAreaElement>;

  // ViewChildren for resize functionality
  @ViewChild('sidebar') sidebar?: ElementRef<HTMLElement>;
  @ViewChild('editorPane') editorPane?: ElementRef<HTMLElement>;

  constructor(
    private studioDocumentService: StudioDocumentService,
    private dialog: MatDialog,
    private imageRepositoryService: ImageRepositoryService,
    private route: ActivatedRoute,
    private searchService: SearchService
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

    // Check for document path in query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentPath = params['path'];
      if (documentPath) {
        this.loadDocumentFromPath(documentPath);
      } else {
        // Initial preview with default content
        this.updatePreview(this.markdownContent);
      }
    });
  }

  /**
   * Load a document from the repository into the editor
   */
  private loadDocumentFromPath(path: string): void {
    this.searchService.getDocument(path).subscribe({
      next: (doc) => {
        this.markdownContent = doc.rawContent;
        this.documentTitle = doc.title;
        this.hasUnsavedChanges = false;
        this.updatePreview(this.markdownContent);
      },
      error: (error) => {
        console.error('Error loading document:', error);
        // Fall back to default content
        this.updatePreview(this.markdownContent);
      }
    });
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

      // Add IDs to headings for TOC navigation
      const headings = this.previewContainer.nativeElement.querySelectorAll('h1:not([id]), h2:not([id]), h3:not([id]), h4:not([id]), h5:not([id]), h6:not([id])');

      if (headings.length > 0) {
        headings.forEach((heading: HTMLElement) => {
          const text = heading.textContent || '';
          const id = this.generateTocId(text);
          heading.setAttribute('id', id);
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
    // Save to undo history (debounced by the content change itself)
    if (this.undoHistory.length === 0 || this.undoHistory[this.undoHistory.length - 1] !== this.markdownContent) {
      this.undoHistory.push(this.markdownContent);

      // Limit history size
      if (this.undoHistory.length > this.maxHistorySize) {
        this.undoHistory.shift();
      }

      // Clear redo history on new change
      this.redoHistory = [];
    }

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
   * Insert text at cursor position in the editor
   */
  private insertTextAtCursor(text: string) {
    if (!this.markdownEditor?.nativeElement) {
      // Fallback: append to end if editor not available
      this.markdownContent += '\n\n' + text + '\n\n';
      return;
    }

    const textarea = this.markdownEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.markdownContent.substring(0, start);
    const after = this.markdownContent.substring(end);

    // Insert text at cursor position
    this.markdownContent = before + '\n\n' + text + '\n\n' + after;

    // Update cursor position to after inserted text
    setTimeout(() => {
      const newPosition = start + text.length + 4; // +4 for the two newlines before and after
      textarea.selectionStart = newPosition;
      textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
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

  /**
   * Handle image upload button click
   */
  uploadImage() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = (event: any) => {
      const files = Array.from(event.target.files || []) as File[];

      if (files.length === 0) {
        return;
      }

      // Upload images
      this.uploadImageFiles(files);
    };

    // Trigger file selection dialog
    input.click();
  }

  /**
   * Upload image files to repository
   */
  private uploadImageFiles(files: File[]) {
    // Filter to only image files
    const imageFiles = files.filter(file => this.imageRepositoryService.isImageFile(file));

    if (imageFiles.length === 0) {
      alert('No valid image files selected.');
      return;
    }

    this.imageRepositoryService.uploadImages(imageFiles, this.documentId).subscribe({
      next: (response) => {
        console.log('Images uploaded:', response);

        // Insert markdown references for each uploaded image
        const markdownRefs = response.images
          .map(img =>
            this.imageRepositoryService.generateMarkdownReference(
              img.imageId,
              img.originalName,
              img.originalName
            )
          )
          .join('\n\n');

        // Insert at cursor position
        this.insertTextAtCursor(markdownRefs);
        this.hasUnsavedChanges = true;
        this.contentChange$.next(this.markdownContent);

        const uploadedCount = response.uploaded;
        const failedCount = files.length - imageFiles.length;
        let message = `Successfully uploaded ${uploadedCount} image(s)!`;

        if (failedCount > 0) {
          message += ` ${failedCount} non-image file(s) were skipped.`;
        }

        alert(message);
      },
      error: (error) => {
        console.error('Upload error:', error);
        alert('Error uploading images. Please try again.');
      }
    });
  }

  /**
   * Import image from URL
   */
  importImageFromUrl() {
    const url = prompt('Enter image URL:');

    if (!url || url.trim() === '') {
      return;
    }

    this.imageRepositoryService.importFromUrl(url.trim(), this.documentId).subscribe({
      next: (response) => {
        console.log('Image imported from URL:', response);

        // Generate markdown reference
        const markdownRef = this.imageRepositoryService.generateMarkdownReference(
          response.imageId,
          response.originalName,
          response.originalName
        );

        // Insert at cursor position
        this.insertTextAtCursor(markdownRef);
        this.hasUnsavedChanges = true;
        this.contentChange$.next(this.markdownContent);

        alert(`Successfully imported image from URL!`);
      },
      error: (error) => {
        console.error('Import from URL error:', error);
        const errorMessage = error.error?.message || 'Error importing image from URL. Please check the URL and try again.';
        alert(errorMessage);
      }
    });
  }

  /**
   * Toggle gallery visibility
   */
  toggleGallery() {
    this.showGallery = !this.showGallery;
  }

  /**
   * Handle image selection from gallery
   */
  onImageSelected(image: ImageMetadata) {
    // Generate markdown reference for the selected image
    const markdownRef = this.imageRepositoryService.generateMarkdownReference(
      image.imageId,
      image.originalName,
      image.originalName
    );

    // Insert at cursor position
    this.insertTextAtCursor(markdownRef);
    this.hasUnsavedChanges = true;
    this.contentChange$.next(this.markdownContent);

    console.log(`Inserted image: ${image.originalName}`);
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      this.uploadImageFiles(fileArray);
    }
  }

  /**
   * Get editor mode for the markdown-editor component
   */
  getEditorMode(): string {
    return this.showPreview ? 'split' : 'editor';
  }

  /**
   * Perform undo operation
   */
  performUndo() {
    if (this.undoHistory.length > 1) {
      // Save current state to redo
      this.redoHistory.push(this.markdownContent);

      // Remove current state from undo
      this.undoHistory.pop();

      // Get previous state
      const previousState = this.undoHistory[this.undoHistory.length - 1];
      this.markdownContent = previousState;
      this.hasUnsavedChanges = true;
      this.updatePreview(this.markdownContent);
    }
  }

  /**
   * Perform redo operation
   */
  performRedo() {
    if (this.redoHistory.length > 0) {
      // Get next state from redo
      const nextState = this.redoHistory.pop();
      if (nextState) {
        // Add current state to undo
        this.undoHistory.push(this.markdownContent);

        // Apply next state
        this.markdownContent = nextState;
        this.hasUnsavedChanges = true;
        this.updatePreview(this.markdownContent);
      }
    }
  }

  /**
   * Discard unsaved changes
   */
  discardChanges() {
    const confirm = window.confirm('Are you sure you want to discard all unsaved changes?');
    if (confirm) {
      // Reload the last saved content or reset to empty
      if (this.undoHistory.length > 0) {
        this.markdownContent = this.undoHistory[0];
      } else {
        this.markdownContent = '# New Document\n\nStart writing...';
      }
      this.hasUnsavedChanges = false;
      this.updatePreview(this.markdownContent);
    }
  }

  /**
   * Insert markdown formatting
   */
  insertMarkdown(type: string) {
    // This method will be enhanced to handle cursor position and selection
    // For now, it provides basic insertion at the end

    switch (type) {
      case 'bold':
        this.markdownContent += '**bold text**';
        break;
      case 'italic':
        this.markdownContent += '*italic text*';
        break;
      case 'strikethrough':
        this.markdownContent += '~~strikethrough text~~';
        break;
      case 'inline-code':
        this.markdownContent += '`code`';
        break;
      case 'h1':
        this.markdownContent += '\n# Heading 1\n';
        break;
      case 'h2':
        this.markdownContent += '\n## Heading 2\n';
        break;
      case 'h3':
        this.markdownContent += '\n### Heading 3\n';
        break;
      case 'h4':
        this.markdownContent += '\n#### Heading 4\n';
        break;
      case 'h5':
        this.markdownContent += '\n##### Heading 5\n';
        break;
      case 'h6':
        this.markdownContent += '\n###### Heading 6\n';
        break;
      case 'ul':
        this.markdownContent += '\n- List item 1\n- List item 2\n- List item 3\n';
        break;
      case 'ol':
        this.markdownContent += '\n1. List item 1\n2. List item 2\n3. List item 3\n';
        break;
      case 'task':
        this.markdownContent += '\n- [ ] Task 1\n- [ ] Task 2\n- [x] Task 3 (completed)\n';
        break;
      case 'indent':
        // Add indentation to selected lines
        this.markdownContent += '  ';
        break;
      case 'outdent':
        // Remove indentation from selected lines
        // This would require cursor position awareness
        break;
      case 'link':
        this.markdownContent += '[link text](https://example.com)';
        break;
      case 'image':
        this.markdownContent += '![alt text](image-url)';
        break;
      case 'blockquote':
        this.markdownContent += '\n> Blockquote text\n';
        break;
      case 'code-block':
        this.markdownContent += '\n```javascript\n// Code block\nconsole.log("Hello World");\n```\n';
        break;
      case 'table':
        this.markdownContent += '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Data     | Data     |\n| Row 2    | Data     | Data     |\n';
        break;
      case 'hr':
        this.markdownContent += '\n---\n';
        break;
      case 'footnote':
        this.markdownContent += 'Text with footnote[^1]\n\n[^1]: Footnote content';
        break;
      case 'emoji':
        this.markdownContent += ' :smile: ';
        break;
      default:
        console.warn('Unknown markdown type:', type);
    }

    // Trigger content change
    this.onContentChange();
  }

  /**
   * Resize functionality
   */
  private resizingPanel: 'sidebar' | 'editor' | null = null;
  private startX: number = 0;
  private startWidth: number = 0;

  onResizeStart(event: MouseEvent, panel: 'sidebar' | 'editor') {
    event.preventDefault();
    this.resizingPanel = panel;
    this.startX = event.clientX;

    // Get the current width of the panel being resized
    if (panel === 'sidebar' && this.sidebar) {
      this.startWidth = this.sidebar.nativeElement.offsetWidth;
    } else if (panel === 'editor' && this.editorPane) {
      this.startWidth = this.editorPane.nativeElement.offsetWidth;
    }

    // Add resizing class to container
    const container = document.querySelector('.studio-container');
    container?.classList.add('resizing');

    // Add resizing class to the handle
    (event.target as HTMLElement).classList.add('resizing');
  }

  @HostListener('document:mousemove', ['$event'])
  onResizeMove(event: MouseEvent) {
    if (!this.resizingPanel) return;

    const delta = event.clientX - this.startX;
    const newWidth = this.startWidth + delta;

    if (this.resizingPanel === 'sidebar' && this.sidebar) {
      const element = this.sidebar.nativeElement;
      const minWidth = 200;
      const maxWidth = 600;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      element.style.width = `${clampedWidth}px`;
    } else if (this.resizingPanel === 'editor' && this.editorPane) {
      const element = this.editorPane.nativeElement;
      const minWidth = 300;
      const maxWidth = 1200;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      element.style.width = `${clampedWidth}px`;
      element.style.flex = 'none';
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onResizeEnd(event: MouseEvent) {
    if (!this.resizingPanel) return;

    // Remove resizing class from container
    const container = document.querySelector('.studio-container');
    container?.classList.remove('resizing');

    // Remove resizing class from all handles
    document.querySelectorAll('.resize-handle.resizing').forEach(handle => {
      handle.classList.remove('resizing');
    });

    this.resizingPanel = null;
  }
}
