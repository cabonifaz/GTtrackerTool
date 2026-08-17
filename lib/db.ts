import mysql, { RowDataPacket, ResultSetHeader } from "mysql2/promise";

let pool: mysql.Pool | null = null;

let shutdownHandlersRegistradas = false;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30_000,
      dateStrings: true,
    });

    // En dev, Next.js recarga este modulo con cada cambio (HMR); sin esta
    // guarda global se acumularia un listener SIGINT/SIGTERM por recarga.
    if (!shutdownHandlersRegistradas) {
      shutdownHandlersRegistradas = true;
      const cerrarPool = async () => {
        await pool?.end().catch(() => {});
        process.exit(0);
      };
      process.on("SIGINT", cerrarPool);
      process.on("SIGTERM", cerrarPool);
    }
  }
  return pool;
}

export class BusinessError extends Error {}

function toBusinessError(err: unknown): unknown {
  if (
    err &&
    typeof err === "object" &&
    "sqlState" in err &&
    (err as { sqlState?: string }).sqlState === "45000"
  ) {
    return new BusinessError((err as { sqlMessage?: string }).sqlMessage ?? "Error de negocio");
  }
  return err;
}

/** Invoca un stored procedure. Toda la logica de negocio vive en el SP. */
export async function executeProcedure<T>(
  procedureName: string,
  params: unknown[] = []
): Promise<T[]> {
  const placeholders = params.map(() => "?").join(", ");
  try {
    const [rows] = await getPool().query<RowDataPacket[][]>(
      `CALL ${procedureName}(${placeholders})`,
      params
    );
    return Array.isArray(rows) ? (rows[0] as unknown as T[]) : [];
  } catch (err) {
    throw toBusinessError(err);
  }
}

/** Fallback de solo lectura para consultas que no ameritan un SP (ninguna regla de negocio). */
export async function executeQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export type { ResultSetHeader };
