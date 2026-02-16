
import "dotenv/config";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

async function reset() {
  console.log("⚠️  Dropping all tables in MariaDB/MySQL...");

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
  });

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  interface TableNameRow extends RowDataPacket { TABLE_NAME: string }
  const [rows] = await connection.query<TableNameRow[]>(
    "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()"
  );
  for (const row of rows as TableNameRow[]) {
    const tableName = (row as any).TABLE_NAME;
    if (!tableName) continue;
    console.log(`Dropping table ${tableName}...`);
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  await connection.end();

  console.log("✅ All tables dropped.");
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
