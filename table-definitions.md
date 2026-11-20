# Table Definitions

Configuración declarativa de las tablas que **DB Promote** puede comparar (TEST vs PROD) y promover mediante scripts T-SQL.

> **Fuente de verdad.** Este archivo define, para cada tabla: cómo se filtra, cómo se identifica un registro, qué columnas se comparan, cómo se genera el SQL y en qué instancia(s) se aplica.

## Tabla de contenido

1. [Reglas importantes](#reglas-importantes)
2. [Jerarquía de filtros](#jerarquía-de-filtros)
3. [Tipos](#tipos)
4. [Interfaz `TableDefinition`](#interfaz-tabledefinition)
5. [Catálogo de tablas](#catálogo-de-tablas)
6. [Detalle por tabla](#detalle-por-tabla)
7. [Cómo agregar una tabla nueva](#cómo-agregar-una-tabla-nueva)
8. [Ejemplos de SQL generado](#ejemplos-de-sql-generado)
9. [Notas y puntos de atención](#notas-y-puntos-de-atención)

---

## Reglas importantes

- ⚠️ Toda tabla nueva que se quiera comparar **debe registrarse** en `TABLE_DEFINITIONS`.
- ⚠️ Los nombres de tabla y columnas (`tableName`, `keyColumn`, `valueColumns`, `filterColumn`, `compositeKeys`, `insertColumns`) deben coincidir **exactamente** con el schema de SQL Server. Si el schema cambia, este archivo debe actualizarse.
- Los nombres de servidor, base de datos y prefijos de linked server están en `src/domain/config/instances.ts`.

---

## Jerarquía de filtros

El contexto global de la app sigue esta jerarquía. Cada tabla con `selectorType: 'CONTEXT'` declara en `contextLevel` qué nivel necesita.

```text
Customer (Nit)
 └─ Product (ProductId)
     ├─ SubProduct (SubProductId)
     └─ Resource (ResourcesId)
```

---

## Tipos

### `UpdateStrategy`

Estrategia de generación del SQL de `UPDATE`.

| Valor | Descripción |
|-------|-------------|
| `SIMPLE` | El registro se identifica por `keyColumn` dentro del scope de `filterColumn`. |
| `COMPOSITE_KEY` | El registro se identifica por una llave compuesta (`compositeKeys`). Requiere `UPDATE ... FROM ... INNER JOIN` contra la tabla del entorno origen. |

Ejemplo `SIMPLE`:

```sql
UPDATE SettingsByProduct
SET Value = '...'
WHERE ProductId = 1925 AND SettingId = 9;
```

Ejemplo `COMPOSITE_KEY`:

```sql
UPDATE D
SET D.Config = O.Config
FROM Template D
INNER JOIN DEV_ADMINCOM.ADMINCOM.dbo.Template O
  ON D.TemplateId = O.TemplateId AND D.Name = O.Name
WHERE O.TemplateId = 10900 AND O.Name = '...';
```

### `SelectorType`

Cómo obtiene el usuario el valor de `filterValue` para comparar.

| Valor | Descripción |
|-------|-------------|
| `CONTEXT` | Se usa el contexto global (Customer, Product, SubProduct o Resource). El nivel exacto lo define `contextLevel`. |
| `MANUAL` | El usuario ingresa el ID manualmente (o lo busca por nombre) en el `ComparisonFilterBar`. Ej.: `Template`. |

### `ContextLevel`

Nivel del contexto global requerido. Solo aplica si `selectorType === 'CONTEXT'`.

| Valor | Se filtra por |
|-------|---------------|
| `CUSTOMER` | `Customers.Nit` |
| `PRODUCT` | `Product.ProductId` |
| `SUBPRODUCT` | `SubProduct.SubProductId` |
| `RESOURCE` | `Resources.ResourcesId` |

### `TargetInstance`

Instancia(s) de SQL Server donde se aplica el script generado.

| Valor | Descripción |
|-------|-------------|
| `PROJECT5X` | RDS en AWS. Instancia principal de TEST/QA. |
| `CADCORE` | On-premise. Instancia legacy. |
| `BOTH` | La tabla existe en ambas instancias; el script se genera para las dos (cada una con su linked server como origen). |

---

## Interfaz `TableDefinition`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `tableName` | `string` | ✅ | Nombre físico de la tabla en SQL Server. Case-sensitive si el servidor lo es. |
| `displayName` | `string` | ✅ | Nombre amigable para el dropdown y los headers de la UI. |
| `keyColumn` | `string` | ✅ | Columna que identifica un registro **dentro del scope del filtro**. Se usa en el `WHERE` del UPDATE SIMPLE, en el `IF NOT EXISTS` del INSERT y en la columna "KEY" de la UI. |
| `valueColumns` | `string[]` | ✅ | Columnas comparadas entre TEST y PROD para decidir `IGUAL` o `DIFERENTE`. Solo se comparan estas (los IDs autoincrementales no, porque difieren legítimamente entre entornos). |
| `filterColumn` | `string` | ✅ | Columna por la que se filtra en el `SELECT` inicial y en el `WHERE` del UPDATE / `IF NOT EXISTS`. Corresponde al valor enviado a `/api/compare?filter=X`. |
| `updateStrategy` | `UpdateStrategy` | ✅ | Estrategia de generación del UPDATE. |
| `compositeKeys` | `string[]` | ➖ | Llave compuesta para `COMPOSITE_KEY`. Se ignora en `SIMPLE`. |
| `selectorType` | `SelectorType` | ✅ | Cómo se obtiene el filtro (`CONTEXT` o `MANUAL`). |
| `contextLevel` | `ContextLevel` | ➖ | Nivel del contexto requerido (solo `CONTEXT`). Si falta en el contexto, el `ComparisonFilterBar` muestra "Falta seleccionar: X" y bloquea el botón **Comparar**. |
| `manualPlaceholder` | `string` | ➖ | Placeholder del input en modo `MANUAL`. Ej.: `'Ej: 10900'`. |
| `hasIdentity` | `boolean` | ➖ | `true` si hay una columna IDENTITY cuyo valor se preserva en el INSERT (mismo ID en TEST y PROD). |
| `identityColumn` | `string` | ➖ | Nombre de la columna IDENTITY cuando `hasIdentity` es `true`. Se usa en `SET IDENTITY_INSERT`. |
| `targetInstance` | `TargetInstance` | ➖ | Instancia destino. Default: `'PROJECT5X'`. |
| `insertColumns` | `string[]` | ➖ | Columnas del `INSERT` cuando el registro es NUEVO en TEST. Default: `[filterColumn, keyColumn, ...valueColumns]`. Deben ir **en el mismo orden** del `CREATE TABLE`. Se recomienda definirlas explícitamente en tablas con muchas columnas obligatorias. |

### Comportamiento con `hasIdentity: true`

El generador envuelve el INSERT así:

```sql
SET IDENTITY_INSERT dbo.Template ON;
INSERT INTO dbo.Template (...) SELECT ... FROM ...
SET IDENTITY_INSERT dbo.Template OFF;
```

Ejemplos: `Product.ProductId` → `true` (mismo ID en TEST y PROD). `SettingsByProduct` → `false`.

---

## Catálogo de tablas

Orden de las entradas en el archivo: Customer → Product (y hijas) → SubProduct → Resource → Manuales.

| Tabla | Display name | Nivel / Selector | `filterColumn` | `keyColumn` | `valueColumns` | Estrategia | Identity | Instancia |
|-------|--------------|------------------|----------------|-------------|----------------|------------|----------|-----------|
| `Customers` | Clientes | `CONTEXT` · `CUSTOMER` | `Nit` | `Nit` | `Name`, `Description` | `SIMPLE` | No | `PROJECT5X` |
| `Product` | Productos | `CONTEXT` · `PRODUCT` | `ProductId` | `ProductId` | `Name`, `Description`, `Type` | `SIMPLE` | `ProductId` | `PROJECT5X` |
| `SubProduct` | SubProductos | `CONTEXT` · `PRODUCT` | `ProductId` | `SubProductId` | `Name`, `Description` | `SIMPLE` | `SubProductId` | `PROJECT5X` |
| `SettingsByProduct` | Configuraciones por Producto | `CONTEXT` · `PRODUCT` | `ProductId` | `SettingId` | `Value` | `SIMPLE` | No | `PROJECT5X` |
| `Resources` | Recursos | `CONTEXT` · `PRODUCT` | `ProductId` | `ResourcesId` | `Space`, `Properties` | `SIMPLE` | `ResourcesId` | `PROJECT5X` |
| `RulesByProduct` | Reglas por Producto | `CONTEXT` · `PRODUCT` | `ProductId` | `RulesByProductId` | `Data`, `DefaultValue`, `EquivalentValue` | `SIMPLE` | No | `PROJECT5X` |
| `FileSchemas` | Esquemas de Archivos | `CONTEXT` · `PRODUCT` | `ProductId` | `FileName` | `FileSchema`, `FileVersion` | `SIMPLE` | No | `PROJECT5X` |
| `FilesByProduct` | Archivos por Producto | `CONTEXT` · `PRODUCT` | `ProductId` | `FilesByProductId` | `Patron`, `Extension` | `SIMPLE` | `FilesByProductId` | `PROJECT5X` |
| `JsonDianEquivalences` | Equivalencias Json DIAN | `CONTEXT` · `PRODUCT` | `ProductId` | `EquivalenceId` | `ClientFieldName`, `ClientFieldPath` | `SIMPLE` | No | `PROJECT5X` |
| `JsonDianTemplates` | Templates JSON DIAN | `CONTEXT` · `PRODUCT` | `ProductId` | `ProductId` | `Jsontemplate`, `Status` | `SIMPLE` | No | `PROJECT5X` |
| `FieldByProduct` | Campos por Producto | `CONTEXT` · `PRODUCT` | `ProductId` | `FieldId` | `FieldName`, `FieldPath` | `SIMPLE` | No | `PROJECT5X` |
| `SettingsBySubProduct` | Configuraciones por SubProducto | `CONTEXT` · `SUBPRODUCT` | `SubProductId` | `SettingId` | `Value` | `SIMPLE` | No | `PROJECT5X` |
| `ResourceConfiguration` | Configuración de Recursos | `CONTEXT` · `RESOURCE` | `ResourcesId` | `ResourcesId` | `ResourceContent`, `Data` | `SIMPLE` | No | `PROJECT5X` |
| `SettingsByEN` | Configuraciones por EN | `MANUAL` | `ENId` | `SettingId` | `Value` | `SIMPLE` | No | `PROJECT5X` |
| `Template` | Plantillas | `MANUAL` | `TemplateId` | `TemplateId` | `Config` | `COMPOSITE_KEY` | `TemplateId` | `BOTH` |

---

## Detalle por tabla

### Nivel Customer

#### `Customers`
- **Key:** `Nit` (PK real, `BIGINT` sin IDENTITY).
- **Filtro:** el propio `Nit`.
- **Se compara:** `Name`, `Description`.

### Nivel Product

#### `Product`
- `ProductId` es IDENTITY y se preserva en PROD.
- **`insertColumns`:** `ProductId`, `CustomerNit`, `Name`, `Description`, `Type`.

#### `SubProduct`
- Filtra por `ProductId`; la key es `SubProductId` (IDENTITY preservado).

#### `SettingsByProduct`
- `SettingId` es único **por `ProductId`**, no global.
- No tiene IDENTITY: `SettingsByProductId` se autogenera en PROD y por eso no se compara.
- **`insertColumns`:** `ProductId`, `SettingId`, `Value`.

#### `Resources`
- IDENTITY en `ResourcesId`. Se compara `Space` y `Properties`.

#### `RulesByProduct`
- Se comparan `Data`, `DefaultValue` y `EquivalentValue`.

#### `FileSchemas`
- La key es `FileName` (texto), no un ID numérico.

#### `FilesByProduct`
- IDENTITY en `FilesByProductId`. Se comparan `Patron` y `Extension`.

#### `JsonDianEquivalences`
- Se comparan `ClientFieldName` y `ClientFieldPath`.

#### `JsonDianTemplates`
- `keyColumn` y `filterColumn` son ambos `ProductId` (un registro por producto).

#### `FieldByProduct`
- Se comparan `FieldName` y `FieldPath`.

### Nivel SubProduct

#### `SettingsBySubProduct`
- Equivalente a `SettingsByProduct`, pero con scope `SubProductId`.

### Nivel Resource

#### `ResourceConfiguration`
- Filtra y se identifica por `ResourcesId`. Se comparan `ResourceContent` y `Data`.

### Manuales

#### `SettingsByEN`
- Filtra por `ENId`, ingresado manualmente (placeholder `Ej: 1`).

#### `Template`
- Único caso con `COMPOSITE_KEY`: `['TemplateId', 'Name']`, porque un mismo `TemplateId` puede tener variantes por `Name`.
- IDENTITY en `TemplateId` y `targetInstance: 'BOTH'` (se genera script para PROJECT5X y CADCORE).
- Se busca por `TemplateId` o `Name` (placeholder `Ej: 10900`).
- **`insertColumns`** (en el orden del `CREATE TABLE`):
  `TemplateId`, `Name`, `Description`, `Config`, `Visibility`, `Type`, `CreateAt`, `UpdateAt`, `Format`, `Mjml`, `Thumbnail`, `FileSchema`, `TemplateStatus`, `SupplierCode`.

---

## Cómo agregar una tabla nueva

1. **Ubicarla en la jerarquía** y colocarla en el bloque correspondiente de `TABLE_DEFINITIONS` (Customer → Product → SubProduct → Resource → Manual).
2. **Definir la identidad del registro:** `keyColumn` (única dentro del scope) y `filterColumn`.
3. **Elegir `valueColumns`:** solo las columnas que deben determinar `DIFERENTE`. Excluir IDs autoincrementales.
4. **Elegir el selector:**
   - `CONTEXT` → indicar `contextLevel`.
   - `MANUAL` → indicar `manualPlaceholder`.
5. **Elegir `updateStrategy`:** `SIMPLE`, o `COMPOSITE_KEY` con `compositeKeys`.
6. **Si hay IDENTITY:** `hasIdentity: true` + `identityColumn`.
7. **Definir `insertColumns`** si la tabla tiene columnas obligatorias adicionales a `[filterColumn, keyColumn, ...valueColumns]`, respetando el orden del `CREATE TABLE`.
8. **Definir `targetInstance`** (`PROJECT5X` por defecto; `CADCORE` o `BOTH` si aplica).
9. Verificar que los nombres coincidan exactamente con SQL Server.

Plantilla mínima:

```ts
MiTabla: {
  tableName: 'MiTabla',
  displayName: 'Mi Tabla',
  keyColumn: 'MiTablaId',
  valueColumns: ['Value'],
  filterColumn: 'ProductId',
  updateStrategy: 'SIMPLE',
  selectorType: 'CONTEXT',
  contextLevel: 'PRODUCT',
  hasIdentity: false,
  targetInstance: 'PROJECT5X',
},
```

---

## Ejemplos de SQL generado

**UPDATE simple** (`SettingsByProduct`):

```sql
UPDATE SettingsByProduct
SET Value = '...'
WHERE ProductId = 1925 AND SettingId = 9;
```

**UPDATE con llave compuesta** (`Template`):

```sql
UPDATE D
SET D.Config = O.Config
FROM Template D
INNER JOIN DEV_ADMINCOM.ADMINCOM.dbo.Template O
  ON D.TemplateId = O.TemplateId AND D.Name = O.Name
WHERE O.TemplateId = 10900 AND O.Name = '...';
```

**INSERT con IDENTITY** (`hasIdentity: true`):

```sql
SET IDENTITY_INSERT dbo.Template ON;
INSERT INTO dbo.Template (...) SELECT ... FROM ...
SET IDENTITY_INSERT dbo.Template OFF;
```

---

## Notas y puntos de atención

- Si `insertColumns` no se define, el INSERT usa `[filterColumn, keyColumn, ...valueColumns]`. En tablas con columnas `NOT NULL` adicionales esto fallaría; hoy solo `Product`, `SettingsByProduct` y `Template` las definen explícitamente.
- Cuando `filterColumn` y `keyColumn` coinciden (`Customers`, `Product`, `JsonDianTemplates`, `ResourceConfiguration`, `Template`), la lista por defecto repetiría la columna; conviene definir `insertColumns` explícitamente si se usan para INSERT.
- Las tablas con `hasIdentity: false` y key distinta de la PK real (p. ej. `SettingsByProduct`) dependen de que la llave lógica (`ProductId` + `SettingId`) sea única.
- `Template` es la única tabla con `targetInstance: 'BOTH'`; las demás se aplican solo en `PROJECT5X`.
