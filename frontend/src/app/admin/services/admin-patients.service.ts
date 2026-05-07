import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminPatientsService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) {}

  getPatients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patients`).pipe(catchError(() => of([])));
  }

  updatePatient(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/patients/${id}`, data).pipe(catchError(() => of(null)));
  }
}
