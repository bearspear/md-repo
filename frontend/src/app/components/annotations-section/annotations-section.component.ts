import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Annotation } from '../../services/annotation-engine.service';

@Component({
  selector: 'app-annotations-section',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './annotations-section.component.html',
  styleUrls: ['./annotations-section.component.css']
})
export class AnnotationsSectionComponent {
  @Input() annotations: Annotation[] = [];

  @Output() exportJSON = new EventEmitter<void>();
  @Output() exportCSV = new EventEmitter<void>();
  @Output() editAnnotation = new EventEmitter<Annotation>();
  @Output() deleteAnnotation = new EventEmitter<Annotation>();

  onExportJSON(): void {
    this.exportJSON.emit();
  }

  onExportCSV(): void {
    this.exportCSV.emit();
  }

  onEditAnnotation(annotation: Annotation): void {
    this.editAnnotation.emit(annotation);
  }

  onDeleteAnnotation(annotation: Annotation): void {
    this.deleteAnnotation.emit(annotation);
  }

  getColorStyle(color: string): string {
    const colorMap: { [key: string]: string } = {
      'yellow': '#fef3c7',
      'green': '#d1fae5',
      'blue': '#dbeafe',
      'pink': '#fce7f3',
      'purple': '#e9d5ff'
    };
    return colorMap[color] || '#fef3c7';
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
