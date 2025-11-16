import { Routes } from '@angular/router';
import { MarkdownStudioComponent } from './pages/markdown-studio/markdown-studio.component';

export const routes: Routes = [
  {
    path: 'studio',
    component: MarkdownStudioComponent,
    title: 'Markdown Studio - MD-Repo'
  },
  {
    path: '',
    // Default route - existing app content will stay in AppComponent
    pathMatch: 'full',
    redirectTo: '' // For now, keeps existing behavior
  }
];
