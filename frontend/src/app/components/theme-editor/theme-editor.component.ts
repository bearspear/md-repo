import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSliderModule } from '@angular/material/slider';
import { DocumentTheme, DocumentEngineService } from '../../services/document-engine.service';

@Component({
  selector: 'app-theme-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSliderModule
  ],
  templateUrl: './theme-editor.component.html',
  styleUrls: ['./theme-editor.component.css']
})
export class ThemeEditorComponent implements OnInit {
  @Input() initialTheme?: DocumentTheme;
  @Output() themeChanged = new EventEmitter<DocumentTheme>();
  @Output() themeSaved = new EventEmitter<DocumentTheme>();
  @Output() closed = new EventEmitter<void>();

  // Current theme being edited
  theme: DocumentTheme = this.getDefaultCustomTheme();

  // Font options
  fontFamilies = [
    { value: 'Georgia, serif', label: 'Georgia (Serif)' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Palatino Linotype", serif', label: 'Palatino' },
    { value: '"Book Antiqua", serif', label: 'Book Antiqua' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: '"Helvetica Neue", sans-serif', label: 'Helvetica Neue' },
    { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: '"Source Sans Pro", sans-serif', label: 'Source Sans Pro' },
    { value: '"Open Sans", sans-serif', label: 'Open Sans' },
    { value: 'system-ui, sans-serif', label: 'System UI' }
  ];

  codeFontFamilies = [
    { value: '"Fira Code", monospace', label: 'Fira Code' },
    { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
    { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
    { value: 'Menlo, monospace', label: 'Menlo' },
    { value: 'Monaco, monospace', label: 'Monaco' },
    { value: '"Courier New", monospace', label: 'Courier New' },
    { value: 'Consolas, monospace', label: 'Consolas' }
  ];

  // Categories
  categories: Array<{value: string, label: string}> = [
    { value: 'web', label: 'Web' },
    { value: 'print', label: 'Print' },
    { value: 'professional', label: 'Professional' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'creative', label: 'Creative' }
  ];

  // Saved custom themes
  savedThemes: DocumentTheme[] = [];

  constructor(private documentEngine: DocumentEngineService) {}

  ngOnInit() {
    if (this.initialTheme) {
      this.theme = JSON.parse(JSON.stringify(this.initialTheme));
    }
    this.loadSavedThemes();
  }

  getDefaultCustomTheme(): DocumentTheme {
    return {
      id: `custom-${Date.now()}`,
      name: 'My Custom Theme',
      description: 'A custom theme created with the theme editor',
      author: 'User',
      preview: '',
      category: 'creative',
      fonts: {
        heading: 'Georgia, serif',
        body: 'Georgia, serif',
        code: '"Fira Code", monospace'
      },
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        textPrimary: '#1e293b',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        codeBackground: '#f1f5f9'
      },
      layout: {
        maxWidth: '800px',
        padding: '2rem',
        lineHeight: 1.7,
        headingSpacing: '1.5rem',
        paragraphSpacing: '1rem'
      },
      customCSS: ''
    };
  }

  onThemeChange() {
    this.themeChanged.emit(this.theme);
  }

  saveTheme() {
    // Ensure unique ID for new themes
    if (!this.theme.id.startsWith('custom-')) {
      this.theme.id = `custom-${Date.now()}`;
    }

    // Save to localStorage
    const themes = this.getSavedThemesFromStorage();
    const existingIndex = themes.findIndex(t => t.id === this.theme.id);

    if (existingIndex >= 0) {
      themes[existingIndex] = this.theme;
    } else {
      themes.push(this.theme);
    }

    localStorage.setItem('custom-themes', JSON.stringify(themes));
    this.loadSavedThemes();
    this.themeSaved.emit(this.theme);
  }

  loadTheme(theme: DocumentTheme) {
    this.theme = JSON.parse(JSON.stringify(theme));
    this.onThemeChange();
  }

  deleteTheme(themeId: string) {
    const themes = this.getSavedThemesFromStorage().filter(t => t.id !== themeId);
    localStorage.setItem('custom-themes', JSON.stringify(themes));
    this.loadSavedThemes();
  }

  duplicateTheme() {
    this.theme = {
      ...JSON.parse(JSON.stringify(this.theme)),
      id: `custom-${Date.now()}`,
      name: `${this.theme.name} (Copy)`
    };
    this.onThemeChange();
  }

  resetToDefault() {
    this.theme = this.getDefaultCustomTheme();
    this.onThemeChange();
  }

  loadFromBuiltIn(themeId: string) {
    const builtInTheme = this.documentEngine.getThemeById(themeId);
    if (builtInTheme) {
      this.theme = {
        ...JSON.parse(JSON.stringify(builtInTheme)),
        id: `custom-${Date.now()}`,
        name: `${builtInTheme.name} (Custom)`,
        author: 'User'
      };
      this.onThemeChange();
    }
  }

  private loadSavedThemes() {
    this.savedThemes = this.getSavedThemesFromStorage();
  }

  private getSavedThemesFromStorage(): DocumentTheme[] {
    try {
      const stored = localStorage.getItem('custom-themes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  close() {
    this.closed.emit();
  }

  // Color preset helpers
  applyColorPreset(preset: string) {
    switch (preset) {
      case 'light':
        this.theme.colors = {
          ...this.theme.colors,
          background: '#ffffff',
          surface: '#f8fafc',
          textPrimary: '#1e293b',
          textSecondary: '#475569',
          textMuted: '#94a3b8',
          border: '#e2e8f0',
          codeBackground: '#f1f5f9'
        };
        break;
      case 'dark':
        this.theme.colors = {
          ...this.theme.colors,
          background: '#0f172a',
          surface: '#1e293b',
          textPrimary: '#f1f5f9',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          border: '#334155',
          codeBackground: '#1e293b'
        };
        break;
      case 'sepia':
        this.theme.colors = {
          ...this.theme.colors,
          background: '#fef3e2',
          surface: '#fde9cc',
          textPrimary: '#5c4033',
          textSecondary: '#7d5a44',
          textMuted: '#a67c5b',
          border: '#dcc8a0',
          codeBackground: '#f5e6d3'
        };
        break;
    }
    this.onThemeChange();
  }
}
