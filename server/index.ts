import fs from "fs";
import path from "path";

function fileLog(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  const logs = [
    path.join(process.cwd(), "startup_debug.txt"),
  ];
  
  for (const logPath of logs) {
    try {
      fs.appendFileSync(logPath, logMessage);
    } catch (e) { /* ignore */ }
  }
  console.log(message);
}

fileLog("--- SERVER STARTUP SEQUENCE START ---");

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { registerAuthRoutes, seedAdminUser } from "./auth";
import { registerWorkTrackingRoutes } from "./workTracking";
import { registerClientPortalRoutes } from "./clientPortal";
import { initializeEmailTransporter } from "./email";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

fileLog("Express and HTTP server initialized");

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || String(8 * 60 * 60 * 1000));
const isProduction = process.env.NODE_ENV === "production";

fileLog(`Environment: ${isProduction ? "production" : "development"}`);

const USE_MYSQL_SESSION = (process.env.SESSION_STORE || process.env.DB_DIALECT || "").toLowerCase() === "mysql";
const DB_DIALECT = (process.env.DB_DIALECT || process.env.SESSION_STORE || "postgres").toLowerCase();

async function configureSession() {
  if (USE_MYSQL_SESSION) {
    try {
      const dynamicImport = new Function('m', 'return import(m)');
      const mysqlSession = (await (dynamicImport as any)("express-mysql-session")).default as any;
      const MySQLStore = mysqlSession(session);
      const mysqlStore = new MySQLStore({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        createDatabaseTable: true,
        schema: {
          tableName: process.env.MYSQL_SESSION_TABLE || "sessions",
        },
      });
      app.use(
        session({
          store: mysqlStore,
          secret: process.env.SESSION_SECRET || "vevoline-dashboard-secret-key",
          resave: false,
          saveUninitialized: false,
          rolling: true,
          cookie: {
            secure: "auto",
            httpOnly: true,
            maxAge: SESSION_MAX_AGE,
            sameSite: "lax",
          },
        })
      );
      fileLog("Session store configured: MySQL");
      return;
    } catch (e: any) {
      fileLog(`Failed to configure MySQL session store, falling back to Postgres: ${e?.message || e}`);
    }
  }
  const sessionStore = new PgSession({
    pool: pool as any,
    tableName: "session",
    createTableIfMissing: true,
  });
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "vevoline-dashboard-secret-key",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: "auto",
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        sameSite: "lax",
      },
    })
  );
  fileLog("Session store configured: Postgres");
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toISOString();
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    fileLog("Starting initialization sequence...");
    
    try {
      fileLog("Testing database connection...");
      if (DB_DIALECT === "mysql") {
        const conn = await (pool as any).getConnection();
        fileLog("MySQL connection successful");
        conn.release();
      } else {
        const client = await (pool as any).connect();
        fileLog("Postgres connection successful");
        client.release();
      }
    } catch (dbErr: any) {
      fileLog(`DATABASE CONNECTION FAILED: ${dbErr?.message || dbErr}`);
    }

    await configureSession();
    
    if (DB_DIALECT === "mysql") {
      try {
        const conn = await (pool as any).getConnection();
        await conn.query(`
          CREATE TABLE IF NOT EXISTS users (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            email text NOT NULL UNIQUE,
            password text NOT NULL,
            name text NOT NULL,
            role text NOT NULL DEFAULT 'employee',
            permissions json NULL,
            avatar text NULL,
            is_active boolean NOT NULL DEFAULT TRUE,
            name_en text NULL,
            department text NULL,
            employee_id text NULL,
            last_login datetime NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS client_users (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            email text NOT NULL UNIQUE,
            password text NOT NULL,
            client_id text NOT NULL,
            client_name text NOT NULL,
            client_name_en text NULL,
            is_active boolean NOT NULL DEFAULT TRUE,
            last_login datetime NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS invitations (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            email text NOT NULL,
            role text NOT NULL DEFAULT 'employee',
            permissions json NULL,
            token text NOT NULL UNIQUE,
            expires_at datetime NOT NULL,
            status text NOT NULL DEFAULT 'pending',
            name text NULL,
            name_en text NULL,
            department text NULL,
            employee_id text NULL,
            used_at datetime NULL,
            invited_by text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS password_resets (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            email text NOT NULL,
            token text NOT NULL UNIQUE,
            expires_at datetime NOT NULL,
            used_at datetime NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS clients (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            name text NOT NULL,
            email text NULL,
            phone text NULL,
            company text NULL,
            country text NULL,
            source text NULL,
            status text NOT NULL DEFAULT 'active',
            sales_owner_id text NULL,
            assigned_manager_id text NULL,
            converted_from_lead_id text NULL,
            lead_created_at datetime NULL,
            sales_owners json NULL,
            assigned_staff json NULL,
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS client_services (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            client_id text NOT NULL,
            main_package_id text NOT NULL,
            sub_package_id text NULL,
            service_name text NOT NULL,
            service_name_en text NULL,
            start_date text NOT NULL,
            end_date text NULL,
            status text NOT NULL DEFAULT 'not_started',
            price int NULL,
            currency text NULL,
            sales_employee_id text NULL,
            execution_employee_ids json NULL,
            notes text NULL,
            completed_at datetime NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS service_deliverables (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            service_id text NOT NULL,
            \`key\` text NOT NULL,
            label_ar text NOT NULL,
            label_en text NOT NULL,
            target int NOT NULL,
            completed int NOT NULL DEFAULT 0,
            icon text NULL,
            is_boolean boolean NULL DEFAULT FALSE,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS invoices (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            invoice_number text NOT NULL,
            client_id text NOT NULL,
            client_name text NOT NULL,
            amount int NOT NULL,
            currency text NOT NULL,
            status text NOT NULL DEFAULT 'draft',
            issue_date text NOT NULL,
            due_date text NOT NULL,
            paid_date text NULL,
            items json NULL,
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS employees (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            name text NOT NULL,
            name_en text NULL,
            email text NOT NULL,
            phone text NULL,
            role text NOT NULL,
            role_ar text NULL,
            department text NULL,
            job_title text NULL,
            profile_image text NULL,
            salary_type text NOT NULL DEFAULT 'monthly',
            salary_amount int NULL,
            rate int NULL,
            rate_type text NULL,
            salary_currency text NOT NULL DEFAULT 'USD',
            salary_notes text NULL,
            start_date text NOT NULL,
            is_active boolean NOT NULL DEFAULT TRUE,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_employees_email (email)
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS work_activity_logs (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            service_id text NOT NULL,
            deliverable_id text NULL,
            employee_id text NULL,
            action text NOT NULL,
            previous_value text NULL,
            new_value text NULL,
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS leads (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            name text NOT NULL,
            email text NULL,
            phone text NULL,
            company text NULL,
            country text NULL,
            source text NULL,
            stage text NOT NULL DEFAULT 'new',
            deal_value int NULL,
            deal_currency text NULL,
            notes text NULL,
            negotiator_id text NULL,
            was_confirmed_client boolean NULL DEFAULT FALSE,
            converted_from_client_id text NULL,
            preserved_client_data json NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS main_packages (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            name text NOT NULL,
            name_en text NOT NULL,
            icon text NULL,
            description text NULL,
            description_en text NULL,
            \`order\` int NOT NULL DEFAULT 0,
            is_active boolean NOT NULL DEFAULT TRUE,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS sub_packages (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            main_package_id text NOT NULL,
            name text NOT NULL,
            name_en text NOT NULL,
            price int NOT NULL,
            currency text NOT NULL,
            billing_type text NOT NULL,
            description text NULL,
            description_en text NULL,
            duration text NULL,
            duration_en text NULL,
            deliverables json NULL,
            platforms json NULL,
            features text NULL,
            features_en text NULL,
            is_active boolean NOT NULL DEFAULT TRUE,
            \`order\` int NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS service_reports (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            service_id text NOT NULL,
            title text NOT NULL,
            content text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS transactions (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            description text NOT NULL,
            amount int NOT NULL,
            currency text NOT NULL,
            type text NOT NULL,
            category text NOT NULL,
            date text NOT NULL,
            related_id text NULL,
            related_type text NULL,
            status text NOT NULL DEFAULT 'completed',
            notes text NULL,
            client_id text NULL,
            service_id text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS client_payments (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            client_id text NOT NULL,
            service_id text NULL,
            amount int NOT NULL,
            currency text NOT NULL,
            payment_date text NOT NULL,
            month int NOT NULL,
            year int NOT NULL,
            payment_method text NULL,
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS goals (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            name text NOT NULL,
            type text NOT NULL,
            month int NOT NULL,
            year int NOT NULL,
            target int NOT NULL,
            current int NULL,
            currency text NULL,
            icon text NULL,
            notes text NULL,
            status text NOT NULL DEFAULT 'not_started',
            responsible_person text NULL,
            country text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS calendar_events (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            source text NOT NULL DEFAULT 'manual',
            event_type text NOT NULL DEFAULT 'manual',
            title_ar text NOT NULL,
            title_en text NULL,
            date text NOT NULL,
            time text NULL,
            status text NOT NULL DEFAULT 'upcoming',
            priority text NOT NULL DEFAULT 'medium',
            client_id text NULL,
            service_id text NULL,
            employee_id text NULL,
            sales_id text NULL,
            notes text NULL,
            reminder_days text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            user_id text NOT NULL,
            type text NOT NULL,
            title_ar text NOT NULL,
            title_en text NULL,
            message_ar text NOT NULL,
            message_en text NULL,
            \`read\` boolean NOT NULL DEFAULT FALSE,
            related_id text NULL,
            related_type text NULL,
            snoozed_until datetime NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS work_sessions (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            employee_id text NOT NULL,
            date text NOT NULL,
            start_time datetime NULL,
            end_time datetime NULL,
            status text NOT NULL DEFAULT 'not_started',
            segments json NULL,
            total_duration int NOT NULL DEFAULT 0,
            break_duration int NOT NULL DEFAULT 0,
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS payroll_payments (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            employee_id text NOT NULL,
            amount int NOT NULL,
            currency text NOT NULL,
            payment_date text NOT NULL,
            period text NOT NULL,
            status text NOT NULL DEFAULT 'paid',
            notes text NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS employee_salaries (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            employee_id text NOT NULL,
            amount int NOT NULL,
            currency text NOT NULL,
            effective_date text NOT NULL,
            type text NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS system_settings (
            id varchar(255) PRIMARY KEY DEFAULT 'current',
            settings json NULL,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS exchange_rates (
            id varchar(255) PRIMARY KEY DEFAULT (uuid()),
            base text NOT NULL DEFAULT 'USD',
            date text NOT NULL,
            rates text NOT NULL,
            fetched_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        conn.release();
        fileLog("Ensured MySQL tables exist");
      } catch (e: any) {
        fileLog(`Failed ensuring MySQL tables: ${e?.message || e}`);
      }
    }
    
    await initializeEmailTransporter();
    
    registerAuthRoutes(app);
    registerWorkTrackingRoutes(app);
    registerClientPortalRoutes(app);
    
    fileLog("Seeding admin user...");
    try {
      await seedAdminUser();
      fileLog("Admin user seeding checked");
    } catch (seedErr: any) {
      fileLog(`Seeding admin user failed: ${seedErr?.message || seedErr}`);
    }
    
    fileLog("Registering routes...");
    try {
      await registerRoutes(httpServer, app);
      fileLog("Routes registered");
    } catch (routeErr: any) {
      fileLog(`CRITICAL: Failed to register routes: ${routeErr?.message || routeErr}`);
    }

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    if (isProduction) {
      fileLog("Setting up static file serving (Production Mode)");
      try {
        serveStatic(app);
        fileLog("Static files setup complete");
      } catch (staticErr: any) {
        fileLog(`Failed to setup static serving: ${staticErr?.message || staticErr}`);
      }
    } else {
      fileLog("Setting up Vite development server (Development Mode)");
      try {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
        fileLog("Vite setup complete");
      } catch (viteErr: any) {
        fileLog(`Failed to setup Vite: ${viteErr?.message || viteErr}`);
      }
    }

    const basePort = Number(process.env.PORT) || 5000;
    let currentPort = basePort;
    const tryListen = () => {
      httpServer.once("error", (err: any) => {
        if (err && err.code === "EADDRINUSE") {
          currentPort += 1;
          tryListen();
        } else {
          fileLog(`Server listen error: ${err?.message || err}`);
          process.exit(1);
        }
      });
      httpServer.listen(currentPort, "0.0.0.0", () => {
        fileLog(`serving on port ${currentPort}`);
      });
    };
    tryListen();
  } catch (err: any) {
    fileLog(`CRITICAL ERROR DURING STARTUP: ${err?.message || err}`);
    process.exit(1);
  }
})();

export default app;
// Compatibility export for various environments (Passenger, etc.)
// Safe check to avoid ESM/CJS hybrid warnings during bundling
// if (typeof module !== "undefined" && "exports" in module) {
//   (module as any).exports = app;
// }
