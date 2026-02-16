import mysql from "mysql2/promise";
import { drizzle as drizzleMySQL } from "drizzle-orm/mysql2";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/neon-serverless";
import ws from "ws";

const DIALECT = (process.env.DB_DIALECT || process.env.SESSION_STORE || "postgres").toLowerCase();

let pool: any;
let db: any;

if (DIALECT === "mysql") {
  if (!process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
    console.error("MYSQL_DATABASE or MYSQL_USER missing in environment");
  }
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
  });
  db = drizzleMySQL(pool);
} else {
  neonConfig.webSocketConstructor = ws;
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in environment variables!");
  }
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool);
}

export { pool, db };
