import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

export interface User {
  id?: number;
  document: string;
  names: string;
  lastNames: string;
  profile: string;
  phone: string;
  email: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private baseUrl = 'http://localhost:8081/users';

  // Caché compartida para evitar múltiples peticiones simultáneas
  private allUsers$?: Observable<User[]>;

  constructor(private http: HttpClient) {}

  createUser(user: User): Observable<User> {
    // limpiar caché cuando se crea un usuario correctamente
    return this.http.post<User>(this.baseUrl, user).pipe(
      tap(() => { this.allUsers$ = undefined; })
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  // Devuelve un observable compartido (cached) de todos los usuarios
  getAllUsersCached(): Observable<User[]> {
    if (!this.allUsers$) {
      this.allUsers$ = this.http.get<User[]>(this.baseUrl).pipe(
        shareReplay(1),
        catchError(err => {
          // si hay error, invalidamos la caché para permitir reintentos
          this.allUsers$ = undefined;
          return of([]);
        })
      );
    }
    return this.allUsers$;
  }

  // Intenta obtener un usuario por documento desde un endpoint específico,
  // y si falla (por ejemplo, endpoint no disponible), hace fallback a obtener
  // todos los usuarios y filtrar localmente.
  getUserByDocument(document: string): Observable<User | null> {
    if (!document) {
      return of(null);
    }

    // Intento directo a un endpoint RESTful /users/document/{document}
    return this.http.get<User>(`${this.baseUrl}/document/${document}`).pipe(
      catchError(() =>
        // Fallback: traer todos y filtrar localmente usando caché compartida
        this.getAllUsersCached().pipe(
          map(users => users.find(u => u.document === document) ?? null),
          catchError(() => of(null))
        )
      )
    );
  }

  // Búsqueda parcial: intenta endpoint /users/search?q=... y si falla filtra localmente
  getUsersByQuery(query: string): Observable<User[]> {
    if (!query) return of([]);
    const q = query.toString().toLowerCase();

    // Intentar un endpoint de búsqueda (posible ruta en backend)
    return this.http.get<User[]>(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`).pipe(
      catchError(() =>
        // Fallback: traer todos y filtrar localmente por contains en varios campos (usando cache)
        this.getAllUsersCached().pipe(
          map(users => users.filter(u => {
            const docMatch = !!u.document && u.document.includes(query);
            const namesMatch = !!u.names && u.names.toLowerCase().includes(q);
            const lastNamesMatch = !!u.lastNames && u.lastNames.toLowerCase().includes(q);
            const phoneMatch = !!u.phone && u.phone.includes(query);
            const emailMatch = !!u.email && u.email.toLowerCase().includes(q);
            const profileMatch = !!u.profile && u.profile.toLowerCase().includes(q);
            return docMatch || namesMatch || lastNamesMatch || phoneMatch || emailMatch || profileMatch;
          })),
          catchError(() => of([]))
        )
      )
    );
  }
}
