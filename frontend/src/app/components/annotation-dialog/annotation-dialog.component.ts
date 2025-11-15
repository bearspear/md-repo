import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ColorOption {
  name: string;
  value: string;
  color: string;
}

interface Annotation {
  id?: string;
  color?: string;
  note?: string;
  [key: string]: any;
}

interface CurrentAnnotation {
  color?: string;
  note?: string;
}

@Component({
  selector: 'app-annotation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './annotation-dialog.component.html',
  styleUrls: ['./annotation-dialog.component.css']
})
export class AnnotationDialogComponent {
  @Input() selectedText: string = '';
  @Input() editingAnnotation: Annotation | null = null;
  @Input() currentAnnotation: CurrentAnnotation = { color: 'yellow', note: '' };
  @Input() availableColors: ColorOption[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit();
  }

  selectColor(colorValue: string) {
    if (this.currentAnnotation) {
      this.currentAnnotation.color = colorValue;
    }
  }
}
