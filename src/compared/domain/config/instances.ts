export interface InstanceConfig {
  id: 'PROJECT5X' | 'CADCORE';
  label: string;
  /** Nombre de la instancia destino (para el comentario del script) */
  targetName: string;
  /** Nombre de la instancia origen vinculada */
  sourceName: string;
  /** Prefijo para referencias cruzadas en queries (linked server) */
  sourcePrefix: string;
  /** Base de datos destino */
  targetDb: string;
}

export const INSTANCES: Record<string, InstanceConfig> = {
  PROJECT5X: {
    id: 'PROJECT5X',
    label: 'project5x (AWS RDS)',
    targetName: 'project5x.csyqcr2ispve.us-east-1.rds.amazonaws.com (10.74.2.216)',
    sourceName: 'DEV_ADMINCOM (10.1.0.86)',
    sourcePrefix: 'DEV_ADMINCOM.ADMINCOM.dbo',
    targetDb: 'ADMINCOM',
  },
  CADCORE: {
    id: 'CADCORE',
    label: 'CadCoreSqlPDN (On-Premise)',
    targetName: 'CadCoreSqlPDN (10.74.30.102)',
    sourceName: 'LS_ADMINCOM_PYD (10.1.0.86)',
    sourcePrefix: 'LS_ADMINCOM_PYD.ADMINCOM.dbo',
    targetDb: 'ADMINCOM',
  },
};