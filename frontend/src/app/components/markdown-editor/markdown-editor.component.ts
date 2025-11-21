import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MarkdownModule
  ],
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.css']
})
export class MarkdownEditorComponent {
  // Inputs
  @Input() editedContent: string = '';
  @Input() previewMode: string = 'editor';
  @Input() isSaving: boolean = false;
  @Input() hasUnsavedChanges: boolean = false;
  @Input() lastSavedAt: Date | null = null;
  @Input() showFindReplace: boolean = false;
  @Input() showReplace: boolean = false;
  @Input() findText: string = '';
  @Input() replaceText: string = '';
  @Input() currentMatchIndex: number = 0;
  @Input() totalMatches: number = 0;
  @Input() showSaveControls: boolean = true; // Toggle to show/hide save/discard buttons and saving message
  @Input() typewriterMode: boolean = false; // Typewriter mode - keep active line centered

  // Outputs
  @Output() editedContentChange = new EventEmitter<string>();
  @Output() findTextChange = new EventEmitter<string>();
  @Output() replaceTextChange = new EventEmitter<string>();
  @Output() contentChange = new EventEmitter<void>();
  @Output() insertMarkdown = new EventEmitter<string>();
  @Output() toggleFindReplace = new EventEmitter<void>();
  @Output() showKeyboardShortcuts = new EventEmitter<void>();
  @Output() findNext = new EventEmitter<void>();
  @Output() findPrevious = new EventEmitter<void>();
  @Output() replaceNext = new EventEmitter<void>();
  @Output() replaceAll = new EventEmitter<void>();
  @Output() discardChanges = new EventEmitter<void>();
  @Output() saveDocument = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();

  // ViewChild for textarea
  @ViewChild('editorTextarea') editorTextarea?: ElementRef<HTMLTextAreaElement>;

  // Track cursor position
  private cursorPosition: number = 0;

  // Auto-complete suggestions
  showAutocomplete: boolean = false;
  autocompleteOptions: Array<{label: string, insert: string, description: string}> = [];
  selectedAutocompleteIndex: number = 0;
  autocompletePosition = { top: 0, left: 0 };

  // Debounce timer for typewriter mode
  private typewriterDebounceTimer?: any;

  onContentChange() {
    // Emit changes immediately (no debounce for actual content)
    this.editedContentChange.emit(this.editedContent);
    this.contentChange.emit();

    // Debounce typewriter mode centering to reduce lag
    if (this.typewriterMode) {
      if (this.typewriterDebounceTimer) {
        clearTimeout(this.typewriterDebounceTimer);
      }
      this.typewriterDebounceTimer = setTimeout(() => {
        this.centerCurrentLine();
      }, 50); // 50ms debounce
    }
  }

  /**
   * Handle cursor movement events for typewriter mode
   */
  onCursorMove() {
    if (this.typewriterMode) {
      this.centerCurrentLine();
    }
  }

  /**
   * Center the current line in the editor
   */
  private centerCurrentLine() {
    if (!this.editorTextarea?.nativeElement) return;

    const textarea = this.editorTextarea.nativeElement;
    const cursorPosition = textarea.selectionStart;

    // Get all lines
    const lines = textarea.value.substring(0, cursorPosition).split('\n');
    const currentLineNumber = lines.length - 1;

    // Calculate line height
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;

    // Calculate scroll position to center current line
    const textareaHeight = textarea.clientHeight;
    const targetScrollTop = (currentLineNumber * lineHeight) - (textareaHeight / 2) + (lineHeight / 2);

    // Smooth scroll to center
    textarea.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }

  onFindTextChange() {
    this.findTextChange.emit(this.findText);
  }

  onReplaceTextChange() {
    this.replaceTextChange.emit(this.replaceText);
  }

  onInsertMarkdown(type: string) {
    this.saveCursorPosition();
    this.insertMarkdownAtCursor(type);
  }

  /**
   * Save current cursor position
   */
  saveCursorPosition() {
    if (this.editorTextarea?.nativeElement) {
      this.cursorPosition = this.editorTextarea.nativeElement.selectionStart;
    }
  }

  /**
   * Set cursor position
   */
  setCursorPosition(position: number) {
    if (this.editorTextarea?.nativeElement) {
      setTimeout(() => {
        this.editorTextarea!.nativeElement.focus();
        this.editorTextarea!.nativeElement.setSelectionRange(position, position);
      }, 0);
    }
  }

  /**
   * Insert markdown at cursor position
   */
  insertMarkdownAtCursor(type: string) {
    if (!this.editorTextarea?.nativeElement) return;

    const textarea = this.editorTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.editedContent.substring(start, end);
    const beforeText = this.editedContent.substring(0, start);
    const afterText = this.editedContent.substring(end);

    let insertText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        insertText = `**${selectedText || 'bold text'}**`;
        cursorOffset = insertText.length;
        break;
      case 'italic':
        insertText = `*${selectedText || 'italic text'}*`;
        cursorOffset = insertText.length;
        break;
      case 'strikethrough':
        insertText = `~~${selectedText || 'strikethrough text'}~~`;
        cursorOffset = insertText.length;
        break;
      case 'inline-code':
        insertText = `\`${selectedText || 'code'}\``;
        cursorOffset = insertText.length;
        break;
      case 'h1':
        insertText = `# ${selectedText || 'Heading 1'}`;
        cursorOffset = insertText.length;
        break;
      case 'h2':
        insertText = `## ${selectedText || 'Heading 2'}`;
        cursorOffset = insertText.length;
        break;
      case 'h3':
        insertText = `### ${selectedText || 'Heading 3'}`;
        cursorOffset = insertText.length;
        break;
      case 'h4':
        insertText = `#### ${selectedText || 'Heading 4'}`;
        cursorOffset = insertText.length;
        break;
      case 'h5':
        insertText = `##### ${selectedText || 'Heading 5'}`;
        cursorOffset = insertText.length;
        break;
      case 'h6':
        insertText = `###### ${selectedText || 'Heading 6'}`;
        cursorOffset = insertText.length;
        break;
      case 'ul':
        insertText = `- ${selectedText || 'List item'}`;
        cursorOffset = insertText.length;
        break;
      case 'ol':
        insertText = `1. ${selectedText || 'List item'}`;
        cursorOffset = insertText.length;
        break;
      case 'task':
        insertText = `- [ ] ${selectedText || 'Task item'}`;
        cursorOffset = insertText.length;
        break;
      case 'link':
        insertText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = insertText.length;
        break;
      case 'image':
        insertText = `![${selectedText || 'alt text'}](image-url)`;
        cursorOffset = insertText.length;
        break;
      case 'blockquote':
        insertText = `> ${selectedText || 'Quote'}`;
        cursorOffset = insertText.length;
        break;
      case 'code-block':
        insertText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
        cursorOffset = insertText.length;
        break;
      case 'table':
        insertText = '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
        cursorOffset = insertText.length;
        break;
      case 'hr':
        insertText = '\n---\n';
        cursorOffset = insertText.length;
        break;
      case 'footnote':
        insertText = `[^${selectedText || '1'}]`;
        cursorOffset = insertText.length;
        break;
      case 'emoji':
        insertText = ':smile:';
        cursorOffset = insertText.length;
        break;
      case 'indent':
        insertText = `  ${selectedText}`;
        cursorOffset = insertText.length;
        break;
      case 'outdent':
        insertText = selectedText.replace(/^  /, '');
        cursorOffset = insertText.length;
        break;
      default:
        return;
    }

    this.editedContent = beforeText + insertText + afterText;
    this.editedContentChange.emit(this.editedContent);
    this.contentChange.emit();

    // Set cursor position after insertion
    const newCursorPos = start + cursorOffset;
    this.setCursorPosition(newCursorPos);
  }

  onToggleFindReplace() {
    this.toggleFindReplace.emit();
  }

  onShowKeyboardShortcuts() {
    this.showKeyboardShortcuts.emit();
  }

  onFindNext() {
    this.findNext.emit();
  }

  onFindPrevious() {
    this.findPrevious.emit();
  }

  onReplaceNext() {
    this.replaceNext.emit();
  }

  onReplaceAll() {
    this.replaceAll.emit();
  }

  onDiscardChanges() {
    this.discardChanges.emit();
  }

  onSaveDocument() {
    this.saveDocument.emit();
  }

  onUndo() {
    this.undo.emit();
  }

  onRedo() {
    this.redo.emit();
  }

  /**
   * Handle keydown for auto-complete and smart formatting
   */
  onKeyDown(event: KeyboardEvent) {
    if (this.showAutocomplete) {
      // Arrow down - move to next suggestion
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedAutocompleteIndex = (this.selectedAutocompleteIndex + 1) % this.autocompleteOptions.length;
      }
      // Arrow up - move to previous suggestion
      else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedAutocompleteIndex = this.selectedAutocompleteIndex === 0
          ? this.autocompleteOptions.length - 1
          : this.selectedAutocompleteIndex - 1;
      }
      // Tab or Enter - accept suggestion
      else if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault();
        this.acceptAutocomplete();
      }
      // Escape - close autocomplete
      else if (event.key === 'Escape') {
        event.preventDefault();
        this.showAutocomplete = false;
      }
    } else {
      // Smart formatting features
      this.handleSmartFormatting(event);

      // Trigger autocomplete on certain keys (DISABLED)
      // this.checkForAutocomplete(event);
    }
  }

  /**
   * Handle smart formatting (auto-close brackets, smart quotes, etc.)
   */
  private handleSmartFormatting(event: KeyboardEvent) {
    if (!this.editorTextarea?.nativeElement) return;

    const textarea = this.editorTextarea.nativeElement;
    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Only auto-close if nothing is selected
    const hasSelection = cursorPos !== selectionEnd;

    // Auto-close brackets, parentheses, quotes
    const autoClosePairs: {[key: string]: string} = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
      '*': '*',
      '_': '_'
    };

    if (autoClosePairs[event.key] && !hasSelection) {
      const closeChar = autoClosePairs[event.key];
      const charAfter = textarea.value.charAt(cursorPos);

      // Don't auto-close if next character is same (e.g., typing ** for bold)
      // or if we're closing an existing pair
      if (charAfter === closeChar || (event.key === closeChar && charAfter !== '')) {
        return;
      }

      event.preventDefault();
      const before = textarea.value.substring(0, cursorPos);
      const after = textarea.value.substring(cursorPos);
      this.editedContent = before + event.key + closeChar + after;
      this.editedContentChange.emit(this.editedContent);
      this.contentChange.emit();

      // Position cursor between the pair
      setTimeout(() => {
        this.setCursorPosition(cursorPos + 1);
      }, 0);
    }

    // Smart quotes: Convert " to " or " based on context
    if (event.key === '"' && !event.ctrlKey && !event.metaKey) {
      const before = textarea.value.substring(0, cursorPos);
      const lastChar = before.charAt(before.length - 1);

      // Opening quote if after space, newline, or start of text
      const isOpening = !lastChar || lastChar === ' ' || lastChar === '\n' || lastChar === '\t';

      if (isOpening || lastChar === '"') {
        // Let the regular quote be typed (we'll use straight quotes for markdown compatibility)
        return;
      }
    }

    // Auto-capitalize after sentence end
    if (event.key.length === 1 && event.key.match(/[a-z]/)) {
      const before = textarea.value.substring(0, cursorPos);
      const trimmedBefore = before.trimEnd();

      // Check if we're at the start or after a sentence-ending punctuation
      if (trimmedBefore.length === 0 || /[.!?]\s*$/.test(trimmedBefore)) {
        event.preventDefault();
        const capitalLetter = event.key.toUpperCase();
        const after = textarea.value.substring(cursorPos);
        this.editedContent = before + capitalLetter + after;
        this.editedContentChange.emit(this.editedContent);
        this.contentChange.emit();

        setTimeout(() => {
          this.setCursorPosition(cursorPos + 1);
        }, 0);
      }
    }
  }

  /**
   * Check if we should show autocomplete based on typed characters
   */
  private checkForAutocomplete(event: KeyboardEvent) {
    // Don't trigger on modifier keys
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    setTimeout(() => {
      if (!this.editorTextarea?.nativeElement) return;

      const textarea = this.editorTextarea.nativeElement;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);

      // Get the last few characters
      const lastChars = textBeforeCursor.slice(-3);

      // Check for markdown patterns
      this.autocompleteOptions = [];

      // Check for heading (# at start of line or after newline)
      if (lastChars.endsWith('\n#') || (cursorPos === 1 && lastChars === '#')) {
        this.autocompleteOptions = [
          { label: '# Heading 1', insert: '# ', description: 'Large heading' },
          { label: '## Heading 2', insert: '## ', description: 'Section heading' },
          { label: '### Heading 3', insert: '### ', description: 'Subsection heading' },
          { label: '#### Heading 4', insert: '#### ', description: 'Minor heading' },
        ];
      }
      // Check for list
      else if (lastChars.endsWith('\n-') || lastChars.endsWith('\n*') || (cursorPos <= 2 && (lastChars === '-' || lastChars === '*'))) {
        this.autocompleteOptions = [
          { label: '- List item', insert: '- ', description: 'Unordered list' },
          { label: '* List item', insert: '* ', description: 'Unordered list (alt)' },
          { label: '1. Numbered item', insert: '1. ', description: 'Ordered list' },
          { label: '- [ ] Task', insert: '- [ ] ', description: 'Task list item' },
        ];
      }
      // Check for link [
      else if (lastChars.endsWith('[')) {
        this.autocompleteOptions = [
          { label: '[text](url)', insert: 'text](url)', description: 'Link' },
          { label: '[text][ref]', insert: 'text][ref]', description: 'Reference link' },
        ];
      }
      // Check for image ![
      else if (lastChars.endsWith('![')) {
        this.autocompleteOptions = [
          { label: '![alt](url)', insert: 'alt](url)', description: 'Image' },
          { label: '![alt][ref]', insert: 'alt][ref]', description: 'Reference image' },
        ];
      }
      // Check for code block ```
      else if (lastChars === '```' || lastChars.endsWith('\n``')) {
        this.autocompleteOptions = [
          { label: '```javascript', insert: 'javascript\n\n```', description: 'JavaScript code block' },
          { label: '```typescript', insert: 'typescript\n\n```', description: 'TypeScript code block' },
          { label: '```python', insert: 'python\n\n```', description: 'Python code block' },
          { label: '```java', insert: 'java\n\n```', description: 'Java code block' },
          { label: '```html', insert: 'html\n\n```', description: 'HTML code block' },
          { label: '```css', insert: 'css\n\n```', description: 'CSS code block' },
          { label: '```json', insert: 'json\n\n```', description: 'JSON code block' },
          { label: '```bash', insert: 'bash\n\n```', description: 'Bash code block' },
        ];
      }
      // Check for blockquote
      else if (lastChars.endsWith('\n>') || (cursorPos === 1 && lastChars === '>')) {
        this.autocompleteOptions = [
          { label: '> Quote', insert: '> ', description: 'Blockquote' },
          { label: '> [!NOTE]', insert: '> [!NOTE]\n> ', description: 'Note callout' },
          { label: '> [!TIP]', insert: '> [!TIP]\n> ', description: 'Tip callout' },
          { label: '> [!WARNING]', insert: '> [!WARNING]\n> ', description: 'Warning callout' },
        ];
      }
      // Check for table
      else if (lastChars.endsWith('|')) {
        this.autocompleteOptions = [
          { label: '| Table |', insert: ' Header |\n| --- |\n| Cell |', description: 'Simple table' },
          { label: '| 2 columns |', insert: ' Col1 | Col2 |\n| --- | --- |\n| A | B |', description: '2-column table' },
          { label: '| 3 columns |', insert: ' Col1 | Col2 | Col3 |\n| --- | --- | --- |\n| A | B | C |', description: '3-column table' },
        ];
      }

      // Show autocomplete if we have options
      if (this.autocompleteOptions.length > 0) {
        this.showAutocomplete = true;
        this.selectedAutocompleteIndex = 0;

        // Calculate autocomplete position
        const textareaRect = textarea.getBoundingClientRect();
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const lineNumber = lines.length - 1;
        const currentLine = lines[lines.length - 1];
        const columnNumber = currentLine.length;

        // Approximate calculation (works for monospace fonts)
        const lineHeight = 20;
        const charWidth = 8;

        // Position below the current line
        this.autocompletePosition = {
          top: textareaRect.top + (lineNumber * lineHeight) + lineHeight + textarea.scrollTop + 5,
          left: textareaRect.left + (columnNumber * charWidth) + 10
        };

        // Adjust if too close to right edge
        if (this.autocompletePosition.left > window.innerWidth - 500) {
          this.autocompletePosition.left = window.innerWidth - 500;
        }

        // Adjust if too close to bottom
        if (this.autocompletePosition.top > window.innerHeight - 250) {
          this.autocompletePosition.top = textareaRect.top + (lineNumber * lineHeight) - 250 + textarea.scrollTop;
        }
      } else {
        this.showAutocomplete = false;
      }
    }, 10);
  }

  /**
   * Accept the selected autocomplete suggestion
   */
  acceptAutocomplete() {
    if (!this.editorTextarea?.nativeElement || this.autocompleteOptions.length === 0) return;

    const textarea = this.editorTextarea.nativeElement;
    const selected = this.autocompleteOptions[this.selectedAutocompleteIndex];
    const cursorPos = textarea.selectionStart;

    // Insert the completion
    const before = textarea.value.substring(0, cursorPos);
    const after = textarea.value.substring(cursorPos);
    this.editedContent = before + selected.insert + after;

    // Update cursor position
    const newCursorPos = cursorPos + selected.insert.length;

    // Emit changes
    this.editedContentChange.emit(this.editedContent);
    this.contentChange.emit();

    // Close autocomplete
    this.showAutocomplete = false;

    // Set cursor position after Angular updates the view
    setTimeout(() => {
      this.setCursorPosition(newCursorPos);
    }, 0);
  }

  /**
   * Select autocomplete option by index
   */
  selectAutocomplete(index: number) {
    this.selectedAutocompleteIndex = index;
    this.acceptAutocomplete();
  }

  /**
   * Handle paste event for smart formatting
   */
  onPaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData;
    if (!clipboardData || !this.editorTextarea?.nativeElement) return;

    const pastedText = clipboardData.getData('text/plain');
    if (!pastedText) return;

    // Check if pasted text is a URL
    const urlPattern = /^(https?:\/\/[^\s]+)$/;
    const match = pastedText.match(urlPattern);

    if (match) {
      event.preventDefault();
      const url = match[1];
      const textarea = this.editorTextarea.nativeElement;
      const cursorPos = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      // If there's selected text, use it as the link text
      if (cursorPos !== selectionEnd) {
        const before = textarea.value.substring(0, cursorPos);
        const selectedText = textarea.value.substring(cursorPos, selectionEnd);
        const after = textarea.value.substring(selectionEnd);
        const linkMarkdown = `[${selectedText}](${url})`;

        this.editedContent = before + linkMarkdown + after;
        this.editedContentChange.emit(this.editedContent);
        this.contentChange.emit();

        setTimeout(() => {
          this.setCursorPosition(cursorPos + linkMarkdown.length);
        }, 0);
      } else {
        // No selection, create link with URL as text
        const before = textarea.value.substring(0, cursorPos);
        const after = textarea.value.substring(cursorPos);
        const linkMarkdown = `[${url}](${url})`;

        this.editedContent = before + linkMarkdown + after;
        this.editedContentChange.emit(this.editedContent);
        this.contentChange.emit();

        setTimeout(() => {
          // Place cursor after the markdown link
          this.setCursorPosition(cursorPos + linkMarkdown.length);
        }, 0);
      }
    }
  }
}
