import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import { UIStateService } from './ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsManagerService {
  currentConfig: any = null;
  newWatchDirectory = '';
  settingsMessage = '';
  settingsError = '';

  constructor(
    private searchService: SearchService,
    private uiState: UIStateService
  ) {}

  /**
   * Open settings dialog and load current configuration
   */
  openSettingsDialog(): void {
    this.uiState.setState('showSettingsDialog', true);
    this.settingsMessage = '';
    this.settingsError = '';
    this.loadConfig();
  }

  /**
   * Load current configuration from server
   */
  loadConfig(): void {
    this.searchService.getConfig().subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.newWatchDirectory = config.watchDirectory;
      },
      error: (error) => {
        console.error('Error loading config:', error);
        this.settingsError = 'Failed to load configuration';
      }
    });
  }

  /**
   * Update watch directory and trigger re-indexing
   */
  updateWatchDirectory(onComplete?: () => void): void {
    if (!this.newWatchDirectory || this.newWatchDirectory.trim().length === 0) {
      this.settingsError = 'Please enter a valid directory path';
      return;
    }

    this.uiState.setState('isUpdatingSettings', true);
    this.settingsError = '';
    this.settingsMessage = '';

    this.searchService.updateWatchDirectory(this.newWatchDirectory).subscribe({
      next: (response) => {
        this.settingsMessage = 'Watch directory updated successfully! Re-indexing...';
        this.currentConfig = response.config;
        this.uiState.setState('isUpdatingSettings', false);
        if (onComplete) {
          onComplete();
        }
        setTimeout(() => {
          this.settingsMessage = 'Configuration saved and documents re-indexed!';
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating watch directory:', error);
        this.settingsError = error.error?.error || 'Failed to update watch directory';
        this.uiState.setState('isUpdatingSettings', false);
      }
    });
  }

  /**
   * Close settings dialog and reset messages
   */
  closeSettingsDialog(): void {
    this.uiState.setState('showSettingsDialog', false);
    this.settingsMessage = '';
    this.settingsError = '';
  }
}
