import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const money = (name: string) => numeric(name, { precision: 15, scale: 2 });
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const roleEnum = pgEnum("role", [
  "owner", "admin", "dispatcher", "finance", "fleet", "driver",
]);
export const serviceTypeEnum = pgEnum("service_type", ["FTL", "LTL", "MULTIDROP"]);
export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT", "CONFIRMED", "SCHEDULED", "IN_PROGRESS", "DELIVERED", "INVOICED", "PAID", "CANCELLED",
]);
export const tripStatusEnum = pgEnum("trip_status", [
  "ASSIGNED", "EN_ROUTE_PICKUP", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DROP", "DELIVERED", "SETTLED", "CANCELLED",
]);
export const fulfillmentEnum = pgEnum("fulfillment", ["OWN", "VENDOR"]);
export const stopTypeEnum = pgEnum("stop_type", ["PICKUP", "DROP"]);
export const rateBasisEnum = pgEnum("rate_basis", [
  "PER_TRIP", "PER_KG", "PER_CBM", "PER_PALLET", "PER_DROP",
]);
export const expenseModeEnum = pgEnum("expense_mode", ["FLAT", "REIMBURSE", "HYBRID"]);
export const approvalEnum = pgEnum("approval_status", ["PENDING", "APPROVED", "REJECTED"]);

// ---------- Master ----------
export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("admin"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

export const accounts = pgTable("accounts", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  ...timestamps,
});

export const verifications = pgTable("verifications", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const customers = pgTable("customers", {
  id: id(),
  name: text("name").notNull(),
  npwp: text("npwp"),
  paymentTermDays: integer("payment_term_days").notNull().default(30),
  creditLimit: money("credit_limit"),
  ...timestamps,
});

export const locations = pgTable("locations", {
  id: id(),
  customerId: uuid("customer_id").references(() => customers.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  geofenceRadiusM: integer("geofence_radius_m").notNull().default(200),
  ...timestamps,
});

export const vehicles = pgTable("vehicles", {
  id: id(),
  plateNo: text("plate_no").notNull().unique(),
  type: text("type").notNull(),
  capacityKg: integer("capacity_kg"),
  capacityCbm: numeric("capacity_cbm", { precision: 8, scale: 2 }),
  status: text("status").notNull().default("AVAILABLE"),
  odometerKm: integer("odometer_km").notNull().default(0),
  gpsDeviceId: text("gps_device_id"),
  ...timestamps,
});

export const vehicleDocuments = pgTable("vehicle_documents", {
  id: id(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  type: text("type").notNull(), // STNK | KIR | PAJAK | ASURANSI
  number: text("number"),
  expiredAt: date("expired_at").notNull(),
  fileKey: text("file_key"),
});

export const drivers = pgTable("drivers", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone"),
  simType: text("sim_type"),
  simExpiredAt: date("sim_expired_at"),
  status: text("status").notNull().default("ACTIVE"),
  ...timestamps,
});

export const vendors = pgTable("vendors", {
  id: id(),
  name: text("name").notNull(),
  pic: text("pic"),
  phone: text("phone"),
  npwp: text("npwp"),
  bankAccount: text("bank_account"),
  paymentTermDays: integer("payment_term_days").notNull().default(14),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const customerRates = pgTable("customer_rates", {
  id: id(),
  customerId: uuid("customer_id").references(() => customers.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  vehicleType: text("vehicle_type"),
  basis: rateBasisEnum("basis").notNull().default("PER_TRIP"),
  price: money("price").notNull(),
  minCharge: money("min_charge"),
});

export const vendorRates = pgTable("vendor_rates", {
  id: id(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  vehicleType: text("vehicle_type"),
  basis: rateBasisEnum("basis").notNull().default("PER_TRIP"),
  price: money("price").notNull(),
});

export const expensePolicies = pgTable("expense_policies", {
  id: id(),
  name: text("name").notNull(),
  scopeType: text("scope_type").notNull().default("DEFAULT"), // DEFAULT | ROUTE | CUSTOMER | VEHICLE_TYPE
  scopeValue: text("scope_value"),
  advanceMode: expenseModeEnum("advance_mode").notNull().default("HYBRID"),
  advanceValue: money("advance_value"),
});

export const expensePolicyItems = pgTable("expense_policy_items", {
  id: id(),
  policyId: uuid("policy_id").notNull().references(() => expensePolicies.id),
  category: text("category").notNull(), // BBM | TOL | PARKIR | MAKAN | KULI | LAIN
  mode: expenseModeEnum("mode").notNull(),
  amount: money("amount"),
  limitAmount: money("limit_amount"),
  receiptRequired: boolean("receipt_required").notNull().default(true),
  approvalAbove: money("approval_above"),
});

// ---------- Transaksi ----------
export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNo: text("order_no").notNull().unique(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    serviceType: serviceTypeEnum("service_type").notNull().default("FTL"),
    status: orderStatusEnum("status").notNull().default("DRAFT"),
    requestedDate: date("requested_date"),
    priceTotal: money("price_total"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("orders_status_idx").on(t.status)],
);

export const orderStops = pgTable("order_stops", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  seq: integer("seq").notNull(),
  type: stopTypeEnum("type").notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  windowStart: timestamp("window_start", { withTimezone: true }),
  windowEnd: timestamp("window_end", { withTimezone: true }),
});

export const cargoItems = pgTable("cargo_items", {
  id: id(),
  orderStopId: uuid("order_stop_id").notNull().references(() => orderStops.id),
  description: text("description").notNull(),
  qty: integer("qty"),
  weightKg: numeric("weight_kg", { precision: 10, scale: 2 }),
  cbm: numeric("cbm", { precision: 8, scale: 2 }),
  pallets: integer("pallets"),
});

export const trips = pgTable(
  "trips",
  {
    id: id(),
    tripNo: text("trip_no").notNull().unique(),
    status: tripStatusEnum("status").notNull().default("ASSIGNED"),
    fulfillment: fulfillmentEnum("fulfillment").notNull().default("OWN"),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    vendorPlate: text("vendor_plate"),
    vendorDriverName: text("vendor_driver_name"),
    vendorDriverPhone: text("vendor_driver_phone"),
    vendorCost: money("vendor_cost"),
    trackingToken: text("tracking_token").unique(),
    expensePolicyId: uuid("expense_policy_id").references(() => expensePolicies.id),
    advanceAmount: money("advance_amount"),
    plannedStart: timestamp("planned_start", { withTimezone: true }),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("trips_status_idx").on(t.status)],
);

export const tripStops = pgTable("trip_stops", {
  id: id(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  seq: integer("seq").notNull(),
  orderStopId: uuid("order_stop_id").notNull().references(() => orderStops.id),
  eta: timestamp("eta", { withTimezone: true }),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  departedAt: timestamp("departed_at", { withTimezone: true }),
});

export const tripEvents = pgTable("trip_events", {
  id: id(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  status: tripStatusEnum("status").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id),
});

export const tripExpenses = pgTable("trip_expenses", {
  id: id(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  category: text("category").notNull(),
  amount: money("amount").notNull(),
  receiptKey: text("receipt_key"),
  status: approvalEnum("status").notNull().default("PENDING"),
  ...timestamps,
});

export const pods = pgTable("pods", {
  id: id(),
  tripStopId: uuid("trip_stop_id").notNull().references(() => tripStops.id),
  receiverName: text("receiver_name").notNull(),
  signatureKey: text("signature_key"),
  photoKeys: jsonb("photo_keys").$type<string[]>().notNull().default([]),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gpsPoints = pgTable(
  "gps_points",
  {
    id: id(),
    tripId: uuid("trip_id").references(() => trips.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    source: text("source").notNull().default("PHONE"), // PHONE | DEVICE
    lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
    lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
    speedKmh: numeric("speed_kmh", { precision: 6, scale: 2 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("gps_trip_time_idx").on(t.tripId, t.recordedAt)],
);

export const invoices = pgTable("invoices", {
  id: id(),
  invoiceNo: text("invoice_no").notNull().unique(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  issuedAt: date("issued_at").notNull(),
  dueAt: date("due_at").notNull(),
  subtotal: money("subtotal").notNull(),
  ppn: money("ppn").notNull().default("0"),
  pph23: money("pph23").notNull().default("0"),
  total: money("total").notNull(),
  status: text("status").notNull().default("ISSUED"), // ISSUED | PAID | VOID
  paidAt: date("paid_at"),
  ...timestamps,
});

export const invoiceLines = pgTable("invoice_lines", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  orderId: uuid("order_id").references(() => orders.id),
  description: text("description").notNull(),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: money("unit_price").notNull(),
  amount: money("amount").notNull(),
});

export const vendorBills = pgTable("vendor_bills", {
  id: id(),
  billNo: text("bill_no").notNull().unique(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  tripId: uuid("trip_id").references(() => trips.id),
  amount: money("amount").notNull(),
  dueAt: date("due_at").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | APPROVED | PAID
  paidAt: date("paid_at"),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  diff: jsonb("diff"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const docCounters = pgTable("doc_counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});
