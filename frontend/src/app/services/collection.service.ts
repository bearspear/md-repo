import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  documentCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDocument {
  path: string;
  title: string;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  modifiedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private apiUrl = 'http://localhost:3011/api';

  constructor(private http: HttpClient) {}

  // Collection CRUD operations
  getAllCollections(): Observable<{ collections: Collection[] }> {
    return this.http.get<{ collections: Collection[] }>(`${this.apiUrl}/collections`);
  }

  getCollection(id: string): Observable<Collection> {
    return this.http.get<Collection>(`${this.apiUrl}/collections/${id}`);
  }

  createCollection(collection: Partial<Collection>): Observable<{ message: string; id: string }> {
    const id = this.generateId();
    return this.http.post<{ message: string; id: string }>(`${this.apiUrl}/collections`, {
      id,
      ...collection
    });
  }

  updateCollection(id: string, updates: Partial<Collection>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/collections/${id}`, updates);
  }

  deleteCollection(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/collections/${id}`);
  }

  // Document-Collection associations
  getCollectionDocuments(collectionId: string, limit = 100, offset = 0): Observable<{ documents: CollectionDocument[] }> {
    return this.http.get<{ documents: CollectionDocument[] }>(
      `${this.apiUrl}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`
    );
  }

  getDocumentCollections(documentPath: string): Observable<{ collections: Collection[] }> {
    return this.http.get<{ collections: Collection[] }>(
      `${this.apiUrl}/documents/collections?documentPath=${encodeURIComponent(documentPath)}`
    );
  }

  addDocumentToCollection(documentPath: string, collectionId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/documents`,
      { documentPath }
    );
  }

  removeDocumentFromCollection(documentPath: string, collectionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/collections/${collectionId}/documents`,
      { body: { documentPath } }
    );
  }

  // Bulk operations
  addDocumentsToCollection(documentPaths: string[], collectionId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/collections/${collectionId}/documents/bulk`,
      { documentPaths, action: 'add' }
    );
  }

  removeDocumentsFromCollection(documentPaths: string[], collectionId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/collections/${collectionId}/documents/bulk`,
      { documentPaths, action: 'remove' }
    );
  }

  // Utility methods
  private generateId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Predefined colors for collections
  getAvailableColors(): string[] {
    return [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1'  // indigo
    ];
  }
}
