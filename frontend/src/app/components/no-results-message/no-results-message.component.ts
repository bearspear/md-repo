import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-no-results-message',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './no-results-message.component.html',
  styleUrls: ['./no-results-message.component.css']
})
export class NoResultsMessageComponent {
  @Input() searchQuery: string = '';
}
