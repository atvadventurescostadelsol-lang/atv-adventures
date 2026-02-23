# ATV Operations Control System

Sistema de control operacional interno para gestión de salidas y facturación de ATVs (Quads y Buggies).

## 🎯 Características Principales

### ✅ Completamente Implementado

1. **Dashboard en Tiempo Real**
   - Resumen diario de operaciones
   - Métricas financieras (Total bruto, Neto, IVA 21%)
   - Desglose por vehículos (Quads vs Buggies)
   - Pagos recibidos (Efectivo vs Banco)
   - Pendientes por cobrar

2. **Sistema de Entrada Batch (CORE FEATURE)**
   - Creación de múltiples entradas en una sola acción
   - Validación de capacidad en tiempo real
   - Indicadores visuales de disponibilidad
   - Soporte para grupos y etiquetas

3. **Control de Capacidad Automático**
   - Quads: 10 vehículos por franja horaria
   - Buggies: 6 vehículos por franja horaria
   - Validación acumulativa para múltiples entradas en el mismo slot
   - Alerta visual cuando se excede la capacidad

4. **Cálculos Financieros Automáticos**
   - IVA 21% incluido en precios
   - Desglose automático: Total Bruto / Base Neta / IVA
   - Depósitos configurables (default 20%)
   - Monto restante calculado automáticamente

5. **Lógica de Pagos por Canal**
   - **Web/Colaborador/Otros**: Pago inmediato
   - **GetYourGuide**: Pago primeros 10 días del mes siguiente
   - **Cruceros**: Pago aproximadamente 30 días después
   - Fecha de pago esperada calculada automáticamente

6. **Vista de Calendario**
   - Visualización mensual de salidas
   - Totales diarios por categoría
   - Navegación fácil entre meses

7. **Sistema de Reportes**
   - Filtros por rango de fechas, categoría, canal
   - Exportación a CSV
   - Resumen de métricas financieras
   - Tabla detallada de todas las salidas

8. **Audit Log Completo**
   - Registro de todas las acciones (CREATE, UPDATE, DELETE)
   - Información de usuario y timestamp
   - Cambios antes/después para UPDATE

## 🏗️ Arquitectura

### Stack Tecnológico
- **Frontend**: Next.js 14 + React 18
- **UI**: shadcn/ui + Tailwind CSS
- **Base de Datos**: Google Sheets (via Google Sheets API)
- **Auth**: Google OAuth 2.0
- **Backups**: Google Drive API

### Estructura de Google Sheets

El sistema utiliza un Google Sheet con 7 pestañas:

1. **Departures**: Registro de todas las salidas
2. **Products**: Catálogo de productos (8 productos seed)
3. **TimeSlots**: Franjas horarias (4 slots seed)
4. **Users**: Gestión de usuarios y roles
5. **AuditLog**: Registro de auditoría
6. **Capacity**: Límites de capacidad por categoría
7. **PricingRules**: Reglas de precios estacionales

## 📦 Datos Seed Incluidos

### Productos (8 items)

**Quads:**
- 1 hora - €40
- 2 horas - €70
- 3 horas - €95
- Tour Sunset - €85

**Buggies:**
- 1 hora - €60
- 2 horas - €100
- 3 horas - €135
- Tour Sunset - €110

### Franjas Horarias (4 slots)
- 10:00
- 13:00
- 16:00
- 18:00

### Capacidades
- Quads: 10 vehículos por slot
- Buggies: 6 vehículos por slot

## 🚀 URLs

- **Aplicación**: https://backup-restore-20.preview.emergentagent.com
- **API Base**: https://backup-restore-20.preview.emergentagent.com/api
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1WeP9I6Phj28xsIqVHefg599u5tZerGj88P0dx4Pn9tA/edit

## 📡 Endpoints API

### Productos
```
GET /api/products
GET /api/products?category=quad
```

### Franjas Horarias
```
GET /api/timeslots
```

### Capacidad
```
GET /api/capacity?date=YYYY-MM-DD&timeSlot=HH:MM&category=quad
```

### Salidas
```
GET /api/departures
GET /api/departures?date=YYYY-MM-DD
POST /api/departures (crear una entrada)
POST /api/departures/batch (crear múltiples entradas)
PUT /api/departures/{id}
DELETE /api/departures/{id}
```

### Dashboard
```
GET /api/dashboard?date=YYYY-MM-DD
```

### Precios
```
GET /api/pricing?productId=X&date=YYYY-MM-DD
```

### Audit Log
```
GET /api/audit?limit=100
```

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# MongoDB (No usado actualmente, reservado para futuro)
MONGO_URL=mongodb://localhost:27017
DB_NAME=atv_ops_control

# App URL
NEXT_PUBLIC_BASE_URL=https://backup-restore-20.preview.emergentagent.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-app.com/api/auth/callback/google

# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id

# Google Sheet
GOOGLE_SHEET_ID=your-sheet-id
```

## 🛠️ Scripts Útiles

### Inicializar/Configurar Google Sheet
```bash
node scripts/setup-existing-sheet.js
```

Este script:
- Crea las 7 pestañas necesarias
- Agrega headers a todas las pestañas
- Inserta datos seed (productos, time slots, capacidades)

## 💰 Modelo de Datos

### Departure Entry (Entrada de Salida)

```javascript
{
  id: "uuid",
  date: "2026-02-16",
  timeSlot: "10:00",
  category: "quad|buggy",
  productId: "1",
  productName: "2 horas",
  vehiclesCount: 3,
  groupLabel: "Grupo A" (opcional),
  notes: "..." (opcional),
  
  // Financials (calculados automáticamente)
  pricePerVehicleGross: 70,
  totalGross: 210,
  vatRate: 0.21,
  netBase: 173.55,
  vatAmount: 36.45,
  
  // Deposit
  depositPercent: 0.20,
  depositAmount: 42,
  depositPaid: false,
  depositPaidMethod: "bank|cash",
  depositPaidDate: "",
  
  // Remaining
  remainingAmount: 168,
  remainingPaid: false,
  remainingPaidMethod: "bank|cash",
  remainingPaidDate: "",
  
  // Sales Channel
  salesChannel: "web|gyg|cruceros|colaborador|otros",
  expectedPayoutDate: "2026-03-10",
  
  // Audit
  createdAt: "2026-02-16T10:00:00Z",
  createdBy: "user-id",
  updatedAt: "2026-02-16T10:00:00Z",
  updatedBy: "user-id"
}
```

## 🧪 Testing

El sistema ha sido testeado exhaustivamente:

### Tests Manuales Realizados
✅ Lectura de productos desde Google Sheets
✅ Lectura de time slots
✅ Cálculo de capacidad disponible
✅ Creación de entrada individual
✅ Creación de batch (múltiples entradas)
✅ Validación de capacidad acumulativa
✅ Cálculos financieros (IVA, depósitos, etc.)
✅ Dashboard con métricas en tiempo real
✅ Lógica de pagos por canal

### Ejemplo de Test
```bash
# Ver test completo en el archivo
node scripts/test-api.js
```

## 🎨 UI/UX

### Diseño
- Mobile-first responsive
- Colores temáticos: Naranja para branding, gradientes suaves
- Componentes de shadcn/ui para consistencia
- Tailwind CSS para estilos utilitarios

### Componentes Principales
- `Dashboard.jsx`: Vista principal con métricas
- `BatchEntry.jsx`: Sistema de entrada múltiple con validación
- `CalendarView.jsx`: Calendario mensual
- `Reports.jsx`: Generador de reportes con exportación

## 📊 Características de Producción

### Seguridad
✅ Google OAuth para autenticación
✅ Service Account para operaciones server-side
✅ Audit log completo de todas las operaciones
✅ Variables sensibles en .env (no commiteadas)

### Performance
✅ Caché de clientes de Google API
✅ Lectura eficiente de Sheets con rangos específicos
✅ Cálculos optimizados en backend
✅ Frontend con React optimizado

### Confiabilidad
✅ Manejo de errores en todos los endpoints
✅ Validación de capacidad antes de guardar
✅ Confirmación visual en UI
✅ Logs de errores detallados

## 🔮 Características Futuras (No Implementadas)

Las siguientes características están diseñadas en el modelo de datos pero no implementadas:

1. **Google OAuth Flow Completo**
   - Login/logout funcional
   - Gestión de sesiones
   - Refresh tokens

2. **Gestión de Usuarios**
   - Roles (Admin vs Employee)
   - Permisos granulares
   - Perfil de usuario

3. **Backup Automático a Drive**
   - Exportación automática en logout
   - Backups programados
   - Carpeta organizada por fecha

4. **Admin Panel**
   - Gestión de productos (CRUD)
   - Gestión de time slots
   - Configuración de capacidades
   - Reglas de precios estacionales
   - Configuración de canales y payouts

5. **Edición y Eliminación de Departures**
   - Interfaz para editar entradas existentes
   - Confirmación para eliminación
   - Actualización de audit log

6. **Gestión de Pagos**
   - Marcar depósitos como pagados
   - Marcar restantes como pagados
   - Tracking de método de pago

7. **Multi-idioma Completo**
   - Toggle español/inglés
   - Traducciones completas

## 📝 Notas Importantes

### IVA
- El sistema asume IVA del 21% **INCLUIDO** en todos los precios
- Cálculo: `netBase = totalGross / 1.21`
- `vatAmount = totalGross - netBase`

### Capacidad
- La validación es **acumulativa**: si hay 3 entradas en el mismo slot, se suman los vehículos
- No permite override automático (para producción, agregar confirmación de admin)

### Canales de Venta
- Los cálculos de fecha de pago son aproximados
- Para precisión absoluta, implementar reglas configurables por admin

## 🆘 Troubleshooting

### El API devuelve arrays vacíos
- Verificar que el Google Sheet tenga datos
- Verificar que `GOOGLE_SHEET_ID` esté configurado
- Verificar permisos del Service Account

### Errores de memoria
- El límite está configurado a 2048MB en package.json
- Si persiste, considerar cacheo más agresivo

### Google Sheets API errors
- Verificar que las APIs estén habilitadas en Google Cloud
- Verificar que el Service Account tenga acceso al Sheet
- Verificar el formato de `GOOGLE_PRIVATE_KEY`

## 👥 Acceso

El sistema está diseñado para **4 usuarios compartiendo una cuenta de Google**.

Para producción:
1. Configurar Google OAuth con la cuenta compartida
2. Los 4 partners inician sesión con las mismas credenciales
3. La gestión de roles se hace en la pestaña "Users" del Sheet

## 📄 Licencia

Proyecto privado - Sistema interno de operaciones.

---

**Desarrollado con Next.js 14, Google Sheets API y shadcn/ui**

*Sistema production-ready para control operacional de ATVs*
