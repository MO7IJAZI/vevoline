
import { pgTable, text, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { mysqlTable as myTable, text as myText, int as myInt, boolean as myBool, varchar as myVarchar, json as myJson, datetime as myDatetime } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const session = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

const IS_MYSQL = (process.env.DB_DIALECT || process.env.SESSION_STORE || "").toLowerCase() === "mysql";

export const users = IS_MYSQL
  ? myTable("users", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      email: myText("email").notNull().unique(),
      password: myText("password").notNull(),
      name: myText("name").notNull(),
      role: myText("role").notNull().default("employee"),
      permissions: myJson("permissions"),
      avatar: myText("avatar"),
      isActive: myBool("is_active").notNull().default(true),
      nameEn: myText("name_en"),
      department: myText("department"),
      employeeId: myText("employee_id"),
      lastLogin: myDatetime("last_login"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("users", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      name: text("name").notNull(),
      role: text("role").notNull().default("employee"),
      permissions: jsonb("permissions").default(sql`'[]'::jsonb`),
      avatar: text("avatar"),
      isActive: boolean("is_active").notNull().default(true),
      nameEn: text("name_en"),
      department: text("department"),
      employeeId: text("employee_id"),
      lastLogin: timestamp("last_login"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InferSelectModel<typeof users>;

export const clientUsers = IS_MYSQL
  ? myTable("client_users", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      email: myText("email").notNull().unique(),
      password: myText("password").notNull(),
      clientId: myText("client_id").notNull(),
      clientName: myText("client_name").notNull(),
      clientNameEn: myText("client_name_en"),
      isActive: myBool("is_active").notNull().default(true),
      lastLogin: myDatetime("last_login"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("client_users", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      clientId: text("client_id").notNull(),
      clientName: text("client_name").notNull(),
      clientNameEn: text("client_name_en"),
      isActive: boolean("is_active").notNull().default(true),
      lastLogin: timestamp("last_login"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertClientUserSchema = createInsertSchema(clientUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export type InsertClientUser = z.infer<typeof insertClientUserSchema>;
export type ClientUser = InferSelectModel<typeof clientUsers>;

export const invitations = IS_MYSQL
  ? myTable("invitations", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      email: myText("email").notNull(),
      role: myText("role").notNull().default("employee"),
      permissions: myJson("permissions"),
      token: myText("token").notNull().unique(),
      expiresAt: myDatetime("expires_at").notNull(),
      status: myText("status").notNull().default("pending"),
      name: myText("name"),
      nameEn: myText("name_en"),
      department: myText("department"),
      employeeId: myText("employee_id"),
      usedAt: myDatetime("used_at"),
      invitedBy: myText("invited_by"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("invitations", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull(),
      role: text("role").notNull().default("employee"),
      permissions: jsonb("permissions").default(sql`'[]'::jsonb`),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      status: text("status").notNull().default("pending"),
      name: text("name"),
      nameEn: text("name_en"),
      department: text("department"),
      employeeId: text("employee_id"),
      usedAt: timestamp("used_at"),
      invitedBy: text("invited_by"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = InferSelectModel<typeof invitations>;

export const PermissionEnum = z.enum([
  "view_clients", "edit_clients", "archive_clients",
  "view_leads", "edit_leads",
  "create_packages", "edit_packages",
  "view_invoices", "create_invoices", "edit_invoices",
  "view_goals", "edit_goals",
  "view_finance", "edit_finance",
  "view_employees", "edit_employees",
  "assign_employees", "edit_work_tracking"
]);

export type Permission = z.infer<typeof PermissionEnum>;

export const passwordResets = IS_MYSQL
  ? myTable("password_resets", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      email: myText("email").notNull(),
      token: myText("token").notNull().unique(),
      expiresAt: myDatetime("expires_at").notNull(),
      usedAt: myDatetime("used_at"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("password_resets", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull(),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      usedAt: timestamp("used_at"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = InferSelectModel<typeof passwordResets>;

export const goalTypeConfigs: Record<GoalType, { labelAr: string; labelEn: string; isPercentage: boolean; hasCurrency: boolean; hasCountry: boolean; defaultIcon: string }> = {
  financial: { labelAr: "مالي", labelEn: "Financial", isPercentage: false, hasCurrency: true, hasCountry: true, defaultIcon: "DollarSign" },
  clients: { labelAr: "عملاء", labelEn: "Clients", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Users" },
  leads: { labelAr: "عملاء محتملون", labelEn: "Leads", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Target" },
  projects: { labelAr: "مشاريع", labelEn: "Projects", isPercentage: false, hasCurrency: false, hasCountry: true, defaultIcon: "Folder" },
  performance: { labelAr: "أداء", labelEn: "Performance", isPercentage: true, hasCurrency: false, hasCountry: false, defaultIcon: "TrendingUp" },
  custom: { labelAr: "مخصص", labelEn: "Custom", isPercentage: false, hasCurrency: false, hasCountry: false, defaultIcon: "Star" },
};

export const GoalTypeEnum = z.enum([
  "financial",
  "clients",
  "leads",
  "projects",
  "performance",
  "custom"
]);

export type GoalType = z.infer<typeof GoalTypeEnum>;

export const CurrencyEnum = z.enum(["TRY", "USD", "EUR", "SAR", "EGP", "AED"]);
export type Currency = z.infer<typeof CurrencyEnum>;

export const TransactionTypeEnum = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const ExpenseCategoryEnum = z.enum([
  "salaries",
  "ads",
  "tools",
  "subscriptions",
  "refunds",
  "rent",
  "utilities",
  "office_supplies",
  "maintenance",
  "legal",
  "taxes",
  "other"
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;

export const leads = IS_MYSQL
  ? myTable("leads", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      name: myText("name").notNull(),
      email: myText("email"),
      phone: myText("phone"),
      company: myText("company"),
      country: myText("country"),
      source: myText("source"),
      stage: myText("stage").notNull().default("new"),
      dealValue: myInt("deal_value"),
      dealCurrency: myText("deal_currency"),
      notes: myText("notes"),
      negotiatorId: myText("negotiator_id"),
      wasConfirmedClient: myBool("was_confirmed_client").default(false),
      convertedFromClientId: myText("converted_from_client_id"),
      preservedClientData: myJson("preserved_client_data"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("leads", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email"),
      phone: text("phone"),
      company: text("company"),
      country: text("country"),
      source: text("source"),
      stage: text("stage").notNull().default("new"),
      dealValue: integer("deal_value"),
      dealCurrency: text("deal_currency"),
      notes: text("notes"),
      negotiatorId: text("negotiator_id"),
      wasConfirmedClient: boolean("was_confirmed_client").default(false),
      convertedFromClientId: text("converted_from_client_id"),
      preservedClientData: jsonb("preserved_client_data"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = InferSelectModel<typeof leads>;

export const clients = IS_MYSQL
  ? myTable("clients", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      name: myText("name").notNull(),
      email: myText("email"),
      phone: myText("phone"),
      company: myText("company"),
      country: myText("country"),
      source: myText("source"),
      status: myText("status").notNull().default("active"),
      salesOwnerId: myText("sales_owner_id"),
      assignedManagerId: myText("assigned_manager_id"),
      convertedFromLeadId: myText("converted_from_lead_id"),
      leadCreatedAt: myDatetime("lead_created_at"),
      salesOwners: myJson("sales_owners"),
      assignedStaff: myJson("assigned_staff"),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("clients", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email"),
      phone: text("phone"),
      company: text("company"),
      country: text("country"),
      source: text("source"),
      status: text("status").notNull().default("active"),
      salesOwnerId: text("sales_owner_id"),
      assignedManagerId: text("assigned_manager_id"),
      convertedFromLeadId: text("converted_from_lead_id"),
      leadCreatedAt: timestamp("lead_created_at"),
      salesOwners: jsonb("sales_owners").default(sql`'[]'::jsonb`),
      assignedStaff: jsonb("assigned_staff").default(sql`'[]'::jsonb`),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = InferSelectModel<typeof clients>;

export const clientServices = IS_MYSQL
  ? myTable("client_services", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      clientId: myText("client_id").notNull(),
      mainPackageId: myText("main_package_id").notNull(),
      subPackageId: myText("sub_package_id"),
      serviceName: myText("service_name").notNull(),
      serviceNameEn: myText("service_name_en"),
      startDate: myText("start_date").notNull(),
      endDate: myText("end_date"),
      status: myText("status").notNull().default("not_started"),
      price: myInt("price"),
      currency: myText("currency"),
      salesEmployeeId: myText("sales_employee_id"),
      executionEmployeeIds: myJson("execution_employee_ids"),
      notes: myText("notes"),
      completedAt: myDatetime("completed_at"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("client_services", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      clientId: text("client_id").notNull(),
      mainPackageId: text("main_package_id").notNull(),
      subPackageId: text("sub_package_id"),
      serviceName: text("service_name").notNull(),
      serviceNameEn: text("service_name_en"),
      startDate: text("start_date").notNull(),
      endDate: text("end_date"),
      status: text("status").notNull().default("not_started"),
      price: integer("price"),
      currency: text("currency"),
      salesEmployeeId: text("sales_employee_id"),
      executionEmployeeIds: jsonb("execution_employee_ids").default(sql`'[]'::jsonb`),
      notes: text("notes"),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertClientServiceSchema = createInsertSchema(clientServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertClientService = z.infer<typeof insertClientServiceSchema>;
export type ClientService = InferSelectModel<typeof clientServices>;

export const mainPackages = IS_MYSQL
  ? myTable("main_packages", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      name: myText("name").notNull(),
      nameEn: myText("name_en").notNull(),
      icon: myText("icon"),
      description: myText("description"),
      descriptionEn: myText("description_en"),
      order: myInt("order").notNull().default(0),
      isActive: myBool("is_active").notNull().default(true),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("main_packages", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      nameEn: text("name_en").notNull(),
      icon: text("icon"),
      description: text("description"),
      descriptionEn: text("description_en"),
      order: integer("order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertMainPackageSchema = createInsertSchema(mainPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMainPackage = z.infer<typeof insertMainPackageSchema>;
export type MainPackage = InferSelectModel<typeof mainPackages>;

export const subPackages = IS_MYSQL
  ? myTable("sub_packages", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      mainPackageId: myText("main_package_id").notNull(),
      name: myText("name").notNull(),
      nameEn: myText("name_en").notNull(),
      price: myInt("price").notNull(),
      currency: myText("currency").notNull(),
      billingType: myText("billing_type").notNull(),
      description: myText("description"),
      descriptionEn: myText("description_en"),
      duration: myText("duration"),
      durationEn: myText("duration_en"),
      deliverables: myJson("deliverables"),
      platforms: myJson("platforms"),
      features: myText("features"),
      featuresEn: myText("features_en"),
      isActive: myBool("is_active").notNull().default(true),
      order: myInt("order").notNull().default(0),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("sub_packages", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      mainPackageId: text("main_package_id").notNull(),
      name: text("name").notNull(),
      nameEn: text("name_en").notNull(),
      price: integer("price").notNull(),
      currency: text("currency").notNull(),
      billingType: text("billing_type").notNull(),
      description: text("description"),
      descriptionEn: text("description_en"),
      duration: text("duration"),
      durationEn: text("duration_en"),
      deliverables: jsonb("deliverables").default(sql`'[]'::jsonb`),
      platforms: jsonb("platforms").default(sql`'[]'::jsonb`),
      features: text("features"),
      featuresEn: text("features_en"),
      isActive: boolean("is_active").notNull().default(true),
      order: integer("order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertSubPackageSchema = createInsertSchema(subPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubPackage = z.infer<typeof insertSubPackageSchema>;
export type SubPackage = InferSelectModel<typeof subPackages>;

export const invoices = IS_MYSQL
  ? myTable("invoices", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      invoiceNumber: myText("invoice_number").notNull(),
      clientId: myText("client_id").notNull(),
      clientName: myText("client_name").notNull(),
      amount: myInt("amount").notNull(),
      currency: myText("currency").notNull(),
      status: myText("status").notNull().default("draft"),
      issueDate: myText("issue_date").notNull(),
      dueDate: myText("due_date").notNull(),
      paidDate: myText("paid_date"),
      items: myJson("items"),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("invoices", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      invoiceNumber: text("invoice_number").notNull(),
      clientId: text("client_id").notNull(),
      clientName: text("client_name").notNull(),
      amount: integer("amount").notNull(),
      currency: text("currency").notNull(),
      status: text("status").notNull().default("draft"),
      issueDate: text("issue_date").notNull(),
      dueDate: text("due_date").notNull(),
      paidDate: text("paid_date"),
      items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = InferSelectModel<typeof invoices>;

export const employees = IS_MYSQL
  ? myTable("employees", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      name: myText("name").notNull(),
      nameEn: myText("name_en"),
      email: myText("email").notNull(),
      phone: myText("phone"),
      role: myText("role").notNull(),
      roleAr: myText("role_ar"),
      department: myText("department"),
      jobTitle: myText("job_title"),
      profileImage: myText("profile_image"),
      salaryType: myText("salary_type").notNull().default("monthly"),
      salaryAmount: myInt("salary_amount"),
      rate: myInt("rate"),
      rateType: myText("rate_type"),
      salaryCurrency: myText("salary_currency").notNull().default("USD"),
      salaryNotes: myText("salary_notes"),
      startDate: myText("start_date").notNull(),
      isActive: myBool("is_active").notNull().default(true),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("employees", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      nameEn: text("name_en"),
      email: text("email").notNull().unique(),
      phone: text("phone"),
      role: text("role").notNull(),
      roleAr: text("role_ar"),
      department: text("department"),
      jobTitle: text("job_title"),
      profileImage: text("profile_image"),
      salaryType: text("salary_type").notNull().default("monthly"),
      salaryAmount: integer("salary_amount"),
      rate: integer("rate"),
      rateType: text("rate_type"),
      salaryCurrency: text("salary_currency").notNull().default("USD"),
      salaryNotes: text("salary_notes"),
      startDate: text("start_date").notNull(),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = InferSelectModel<typeof employees>;

export const serviceDeliverables = IS_MYSQL
  ? myTable("service_deliverables", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      serviceId: myText("service_id").notNull(),
      key: myText("key").notNull(),
      labelAr: myText("label_ar").notNull(),
      labelEn: myText("label_en").notNull(),
      target: myInt("target").notNull(),
      completed: myInt("completed").notNull().default(0),
      icon: myText("icon"),
      isBoolean: myBool("is_boolean").default(false),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("service_deliverables", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      serviceId: text("service_id").notNull(),
      key: text("key").notNull(),
      labelAr: text("label_ar").notNull(),
      labelEn: text("label_en").notNull(),
      target: integer("target").notNull(),
      completed: integer("completed").notNull().default(0),
      icon: text("icon"),
      isBoolean: boolean("is_boolean").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertServiceDeliverableSchema = createInsertSchema(serviceDeliverables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceDeliverable = z.infer<typeof insertServiceDeliverableSchema>;
export type ServiceDeliverable = InferSelectModel<typeof serviceDeliverables>;

export const workActivityLogs = IS_MYSQL
  ? myTable("work_activity_logs", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      serviceId: myText("service_id").notNull(),
      deliverableId: myText("deliverable_id"),
      employeeId: myText("employee_id"),
      action: myText("action").notNull(),
      previousValue: myText("previous_value"),
      newValue: myText("new_value"),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("work_activity_logs", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      serviceId: text("service_id").notNull(),
      deliverableId: text("deliverable_id"),
      employeeId: text("employee_id"),
      action: text("action").notNull(),
      previousValue: text("previous_value"),
      newValue: text("new_value"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertWorkActivityLogSchema = createInsertSchema(workActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkActivityLog = z.infer<typeof insertWorkActivityLogSchema>;
export type WorkActivityLog = InferSelectModel<typeof workActivityLogs>;

export const serviceReports = IS_MYSQL
  ? myTable("service_reports", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      serviceId: myText("service_id").notNull(),
      title: myText("title").notNull(),
      content: myText("content"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("service_reports", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      serviceId: text("service_id").notNull(),
      title: text("title").notNull(),
      content: text("content"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertServiceReportSchema = createInsertSchema(serviceReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceReport = z.infer<typeof insertServiceReportSchema>;
export type ServiceReport = InferSelectModel<typeof serviceReports>;

export const transactions = IS_MYSQL
  ? myTable("transactions", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      description: myText("description").notNull(),
      amount: myInt("amount").notNull(),
      currency: myText("currency").notNull(),
      type: myText("type").notNull(),
      category: myText("category").notNull(),
      date: myText("date").notNull(),
      relatedId: myText("related_id"),
      relatedType: myText("related_type"),
      status: myText("status").notNull().default("completed"),
      notes: myText("notes"),
      clientId: myText("client_id"),
      serviceId: myText("service_id"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("transactions", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      description: text("description").notNull(),
      amount: integer("amount").notNull(),
      currency: text("currency").notNull(),
      type: text("type").notNull(),
      category: text("category").notNull(),
      date: text("date").notNull(),
      relatedId: text("related_id"),
      relatedType: text("related_type"),
      status: text("status").notNull().default("completed"),
      notes: text("notes"),
      clientId: text("client_id"),
      serviceId: text("service_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = InferSelectModel<typeof transactions>;

export const clientPayments = IS_MYSQL
  ? myTable("client_payments", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      clientId: myText("client_id").notNull(),
      serviceId: myText("service_id"),
      amount: myInt("amount").notNull(),
      currency: myText("currency").notNull(),
      paymentDate: myText("payment_date").notNull(),
      month: myInt("month").notNull(),
      year: myInt("year").notNull(),
      paymentMethod: myText("payment_method"),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("client_payments", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      clientId: text("client_id").notNull(),
      serviceId: text("service_id"),
      amount: integer("amount").notNull(),
      currency: text("currency").notNull(),
      paymentDate: text("payment_date").notNull(),
      month: integer("month").notNull(),
      year: integer("year").notNull(),
      paymentMethod: text("payment_method"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertClientPaymentSchema = createInsertSchema(clientPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertClientPayment = z.infer<typeof insertClientPaymentSchema>;
export type ClientPayment = InferSelectModel<typeof clientPayments>;

export const goals = IS_MYSQL
  ? myTable("goals", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      name: myText("name").notNull(),
      type: myText("type").notNull(),
      month: myInt("month").notNull(),
      year: myInt("year").notNull(),
      target: myInt("target").notNull(),
      current: myInt("current"),
      currency: myText("currency"),
      icon: myText("icon"),
      notes: myText("notes"),
      status: myText("status").notNull().default("not_started"),
      responsiblePerson: myText("responsible_person"),
      country: myText("country"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("goals", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      type: text("type").notNull(),
      month: integer("month").notNull(),
      year: integer("year").notNull(),
      target: integer("target").notNull(),
      current: integer("current").default(0),
      currency: text("currency"),
      icon: text("icon"),
      notes: text("notes"),
      status: text("status").notNull().default("not_started"),
      responsiblePerson: text("responsible_person"),
      country: text("country"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = InferSelectModel<typeof goals>;

export const GoalStatusEnum = z.enum(["not_started", "in_progress", "achieved", "failed"]);
export type GoalStatus = z.infer<typeof GoalStatusEnum>;

export const goalFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: GoalTypeEnum,
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  target: z.number().min(0),
  current: z.number().min(0).optional(),
  currency: CurrencyEnum.optional().nullable(),
  icon: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: GoalStatusEnum.optional(),
  responsiblePerson: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

export const EventTypeEnum = z.enum([
  "manual",
  "package_end",
  "delivery_due",
  "payroll",
  "client_payment",
  "task"
]);
export type EventType = z.infer<typeof EventTypeEnum>;

export const EventStatusEnum = z.enum(["upcoming", "today", "overdue", "done"]);
export type EventStatus = z.infer<typeof EventStatusEnum>;

export const EventPriorityEnum = z.enum(["low", "medium", "high"]);
export type EventPriority = z.infer<typeof EventPriorityEnum>;

export const eventTypeConfigs = {
  manual: { color: "#3b82f6", labelAr: "يدوي", labelEn: "Manual" },
  package_end: { color: "#ef4444", labelAr: "نهاية باقة", labelEn: "Package End" },
  delivery_due: { color: "#f59e0b", labelAr: "تسليم عمل", labelEn: "Delivery Due" },
  payroll: { color: "#10b981", labelAr: "راتب", labelEn: "Payroll" },
  client_payment: { color: "#8b5cf6", labelAr: "دفعة عميل", labelEn: "Client Payment" },
  task: { color: "#f97316", labelAr: "مهمة", labelEn: "Task" },
};

export const calendarEvents = IS_MYSQL
  ? myTable("calendar_events", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      source: myText("source").notNull().default("manual"),
      eventType: myText("event_type").notNull().default("manual"),
      titleAr: myText("title_ar").notNull(),
      titleEn: myText("title_en"),
      date: myText("date").notNull(),
      time: myText("time"),
      status: myText("status").notNull().default("upcoming"),
      priority: myText("priority").notNull().default("medium"),
      clientId: myText("client_id"),
      serviceId: myText("service_id"),
      employeeId: myText("employee_id"),
      salesId: myText("sales_id"),
      notes: myText("notes"),
      reminderDays: myText("reminder_days"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("calendar_events", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      source: text("source").notNull().default("manual"),
      eventType: text("event_type").notNull().default("manual"),
      titleAr: text("title_ar").notNull(),
      titleEn: text("title_en"),
      date: text("date").notNull(),
      time: text("time"),
      status: text("status").notNull().default("upcoming"),
      priority: text("priority").notNull().default("medium"),
      clientId: text("client_id"),
      serviceId: text("service_id"),
      employeeId: text("employee_id"),
      salesId: text("sales_id"),
      notes: text("notes"),
      reminderDays: text("reminder_days"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = InferSelectModel<typeof calendarEvents>;

export const notifications = IS_MYSQL
  ? myTable("notifications", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      userId: myText("user_id").notNull(),
      type: myText("type").notNull(),
      titleAr: myText("title_ar").notNull(),
      titleEn: myText("title_en"),
      messageAr: myText("message_ar").notNull(),
      messageEn: myText("message_en"),
      read: myBool("read").notNull().default(false),
      relatedId: myText("related_id"),
      relatedType: myText("related_type"),
      snoozedUntil: myDatetime("snoozed_until"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("notifications", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      userId: text("user_id").notNull(),
      type: text("type").notNull(),
      titleAr: text("title_ar").notNull(),
      titleEn: text("title_en"),
      messageAr: text("message_ar").notNull(),
      messageEn: text("message_en"),
      read: boolean("read").notNull().default(false),
      relatedId: text("related_id"),
      relatedType: text("related_type"),
      snoozedUntil: timestamp("snoozed_until"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = InferSelectModel<typeof notifications>;

export const BreakTypeEnum = z.enum(["short", "long", "lunch"]);
export type BreakType = z.infer<typeof BreakTypeEnum>;

export const WorkSegmentSchema = z.object({
  type: z.enum(["work", "break"]),
  startAt: z.string(),
  endAt: z.string().optional(),
  breakType: BreakTypeEnum.optional(),
  note: z.string().optional(),
});
export type WorkSegment = z.infer<typeof WorkSegmentSchema>;

export const workSessions = IS_MYSQL
  ? myTable("work_sessions", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      employeeId: myText("employee_id").notNull(),
      date: myText("date").notNull(),
      startTime: myDatetime("start_time"),
      endTime: myDatetime("end_time"),
      status: myText("status").notNull().default("not_started"),
      segments: myJson("segments"),
      totalDuration: myInt("total_duration").notNull().default(0),
      breakDuration: myInt("break_duration").notNull().default(0),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("work_sessions", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      employeeId: text("employee_id").notNull(),
      date: text("date").notNull(),
      startTime: timestamp("start_time"),
      endTime: timestamp("end_time"),
      status: text("status").notNull().default("not_started"),
      segments: jsonb("segments").notNull().default(sql`'[]'::jsonb`),
      totalDuration: integer("total_duration").notNull().default(0),
      breakDuration: integer("break_duration").notNull().default(0),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertWorkSessionSchema = createInsertSchema(workSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkSession = z.infer<typeof insertWorkSessionSchema>;
export type WorkSession = InferSelectModel<typeof workSessions>;

export const payrollPayments = IS_MYSQL
  ? myTable("payroll_payments", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      employeeId: myText("employee_id").notNull(),
      amount: myInt("amount").notNull(),
      currency: myText("currency").notNull(),
      paymentDate: myText("payment_date").notNull(),
      period: myText("period").notNull(),
      status: myText("status").notNull().default("paid"),
      notes: myText("notes"),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("payroll_payments", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      employeeId: text("employee_id").notNull(),
      amount: integer("amount").notNull(),
      currency: text("currency").notNull(),
      paymentDate: text("payment_date").notNull(),
      period: text("period").notNull(),
      status: text("status").notNull().default("paid"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertPayrollPaymentSchema = createInsertSchema(payrollPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollPayment = z.infer<typeof insertPayrollPaymentSchema>;
export type PayrollPayment = InferSelectModel<typeof payrollPayments>;

export const employeeSalaries = IS_MYSQL
  ? myTable("employee_salaries", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      employeeId: myText("employee_id").notNull(),
      amount: myInt("amount").notNull(),
      currency: myText("currency").notNull(),
      effectiveDate: myText("effective_date").notNull(),
      type: myText("type").notNull(),
      createdAt: myDatetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("employee_salaries", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      employeeId: text("employee_id").notNull(),
      amount: integer("amount").notNull(),
      currency: text("currency").notNull(),
      effectiveDate: text("effective_date").notNull(),
      type: text("type").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
    });

export const insertEmployeeSalarySchema = createInsertSchema(employeeSalaries).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeSalary = z.infer<typeof insertEmployeeSalarySchema>;
export type EmployeeSalary = InferSelectModel<typeof employeeSalaries>;

export const systemSettings = IS_MYSQL
  ? myTable("system_settings", {
      id: myVarchar("id", { length: 255 }).primaryKey().default("current"),
      settings: myJson("settings"),
      updatedAt: myDatetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("system_settings", {
      id: varchar("id", { length: 255 }).primaryKey().default("current"),
      settings: jsonb("settings").notNull(),
      updatedAt: timestamp("updated_at").defaultNow(),
    });

export const insertSystemSettingsSchema = createInsertSchema(systemSettings);

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = InferSelectModel<typeof systemSettings>;

export const exchangeRates = IS_MYSQL
  ? myTable("exchange_rates", {
      id: myVarchar("id", { length: 255 }).primaryKey().default(sql`(uuid())`),
      base: myText("base").notNull().default("USD"),
      date: myText("date").notNull(),
      rates: myText("rates").notNull(),
      fetchedAt: myDatetime("fetched_at").default(sql`CURRENT_TIMESTAMP`),
    })
  : pgTable("exchange_rates", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
      base: text("base").notNull().default("USD"),
      date: text("date").notNull(),
      rates: text("rates").notNull(),
      fetchedAt: timestamp("fetched_at").defaultNow(),
    });

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  fetchedAt: true,
});

export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = InferSelectModel<typeof exchangeRates>;
