import sql from 'mssql';

export type ConnectionEnv = 'MDEPYD' | 'PROJECT5X' | 'CADCORE';

const pools = new Map<ConnectionEnv, sql.ConnectionPool>();

const ENV_PREFIXES: Record<ConnectionEnv, string> = {
  MDEPYD: 'DB_MDEPYD',
  PROJECT5X: 'DB_PROJECT5X',
  CADCORE: 'DB_CADCORE',
};

/**
 * Lee una variable del .env.
 * En Astro/Vite, las variables privadas se acceden vía import.meta.env.
 */
function readEnv(key: string): string | undefined {
  // 1. Intentar con import.meta.env (Astro/Vite)
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[key];
  if (fromImportMeta) return fromImportMeta;

  // 2. Fallback a process.env (útil en tests o scripts Node)
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;

  return undefined;
}

function getConfig(env: ConnectionEnv): sql.config {
  const prefix = ENV_PREFIXES[env];

  if (!prefix) {
    throw new Error(
      `ConnectionEnv inválido: "${env}". Válidos: ${Object.keys(ENV_PREFIXES).join(', ')}`
    );
  }

  const server = readEnv(`${prefix}_SERVER`);
  const database = readEnv(`${prefix}_DATABASE`);
  const user = readEnv(`${prefix}_USER`);
  const password = readEnv(`${prefix}_PASSWORD`);

  // 🔍 Diagnóstico (útil en dev, quitar en prod si molesta)
  console.log(`🔍 getConfig(${env}):`, {
    prefix,
    server: server ?? '(undefined)',
    database: database ?? '(undefined)',
    user: user ?? '(undefined)',
    password: password ? '***' : '(undefined)',
  });

  if (!server || !database || !user || !password) {
    const missing: string[] = [];
    if (!server) missing.push(`${prefix}_SERVER`);
    if (!database) missing.push(`${prefix}_DATABASE`);
    if (!user) missing.push(`${prefix}_USER`);
    if (!password) missing.push(`${prefix}_PASSWORD`);

    throw new Error(
      `Faltan variables de entorno para "${env}": ${missing.join(', ')}. ` +
      `Revisa el .env en la raíz del proyecto.`
    );
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };
}

export const getConnectionPool = async (env: ConnectionEnv): Promise<sql.ConnectionPool> => {
  if (pools.has(env)) {
    const existing = pools.get(env)!;
    if (existing.connected) return existing;
  }

  const config = getConfig(env);

  try {
    const pool = new sql.ConnectionPool(config);
    const poolConnect = pool.connect();
    pools.set(env, pool);
    await poolConnect;
    console.log(`✅ Conectado a ${env} (${config.server})`);
    return pool;
  } catch (error: any) {
    console.error(`❌ Error conectando a ${env}:`, error.message);
    throw new Error(`No se pudo conectar a ${env}: ${error.message}`);
  }
};