import "dotenv/config";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";

type TableSpec = {
  name: string;
  jsonColumns?: string[];
  uniqueKey?: string; // for ON DUPLICATE KEY handling where needed
};

const TABLES: TableSpec[] = [
  { name: "users", jsonColumns: ["permissions"] },
  { name: "client_users" },
  { name: "invitations", jsonColumns: ["permissions"] },
  { name: "password_resets" },
  { name: "employees" },
  { name: "main_packages" },
  { name: "sub_packages", jsonColumns: ["deliverables", "platforms"] },
  { name: "clients", jsonColumns: ["sales_owners", "assigned_staff"] },
  { name: "leads", jsonColumns: ["preserved_client_data"] },
  { name: "client_services", jsonColumns: ["execution_employee_ids"] },
  { name: "service_deliverables" },
  { name: "service_reports" },
  { name: "invoices", jsonColumns: ["items"] },
  { name: "transactions" },
  { name: "client_payments" },
  { name: "goals" },
  { name: "calendar_events" },
  { name: "notifications" },
  { name: "work_sessions", jsonColumns: ["segments"] },
  { name: "payroll_payments" },
  { name: "employee_salaries" },
  { name: "system_settings", jsonColumns: ["settings"], uniqueKey: "id" },
  { name: "exchange_rates" },
];

function asJson(val: any) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  try { return JSON.stringify(val); } catch { return null; }
}

async function run() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  if (!sourceUrl) {
    console.log("⚠️  SOURCE_DATABASE_URL (or DATABASE_URL) غير مضبوط. لن يتم تنفيذ الترحيل.");
    process.exit(0);
  }

  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    console.error("❌ يجب ضبط MYSQL_HOST و MYSQL_USER و MYSQL_DATABASE في البيئة الهدف.");
    process.exit(1);
  }

  const pg = new PgClient({ connectionString: sourceUrl });
  await pg.connect();

  const mysqlPool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log("🔄 بدء ترحيل البيانات من Postgres إلى MySQL...");

  for (const spec of TABLES) {
    const table = spec.name;
    console.log(`→ يرحّل الجدول: ${table}`);

    let rows: any[] = [];
    try {
      const res = await pg.query(`SELECT * FROM ${table}`);
      rows = res.rows || [];
    } catch (e: any) {
      console.log(`⚠️ تخطّي ${table} (غير موجود أو لا يمكن قراءته): ${e?.message || e}`);
      continue;
    }

    if (!rows.length) {
      console.log(`   لا توجد صفوف في ${table}`);
      continue;
    }

    // prepare columns
    const columns = Object.keys(rows[0]);
    const placeholders = `(${columns.map(() => "?").join(", ")})`;
    const insertSqlBase = `INSERT INTO ${table} (${columns.map(c => `\`${c}\``).join(", ")}) VALUES `;
    const onDup = spec.uniqueKey
      ? ` ON DUPLICATE KEY UPDATE ${columns.filter(c => c !== spec.uniqueKey).map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(", ")}`
      : ` ON DUPLICATE KEY UPDATE ${columns.filter(c => c !== "id").map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(", ")}`;

    // Insert in chunks to avoid oversized packets
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values: any[] = [];

      for (const r of chunk) {
        for (const col of columns) {
          let v = r[col];
          if (spec.jsonColumns?.includes(col)) {
            v = asJson(v);
          }
          values.push(v);
        }
      }

      const sql = insertSqlBase + chunk.map(() => placeholders).join(", ") + onDup;
      try {
        await mysqlPool.query(sql, values);
      } catch (e: any) {
        console.error(`❌ فشل إدراج دفعة في ${table}: ${e?.message || e}`);
        throw e;
      }
    }

    console.log(`   تم ترحيل ${rows.length} صفوف من ${table}`);
  }

  await pg.end();
  await mysqlPool.end();
  console.log("✅ اكتمل الترحيل بنجاح.");
}

run().catch((e) => {
  console.error("❌ خطأ أثناء الترحيل:", e);
  process.exit(1);
});
