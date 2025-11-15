import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

interface Config {
  watchDirectory: string;
  uploadDirectory: string;
}

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialogComponent {
  @Input() currentConfig: Config | null = null;
  @Input() newWatchDirectory: string = '';
  @Input() totalDocuments: number = 0;
  @Input() totalWords: number = 0;
  @Input() isUpdatingSettings: boolean = false;
  @Input() settingsMessage: string = '';
  @Input() settingsError: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() newWatchDirectoryChange = new EventEmitter<string>();
  @Output() updateWatchDirectory = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  onNewWatchDirectoryChange(value: string) {
    this.newWatchDirectory = value;
    this.newWatchDirectoryChange.emit(value);
  }

  onUpdateWatchDirectory() {
    this.updateWatchDirectory.emit();
  }

  isUpdateDisabled(): boolean {
    return this.isUpdatingSettings ||
           this.newWatchDirectory === this.currentConfig?.watchDirectory;
  }
}
