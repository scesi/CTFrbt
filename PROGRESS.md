# PROGRESS - Dashboard Admin: Gestion de Usuarios y Equipos

Rama actual: feature/dashboard-vistas-gestion
Rama base: dev
Fecha inicio: 2026-07-21
Status: EN PROGRESO

---

## OBJETIVOS DE ESTA RAMA

- [x] Paso 1: Backend de Usuarios (/api/admin/users) - CODIGO LISTO, PENDIENTE CONFIRMACION
  - [x] GET - Listar todos los usuarios
  - [x] POST - Crear usuario (si es necesario)
  - [x] PATCH/DELETE individual en [id]

- [x] Paso 2: Acceso Admin en Sidebar (frontend)
  - [x] Boton admin visible en Sidebar solo para isAdmin
  - [x] Navega a /admin al hacer click
  - [x] Corregido hydration mismatch (session pasada desde layout)

- [ ] Paso 3: Backend de Equipos (/api/admin/teams)

- [ ] Paso 4: Frontend de Equipos (TeamsView.tsx)

- [ ] Paso 5: Frontend de Usuarios (UsersView.tsx)
  - [ ] Tabla de usuarios
  - [ ] Formularios editar/eliminar

- [ ] Paso 6: Refactorizar AdminDashboard con tabs/vistas

---

## COMMITS REALIZADOS

1. feat: backend de usuarios con GET/POST/PATCH/DELETE
   - src/app/api/admin/users/route.ts (GET, POST)
   - src/app/api/admin/users/[id]/route.ts (PATCH, DELETE)

2. feat: acceso admin en sidebar con proteccion isAdmin
   - src/components/Sidebar.tsx (nodo admin, navegacion href)
   - src/components/TerminalWindow.tsx (paso session prop)
   - src/app/layout.tsx (paso session a TerminalWindow)

---

## NOTAS DE APRENDIZAJE

Sesion 1 - Backend de Usuarios (EN PROGRESO):

ARCHIVOS CREADOS:
- /src/app/api/admin/users/route.ts
  - GET: Lista usuarios con alias, name, permisos, equipo, counts
  - POST: Crear usuario manualmente (TODO: hashear password)

- /src/app/api/admin/users/[id]/route.ts
  - PATCH: Editar name, isAdmin, isTeamLeader (spread operator para campos opcionales)
  - DELETE: Borrar usuario (proteccion: no borrarse a si mismo)

DECISIONES DE DISENO:
1. SELECT especifico en queries - nunca devolver password
2. POST password sin hashear - TODO hacerlo cuando hagamos register
3. PATCH usa spread operator - solo actualiza campos enviados
4. DELETE proteccion contra self-delete
5. Validaciones: 403 Forbidden, 404 Not Found, 400 Bad Request

QUE NO SE HIZO (y por que):
- Frontend (UsersView.tsx) - se hace en Paso 5
- Password hashing - lo haremos despues cuando armonicemos con register
- ActivityLog/Auditoria - opcional, podemos agregar si piden
- Email validation - schema solo tiene alias/name/password

Sesion 2 - Acceso Admin en Sidebar:

ARCHIVOS MODIFICADOS:
- /src/components/Sidebar.tsx
  - Se agrego el item admin al final del arbol (debajo de team)
  - Solo se renderiza si session.user.isAdmin es true
  - Al hacer click navega a /admin

- /src/components/TerminalWindow.tsx
  - Recibe session como prop desde layout
  - Pasa session a Sidebar

- /src/app/layout.tsx
  - Pasa session a TerminalWindow

DECISIONES DE DISENO:
1. Mantener el item admin como parte del mismo arbol visual
2. No crear un boton separado para no romper la estetica del sidebar
3. Filtrar por rol desde el frontend, pero mantener la proteccion real en /admin

CORRECCION DE HYDRATION MISMATCH:
- El problema: useSession() dentro de Sidebar causaba diferencias entre SSR y cliente
- La solucion: pasar session desde layout.tsx (getServerSession) como prop estable
- Esto asegura que servidor y cliente empiecen con la misma informacion
- useSession() se mantiene para actualizaciones en tiempo real, pero no para decisiones de renderizado inicial

---

## DECISIONES TOMADAS

1. Orden: Backend primero, Frontend despues (mas logico para aprendizaje)
2. Empezamos con Usuarios porque es mas simple que Equipos
3. Seguimos el patron existente en /api/admin/challenges
4. Session se pasa desde layout para evitar hydration mismatch
5. Admin se muestra debajo de team en el sidebar

---

## CONTEXTO PARA CONTINUAR EN OTRO CHAT

Proyecto: CTFrbt, plataforma CTF con Next.js 15, React 19, Prisma, PostgreSQL, NextAuth y pnpm.

Rama activa: feature/dashboard-vistas-gestion sobre dev.

Objetivo de esta rama: avanzar en el frontend del admin por partes, no todo en uno.

### Estado actual de archivos clave:

**Backend (completado):**
- src/app/api/admin/users/route.ts - GET lista usuarios, POST crea usuario
- src/app/api/admin/users/[id]/route.ts - PATCH edita (name, isAdmin, isTeamLeader), DELETE borra usuario
- src/app/api/admin/challenges/route.ts - GET lista challenges, POST crea challenge
- src/app/api/admin/challenges/[id]/route.ts - PUT edita, DELETE elimina challenge
- src/app/api/admin/game/route.ts - POST configura horarios inicio/fin
- src/app/api/admin/announcements/route.ts - POST crea anuncios

**Frontend (parcialmente completado):**
- src/components/Sidebar.tsx - Arbol de navegacion con nodo admin (solo visible para isAdmin)
- src/components/TerminalWindow.tsx - Contenedor principal, recibe session prop
- src/app/layout.tsx - Layout raiz, pasa session a TerminalWindow
- src/app/admin/page.tsx - Entry point del admin, verifica isAdmin, carga AdminDashboard
- src/components/AdminDashboard.tsx - Panel admin monolitico (challenges, game config, announcements)

**Base de datos:**
- prisma/schema.prisma - Schema completo con User, Team, Challenge, Submission, Score, etc.
- prisma/seed.ts - Seed con usuarios (admin/admin123, alice/password), equipos, challenges

**Auth:**
- src/lib/auth.ts - NextAuth con CredentialsProvider, bcrypt, rate limiting, session DB
- src/types/next-auth.d.ts - Tipos de session y JWT extendidos

### Arquitectura del proyecto:

Flujo de datos: Frontend (React) -> API Routes (Next.js) -> Prisma ORM -> PostgreSQL

Patron Server/Client Components:
- Server Components: pueden acceder a getServerSession() y base de datos directamente
- Client Components: usan useSession() y deben hacer fetch() a APIs

Middleware (src/middleware.ts):
- Rate limit por IP (30 requests/10s)
- Proteccion de rutas /api/admin (requiere token isAdmin)

Cache (src/lib/cache.ts):
- Cache en memoria con TTL
- invalidate() para limpiar despues de mutaciones

### Lo que falta por hacer (prioridad):

1. Corregir hydration mismatch en Sidebar (HECHO - session pasada desde layout)
2. Crear UsersView.tsx - vista de gestion de usuarios (tabla, editar, eliminar)
3. Integrar UsersView en AdminDashboard con sistema de tabs
4. Backend de equipos (/api/admin/teams) - GET, PATCH, DELETE
5. Frontend de equipos (TeamsView.tsx)
6. Refactorizar AdminDashboard con tabs/vistas
7. Agregar boton de logout visible

### Como correr el proyecto:

```bash
cd /home/qwerty/Documentos/scesi_CTFrbt/CTFrbt
docker-compose up -d  # Iniciar PostgreSQL en puerto 5433
pnpm install  # Instalar dependencias
cp .env.example .env  # Configurar variables de entorno
pnpm prisma:generate  # Generar cliente Prisma
pnpm prisma:migrate  # Ejecutar migraciones
pnpm db:seed  # Poblar base de datos
pnpm dev  # Iniciar servidor de desarrollo
```

Credenciales de seed:
- Admin: admin / admin123
- Usuarios: alice, bob, charlie, Stevenjoelrs / password
- Equipos: Alpha (ALPHA001), Bravo (BRAVO001)

### Reglas de trabajo:

1. Antes de tocar codigo, explicar que archivo se cambia y por que
2. Mantener el diseno y estetica del proyecto (CRT terminal theme)
3. Hacer commits cuando corresponda
4. Documentar todo en este PROGRESS.md
5. No hacer cosas que sobren o que son huerfanas
6. El backend protege la seguridad real; el frontend es solo presentacion
