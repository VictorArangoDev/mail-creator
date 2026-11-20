/**
 * Catálogo de entornos disponibles para DB Promote.
 *
 * Cada entorno define:
 *   - id: identificador interno (usado en stores y URLs)
 *   - label: nombre amigable para la UI
 *   - server: hostname / IP del servidor
 *   - database: base de datos por defecto
 *   - description: texto de ayuda
 *   - role: 'TEST' | 'PROD' — para clasificar en la UI
 */

export type EnvironmentRole = 'TEST' | 'PROD';

export interface EnvironmentDefinition {
  id: string;
  label: string;
  server: string;
  ip?:string;
  database: string;
  description: string;
  role: EnvironmentRole;
  connectionEnv: 'MDEPYD' | 'PROJECT5X' | 'CADCORE';
}

export const AVAILABLE_ENVIRONMENTS: EnvironmentDefinition[] = [
  {
    id: 'MDEPYD01NEW',
    label: 'MDEPYD01NEW',
    server: 'MDEPYD01NEW',
    ip: '10.1.0.86',  
    database: 'ADMINCOM',
    description: 'Instancia de pruebas principal',
    role: 'TEST',
    connectionEnv: 'MDEPYD',
  },
  {
    id: 'PROJECT5X',
    label: 'project5x (AWS RDS)',
    server: 'project5x.csyqcr2ispve.us-east-1.rds.amazonaws.com',
    ip: '10.74.2.216',
    database: 'ADMINCOM',
    description: 'Producción en AWS (10.74.2.216)',
    role: 'PROD',
    connectionEnv: 'PROJECT5X',
  },
  {
    id: 'CADCORE',
    label: 'CadCoreSqlPDN (5XV1)',
    server: '10.74.30.102',
    ip: '10.74.30.102',
    database: 'ADMINCOM',
    description: 'Producción on-premise "5XV1"',
    role: 'PROD',
    connectionEnv: 'CADCORE',
  },
];

/**
 * Mapeo destino → alias del linked server que apunta al origen (MDEPYD01NEW).
 *
 * - Si el script se aplica en PROJECT5X → usar DEV_ADMINCOM
 * - Si el script se aplica en CADCORE   → usar LS_ADMINCOM_PYD
 */
export const LINKED_SERVER_BY_TARGET: Record<string, string> = {
  PROJECT5X: 'DEV_ADMINCOM',
  CADCORE: 'LS_ADMINCOM_PYD',
};

/**
 * Obtiene el alias del linked server para un destino dado.
 * Si el destino no tiene alias configurado, devuelve undefined.
 */
export function getLinkedServerAlias(targetId: string): string | undefined {
  return LINKED_SERVER_BY_TARGET[targetId];
}

/**
 * Obtiene un entorno por id.
 */
export function getEnvironment(id: string): EnvironmentDefinition | undefined {
  return AVAILABLE_ENVIRONMENTS.find(e => e.id === id);
}

/**
 * Dado un sourceId/targetId, devuelve el connectionEnv.
 * Si el id no existe, retorna 'MDEPYD' como fallback seguro.
 */
export function resolveConnectionEnv(envId: string): 'MDEPYD' | 'PROJECT5X' | 'CADCORE' {
  const env = AVAILABLE_ENVIRONMENTS.find(e => e.id === envId);
  return env?.connectionEnv ?? 'MDEPYD';
}