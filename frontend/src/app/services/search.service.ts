import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SearchResult {
  path: string;
  title: string;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  modifiedAt: number;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export interface Document {
  path: string;
  title: string;
  content: string;
  rawContent: string;
  frontmatter: any;
  tags: string[];
  topics: string[];
  contentType: string;
  wordCount: number;
  createdAt: number;
  modifiedAt: number;
  indexedAt: number;
}

export interface Stats {
  totalDocuments: number;
  totalWords: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface Topic {
  name: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = 'http://localhost:3011/api';

  constructor(private http: HttpClient) {}

  search(query: string, options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
    topics?: string[];
    contentType?: string;
  }): Observable<SearchResponse> {
    let params = new HttpParams().set('q', query);

    if (options) {
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.offset) params = params.set('offset', options.offset.toString());
      if (options.tags && options.tags.length > 0) {
        params = params.set('tags', options.tags.join(','));
      }
      if (options.topics && options.topics.length > 0) {
        params = params.set('topics', options.topics.join(','));
      }
      if (options.contentType) {
        params = params.set('contentType', options.contentType);
      }
    }

    return this.http.get<SearchResponse>(`${this.apiUrl}/search`, { params });
  }

  getDocument(path: string): Observable<Document> {
    const params = new HttpParams().set('path', path);
    return this.http.get<Document>(`${this.apiUrl}/document`, { params });
  }

  getAllDocuments(limit: number, offset: number): Observable<{ total: number; documents: SearchResult[] }> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<{ total: number; documents: SearchResult[] }>(`${this.apiUrl}/documents`, { params });
  }

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`);
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  getTopics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.apiUrl}/topics`);
  }

  triggerReindex(): Observable<any> {
    return this.http.post(`${this.apiUrl}/index`, {});
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  uploadMultipleFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post(`${this.apiUrl}/upload/multiple`, formData);
  }

  getConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`);
  }

  updateWatchDirectory(directory: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/config/watch-directory`, { directory });
  }

  saveDocument(path: string, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/document`, { path, content });
  }
}
