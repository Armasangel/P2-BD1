# 🌱 AgroStock
### Sistema de Gestión de Inventario y Ventas — cc3088 Bases de Datos 1

---

## 🚀 Levantar el proyecto

**Requisitos:** Docker Desktop instalado y corriendo.

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd <nombre-del-repo>

# 2. Crear el archivo de entorno
cp .env.example .env

# 3. Levantar todo (primera vez ~2 min)
docker compose up --build

# Reiniciar sin reconstruir
docker compose up
```

La aplicación queda disponible en **http://localhost:3000**

> **Nota:** Si cambiaste datos en la BD y quieres reiniciar desde cero:
> ```bash
> docker compose down -v   # elimina el volumen
> docker compose up --build
> ```

---

## 🔐 Usuarios de prueba

Contraseña para todos: **`password123`**

| Correo                    | Rol       |
|---------------------------|-----------|
| `admin@agrostock.com`     | DUEÑO     |
| `ana@agrostock.com`       | EMPLEADO  |
| `luis@agrostock.com`      | EMPLEADO  |
| `pedro@gmail.com`         | COMPRADOR |

---

## 🗄️ Base de datos

| Parámetro  | Valor            |
|------------|------------------|
| Usuario    | `proy2`          |
| Contraseña | `secret`         |
| Base       | `agrostock_db`   |
| Puerto     | `5433` (host)    |

**pgAdmin:** http://localhost:5050  
Login: `admin@agrostock.com` / `admin123`

Conexión en pgAdmin → Host: `db`, Port: `5432`, DB: `agrostock_db`, User: `proy2`, Pass: `secret`

---

## 🛠️ Stack

| Capa            | Tecnología                    |
|-----------------|-------------------------------|
| Frontend+Backend| Next.js 14 (App Router)       |
| Base de datos   | PostgreSQL 16                 |
| Autenticación   | JWT (jsonwebtoken + bcryptjs) |
| Queries         | SQL explícito via `pg`        |
| Contenedores    | Docker + Docker Compose       |

---

## 📁 Estructura relevante

```
├── app/
│   ├── api/
│   │   ├── login/       → POST autenticación
│   │   ├── logout/      → POST cerrar sesión
│   │   ├── register/    → POST registro de usuario
│   │   ├── sesion/      → GET sesión activa
│   │   ├── stats/       → GET métricas dashboard
│   │   ├── productos/   → GET/POST/PUT/DELETE productos
│   │   ├── proveedores/ → GET/POST proveedores
│   │   ├── ventas/      → GET/POST ventas (con transacción)
│   │   ├── reportes/    → GET reportes con GROUP BY / CTE
│   │   ├── deudores/    → GET vista v_deudores
│   │   └── inventario/
│   │       └── entrada/ → POST entrada de stock (transacción)
│   ├── dashboard/       → Panel principal
│   ├── inventario/      → Inventario por bodega
│   ├── productos/       → CRUD de productos
│   ├── ventas/          → Registro y listado de ventas
│   ├── reportes/        → Reportes con exportación CSV
│   ├── login/
│   └── register/
├── lib/
│   └── auth.ts          → JWT + bcrypt helpers
├── init/
│   └── 01_schema.sql    → DDL + índices + vistas + 25+ registros/tabla
├── docker-compose.yml
└── .env.example
```

---

## ✅ Criterios cubiertos (rúbrica Proyecto 2)

### I. Diseño de BD
- [x] DDL completo con PK, FK, NOT NULL
- [x] 5 índices con `CREATE INDEX` justificados
- [x] 2 vistas (`v_deudores`, `v_ventas_por_categoria`)
- [x] 25+ registros por tabla en datos de prueba
- [ ] Diagrama ER (ver `/docs/ER.png`)
- [ ] Normalización documentada (ver `/docs/normalizacion.md`)

### II. SQL (desde la app)
- [x] JOINs múltiples (productos + categoría + marca + bodega)
- [x] Subqueries con EXISTS / IN (productos bajo stock mínimo)
- [x] GROUP BY + HAVING + agregaciones (reportes de ventas)
- [x] CTE `WITH` (ranking de productos más vendidos)
- [x] VIEW consumida por el backend (`v_deudores`)
- [x] Transacción explícita con ROLLBACK (ventas, registro de stock)

### III. Aplicación web
- [x] CRUD completo: Productos y Proveedores
- [x] Reportes con datos reales visibles en UI
- [x] Manejo de errores visible al usuario
- [x] README funcional con docker compose up

### IV. Avanzado
- [x] Autenticación login/logout con sesión JWT
- [x] Exportar reporte a CSV
