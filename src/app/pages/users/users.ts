import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';
import {UsersService, User} from '../../services/users.service'; // servicio que crearemos
import {ChangeDetectorRef} from '@angular/core';
import { finalize, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent {
  isDrawerOpen = false;
  userForm: FormGroup;
  isCreatingUser = false;

  // evita múltiples clicks durante búsqueda
  isSearching = false;

  // Control reactivo para el input de búsqueda
  searchControl = new FormControl('');

  // ↓ Propiedades nuevas para los modales y lista de usuarios
  showConfirmModal = false;
  showSuccessModal = false;
  pendingUserData: any;
  users: User[] = [];

  // Guardamos la lista completa para filtrar localmente y restaurar
  originalUsers: User[] = [];

  // Indica si el usuario ha hecho al menos una consulta (controla visibilidad de la tabla)
  hasQueried = false;

  // Nuevo: (campo de respaldo eliminado) - usamos `searchControl` en su lugar

  // Observable compartido para la carga inicial de usuarios (evita duplicados)
  private usersLoad$?: Observable<User[]>;

  constructor(private fb: FormBuilder, private usersService: UsersService, private cdr: ChangeDetectorRef) {
    this.userForm = this.fb.group({
      document: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]+$/),
          Validators.maxLength(12),
        ],
      ],
      names: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/),
          Validators.maxLength(20),
        ],
      ],
      lastNames: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/),
          Validators.maxLength(20),
        ],
      ],
      profile: ['', Validators.required],
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^3[0-9]{9}$/),
        ],
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
      status: [{value: 'Activo', disabled: true}],
    });

    // Asegurar estado inicial limpio: no mostrar tabla hasta que el usuario consulte
    this.hasQueried = false;
    this.users = [];
    this.originalUsers = [];
    this.usersLoad$ = undefined;

    // NO cargar usuarios al inicializar el componente: los resultados deben mostrarse
    // solo cuando el usuario haga clic en "Consultar".
    // this.loadUsers();
  }

  openDrawer(document?: string) {
    this.isDrawerOpen = true;
    this.userForm.reset({status: 'Activo'});
    if (document) {
      // si nos pasan documento al abrir, intentar rellenar
      this.usersService.getUserByDocument(document).subscribe(u => {
        if (u) this.fillFormFromUser(u);
      });
    }
  }

  closeDrawer() {
    this.isDrawerOpen = false;
  }

  // consultar por documento desde el input de búsqueda (búsqueda parcial, local)
  consultarDocumento(event?: Event) {
    event?.preventDefault();
    const q = (this.searchControl.value || '').toString().trim();

    // Si el input está vacío, traer todos los usuarios y mostrarlos
    if (!q) {
      if (this.isSearching) return;
      this.isSearching = true;

      if (!this.usersLoad$) {
        this.usersLoad$ = this.usersService.getUsers().pipe(shareReplay(1));
      }

      this.usersLoad$.pipe(
        finalize(() => { this.isSearching = false; })
      ).subscribe((users: User[]) => {
        this.originalUsers = users.slice();
        this.users = users.slice();
        this.hasQueried = true;
        try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
      }, () => {
        this.isSearching = false;
        this.usersLoad$ = undefined;
      });

      return;
    }

    // Si ya tenemos la lista completa en memoria, filtramos localmente (UNA sola operación)
    if (this.originalUsers && this.originalUsers.length) {
      const lower = q.toLowerCase();
      const results = this.originalUsers.filter(u => {
        const docMatch = !!u.document && u.document.includes(q);
        const namesMatch = !!u.names && u.names.toLowerCase().includes(lower);
        const lastNamesMatch = !!u.lastNames && u.lastNames.toLowerCase().includes(lower);
        const phoneMatch = !!u.phone && u.phone.includes(q);
        const emailMatch = !!u.email && u.email.toLowerCase().includes(lower);
        const profileMatch = !!u.profile && u.profile.toLowerCase().includes(lower);
        return docMatch || namesMatch || lastNamesMatch || phoneMatch || emailMatch || profileMatch;
      });

      if (results && results.length) {
        this.users = results;
        this.hasQueried = true;
        try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
      }
      return; // terminamos, sin peticiones
    }

    // Fallback: si no tenemos usuarios cargados (rara situación), usamos usersLoad$ compartido
    if (this.isSearching) return;
    this.isSearching = true;

    if (!this.usersLoad$) {
      this.usersLoad$ = this.usersService.getUsers().pipe(shareReplay(1));
    }

    this.usersLoad$.pipe(
      finalize(() => { this.isSearching = false; })
    ).subscribe((users: User[]) => {
      this.originalUsers = users.slice();
      const lower = q.toLowerCase();
      const results = this.originalUsers.filter(u => {
        const docMatch = !!u.document && u.document.includes(q);
        const namesMatch = !!u.names && u.names.toLowerCase().includes(lower);
        const lastNamesMatch = !!u.lastNames && u.lastNames.toLowerCase().includes(lower);
        const phoneMatch = !!u.phone && u.phone.includes(q);
        const emailMatch = !!u.email && u.email.toLowerCase().includes(lower);
        const profileMatch = !!u.profile && u.profile.toLowerCase().includes(lower);
        return docMatch || namesMatch || lastNamesMatch || phoneMatch || emailMatch || profileMatch;
      });

      if (results && results.length) {
        this.users = results;
        this.hasQueried = true;
        try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
      }
    }, () => {
      this.isSearching = false;
      this.usersLoad$ = undefined;
    });
  }

  // limpiar búsqueda (restaurar listado completo o limpiar tabla)
  clearSearch() {
    this.searchControl.setValue('');
    // Limpiar la vista y la copia local: no mostrar nada hasta que el usuario consulte.
    this.users = [];
    this.originalUsers = [];
    this.hasQueried = false;
  }

  // Rellena el formulario con los datos del usuario
  fillFormFromUser(user: User) {
    this.userForm.reset({
      document: user.document || '',
      names: user.names || '',
      lastNames: user.lastNames || '',
      profile: user.profile || '',
      phone: user.phone || '',
      email: user.email || '',
      status: user.status ?? 'Activo'
    });
  }

  saveUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.pendingUserData = this.userForm.getRawValue();
    this.showConfirmModal = true; // abrir modal de confirmación
  }

  // ================= MODALES =================
  cancelCreate() {
    this.showConfirmModal = false;
    this.showSuccessModal = false; // 🔐 blindaje
  }


  confirmCreate() {
    if (this.isCreatingUser) {
      return; // 🔐 evita doble click
    }

    this.isCreatingUser = true;

    this.usersService.createUser(this.pendingUserData).subscribe({
      next: (createdUser: User) => {
        // cerrar modal de confirmación
        this.showConfirmModal = false;

        // invalidar cache local de usuarios en el componente para forzar recarga en el futuro
        this.usersLoad$ = undefined;

        // limpiar búsqueda para que no oculte nuevos registros
        try { this.searchControl.setValue(''); } catch (e) { /* noop */ }

        // Si ya había resultados visibles (originalUsers), actualizamos la lista local.
        if (this.originalUsers && this.originalUsers.length && this.hasQueried) {
          try {
            if (createdUser) {
              // evitar duplicados: si ya existe por documento, reemplazar
              const existsIndex = this.originalUsers.findIndex(u => u.document === createdUser.document);
              if (existsIndex > -1) {
                this.originalUsers[existsIndex] = createdUser;
              } else {
                this.originalUsers.unshift(createdUser);
              }

              // Actualizar la vista principal
              this.users = this.originalUsers.slice();
            }
          } catch (e) { /* noop */ }

          // Sincronizar la caché del servicio
          this.usersService.getUsers().pipe(
            finalize(() => { this.isCreatingUser = false; })
          ).subscribe((users: User[]) => {
            this.originalUsers = users.slice();
            this.users = users.slice();
            this.closeDrawer();
            this.showSuccessModal = true;
            try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
            this.pendingUserData = null;
          }, () => {
            this.isCreatingUser = false;
            this.closeDrawer();
            this.showSuccessModal = true;
            try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
            this.pendingUserData = null;
          });
        } else {
          // Si NO había resultados visibles, no poblar la tabla; solo mostramos el modal de éxito.
          this.isCreatingUser = false;
          this.closeDrawer();
          this.showSuccessModal = true;
          try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
          this.pendingUserData = null;
        }
      },
      error: () => {
        this.isCreatingUser = false;
        this.showConfirmModal = false;
        alert('Error al crear usuario');
      }
    });
  }



  closeSuccessModal() {
    this.showSuccessModal = false;
    this.isCreatingUser = false;
  }


  // loadUsers removed: users are loaded on demand when the user clicks 'Consultar'
 }
