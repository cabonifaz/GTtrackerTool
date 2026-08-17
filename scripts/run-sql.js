// Ejecuta los scripts de database/schema y database/procedures contra el
// servidor MySQL indicado en .env.
// Uso: node scripts/run-sql.js [nombreBaseDatos]
// Si se omite nombreBaseDatos, usa DB_NAME del .env.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const SOURCE_DB_NAME = "trackerTime";

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function forTargetDb(raw, targetDbName) {
  if (targetDbName === SOURCE_DB_NAME) return raw;
  return raw.split(SOURCE_DB_NAME).join(targetDbName);
}

// Codigos de error de MySQL que significan "el objeto ya existe" y por lo
// tanto son seguros de ignorar al re-ejecutar un script (CREATE INDEX no
// soporta IF NOT EXISTS en MySQL).
const ER_DUP_KEYNAME = 1061;
const ER_DUP_FIELDNAME = 1060;
const ER_FK_DUP_NAME = 1826;
// "no existe" al re-ejecutar un DROP COLUMN / DROP FOREIGN KEY -- tambien
// seguro de ignorar (el objetivo del DROP ya esta cumplido).
const ER_CANT_DROP_FIELD_OR_KEY = 1091;

async function runPlainFile(connection, filePath, targetDbName) {
  const raw = forTargetDb(fs.readFileSync(filePath, "utf8"), targetDbName);
  // Quita las lineas de comentario completas antes de partir por ';', ya que
  // el texto en espanol puede incluir puntuacion con ';' dentro de un comentario.
  const withoutComments = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (err) {
      if (
        err.errno === ER_DUP_KEYNAME ||
        err.errno === ER_DUP_FIELDNAME ||
        err.errno === ER_FK_DUP_NAME ||
        err.errno === ER_CANT_DROP_FIELD_OR_KEY
      ) {
        console.log(`  (objeto ya existe, se omite: ${err.message})`);
        continue;
      }
      throw err;
    }
  }
}

async function runProcedureFile(connection, filePath, targetDbName) {
  const raw = forTargetDb(fs.readFileSync(filePath, "utf8"), targetDbName);
  const withoutDelimiter = raw
    .split("\n")
    .filter((line) => !line.trim().toUpperCase().startsWith("DELIMITER"))
    .join("\n");

  const statements = withoutDelimiter
    .split("$$")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const env = loadEnv();
  const targetDbName = process.argv[2] || env.DB_NAME;

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  console.log(`Conectado a ${env.DB_HOST}:${env.DB_PORT} como ${env.DB_USER}. Base destino: ${targetDbName}`);

  const schemaDir = path.join(__dirname, "..", "database", "schema");
  const proceduresDir = path.join(__dirname, "..", "database", "procedures");

  const schemaFiles = fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of schemaFiles) {
    console.log(`Ejecutando schema/${file} ...`);
    await runPlainFile(connection, path.join(schemaDir, file), targetDbName);
  }

  const procedureFiles = fs.readdirSync(proceduresDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of procedureFiles) {
    console.log(`Ejecutando procedures/${file} ...`);
    await runProcedureFile(connection, path.join(proceduresDir, file), targetDbName);
  }

  console.log("Listo. Verificando objetos creados...");
  const [tables] = await connection.query(`SHOW TABLES FROM \`${targetDbName}\``);
  console.log(
    "Tablas:",
    tables.map((t) => Object.values(t)[0])
  );

  const [procs] = await connection.query(
    `SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME`,
    [targetDbName]
  );
  console.log(
    "Procedimientos:",
    procs.map((p) => p.ROUTINE_NAME)
  );

  await connection.end();
}

main().catch((err) => {
  console.error("Error ejecutando scripts SQL:", err.message);
  process.exit(1);
});
