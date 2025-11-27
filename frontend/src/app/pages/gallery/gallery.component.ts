import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ImageGalleryComponent } from '../../components/image-gallery/image-gallery.component';

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    ImageGalleryComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryPageComponent {

  onImageSelected(image: any) {
    // Copy markdown reference to clipboard
    const markdownRef = `![${image.originalName || 'image'}](http://localhost:3011/api/images/${image.id})`;
    navigator.clipboard.writeText(markdownRef).then(() => {
      console.log('Copied to clipboard:', markdownRef);
    });
  }
}
