import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Annotation {
  id: string;
  documentPath: string;
  selectedText: string;
  note: string;
  color: string;
  startOffset: number;
  endOffset: number;
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {
  private apiUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  getAnnotations(documentPath: string): Observable<{ annotations: Annotation[] }> {
    return this.http.get<{ annotations: Annotation[] }>(
      `${this.apiUrl}/annotations?documentPath=${encodeURIComponent(documentPath)}`
    );
  }

  createAnnotation(annotation: Omit<Annotation, 'createdAt' | 'updatedAt'>): Observable<any> {
    return this.http.post(`${this.apiUrl}/annotations`, annotation);
  }

  updateAnnotation(id: string, updates: { note?: string; color?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/annotations/${id}`, updates);
  }

  deleteAnnotation(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/annotations/${id}`);
  }
}
