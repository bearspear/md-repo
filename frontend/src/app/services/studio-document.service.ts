import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StudioDocument {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  createdAt: string;
}

export interface StudioDocumentSummary {
  id: string;
  title: string;
  lastModified: string;
  createdAt: string;
  previewText: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudioDocumentService {
  private apiUrl = 'http://localhost:3001/api/studio/documents';

  constructor(private http: HttpClient) {}

  /**
   * Save or update a studio document
   */
  saveDocument(document: StudioDocument): Observable<{ message: string; document: StudioDocument }> {
    return this.http.post<{ message: string; document: StudioDocument }>(
      this.apiUrl,
      document
    );
  }

  /**
   * Load a studio document by ID
   */
  loadDocument(id: string): Observable<StudioDocument> {
    return this.http.get<StudioDocument>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all studio documents (summaries only)
   */
  getAllDocuments(): Observable<{ documents: StudioDocumentSummary[] }> {
    return this.http.get<{ documents: StudioDocumentSummary[] }>(this.apiUrl);
  }

  /**
   * Delete a studio document
   */
  deleteDocument(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Generate a unique ID for a new document
   */
  generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
