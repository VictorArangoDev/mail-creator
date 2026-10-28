import sql from "mssql";

const pools = new Map<string, sql.ConnectionPool>();

export const getConnectionPool = async (env: 'TEST' | 'PROD'): Promise<sql.ConnectionPool> => {
    const poolKey = env;

    if(pools.has(poolKey)){
        const existingPool = pools.get(poolKey)!;
    if (existingPool.connected) return existingPool;
    }


    const config: sql.config={
        server: env ==="TEST" ? import.meta.env.DB_TEST_SERVER! : import.meta.env.DB_PROD_SERVER!,
        database: env ==="TEST" ? import.meta.env.DB_TEST_DATABASE! : import.meta.env.DB_PROD_DATABASE!,
        user: env === "TEST" ?  import.meta.env.DB_TEST_USER! : import.meta.env.DB_PROD_USER!,
        password: env === "TEST" ? import.meta.env.DB_TEST_PASSWORD! : import.meta.env.DB_PROD_PASSWORD!,
        port: 1433,
        options:{
            encrypt: true,
            trustServerCertificate: true
        },
        pool:{
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    }


    try {
        const pool = new sql.ConnectionPool(config);
        const poolConnect = pool.connect();
        pools.set(poolKey, pool);
        await poolConnect;
        console.log(`Conectado exitosamente a ${env}`)
        return pool;
    } catch (error) {
        console.error(`Error intentando conectar a ${env} + ${error} `);
        throw new Error(`No se pudo conectar al entorno ${env} valida que las variables de entorno se encuente configuradas`)
    }

    
}