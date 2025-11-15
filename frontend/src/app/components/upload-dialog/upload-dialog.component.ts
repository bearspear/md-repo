import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css']
})
export class UploadDialogComponent {
  @Input() dragOver: boolean = false;
  @Input() uploadProgress: string[] = [];
  @Input() isUploading: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() dragOverEvent = new EventEmitter<DragEvent>();
  @Output() dragLeaveEvent = new EventEmitter<DragEvent>();
  @Output() dropEvent = new EventEmitter<DragEvent>();
  @Output() fileSelected = new EventEmitter<Event>();

  onClose() {
    this.close.emit();
  }

  onDragOver(event: DragEvent) {
    this.dragOverEvent.emit(event);
  }

  onDragLeave(event: DragEvent) {
    this.dragLeaveEvent.emit(event);
  }

  onDrop(event: DragEvent) {
    this.dropEvent.emit(event);
  }

  onFileSelected(event: Event) {
    this.fileSelected.emit(event);
  }
}
