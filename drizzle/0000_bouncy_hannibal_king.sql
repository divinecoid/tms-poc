CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."expense_mode" AS ENUM('FLAT', 'REIMBURSE', 'HYBRID');--> statement-breakpoint
CREATE TYPE "public"."fulfillment" AS ENUM('OWN', 'VENDOR');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'DELIVERED', 'INVOICED', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rate_basis" AS ENUM('PER_TRIP', 'PER_KG', 'PER_CBM', 'PER_PALLET', 'PER_DROP');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'dispatcher', 'finance', 'fleet', 'driver');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('FTL', 'LTL', 'MULTIDROP');--> statement-breakpoint
CREATE TYPE "public"."stop_type" AS ENUM('PICKUP', 'DROP');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('ASSIGNED', 'EN_ROUTE_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DROP', 'DELIVERED', 'SETTLED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"diff" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_stop_id" uuid NOT NULL,
	"description" text NOT NULL,
	"qty" integer,
	"weight_kg" numeric(10, 2),
	"cbm" numeric(8, 2),
	"pallets" integer
);
--> statement-breakpoint
CREATE TABLE "customer_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"vehicle_type" text,
	"basis" "rate_basis" DEFAULT 'PER_TRIP' NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"min_charge" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"npwp" text,
	"payment_term_days" integer DEFAULT 30 NOT NULL,
	"credit_limit" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"phone" text,
	"sim_type" text,
	"sim_expired_at" date,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope_type" text DEFAULT 'DEFAULT' NOT NULL,
	"scope_value" text,
	"advance_mode" "expense_mode" DEFAULT 'HYBRID' NOT NULL,
	"advance_value" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "expense_policy_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"category" text NOT NULL,
	"mode" "expense_mode" NOT NULL,
	"amount" numeric(15, 2),
	"limit_amount" numeric(15, 2),
	"receipt_required" boolean DEFAULT true NOT NULL,
	"approval_above" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "gps_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid,
	"vehicle_id" uuid,
	"source" text DEFAULT 'PHONE' NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"speed_kmh" numeric(6, 2),
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"order_id" uuid,
	"description" text NOT NULL,
	"qty" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_no" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"issued_at" date NOT NULL,
	"due_at" date NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"ppn" numeric(15, 2) DEFAULT '0' NOT NULL,
	"pph23" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"geofence_radius_m" integer DEFAULT 200 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" "stop_type" NOT NULL,
	"location_id" uuid NOT NULL,
	"window_start" timestamp with time zone,
	"window_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_type" "service_type" DEFAULT 'FTL' NOT NULL,
	"status" "order_status" DEFAULT 'DRAFT' NOT NULL,
	"requested_date" date,
	"price_total" numeric(15, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "pods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_stop_id" uuid NOT NULL,
	"receiver_name" text NOT NULL,
	"signature_key" text,
	"photo_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"status" "trip_status" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"note" text,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "trip_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"receipt_key" text,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"order_stop_id" uuid NOT NULL,
	"eta" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"departed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_no" text NOT NULL,
	"status" "trip_status" DEFAULT 'ASSIGNED' NOT NULL,
	"fulfillment" "fulfillment" DEFAULT 'OWN' NOT NULL,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"vendor_id" uuid,
	"vendor_plate" text,
	"vendor_driver_name" text,
	"vendor_driver_phone" text,
	"vendor_cost" numeric(15, 2),
	"tracking_token" text,
	"expense_policy_id" uuid,
	"advance_amount" numeric(15, 2),
	"planned_start" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_trip_no_unique" UNIQUE("trip_no"),
	CONSTRAINT "trips_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "role" DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" text NOT NULL,
	"number" text,
	"expired_at" date NOT NULL,
	"file_key" text
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_no" text NOT NULL,
	"type" text NOT NULL,
	"capacity_kg" integer,
	"capacity_cbm" numeric(8, 2),
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"odometer_km" integer DEFAULT 0 NOT NULL,
	"gps_device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_no_unique" UNIQUE("plate_no")
);
--> statement-breakpoint
CREATE TABLE "vendor_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_no" text NOT NULL,
	"vendor_id" uuid NOT NULL,
	"trip_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"due_at" date NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_bills_bill_no_unique" UNIQUE("bill_no")
);
--> statement-breakpoint
CREATE TABLE "vendor_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"vehicle_type" text,
	"basis" "rate_basis" DEFAULT 'PER_TRIP' NOT NULL,
	"price" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pic" text,
	"phone" text,
	"npwp" text,
	"bank_account" text,
	"payment_term_days" integer DEFAULT 14 NOT NULL,
	"rating" numeric(3, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_order_stop_id_order_stops_id_fk" FOREIGN KEY ("order_stop_id") REFERENCES "public"."order_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_rates" ADD CONSTRAINT "customer_rates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_policy_items" ADD CONSTRAINT "expense_policy_items_policy_id_expense_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."expense_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stops" ADD CONSTRAINT "order_stops_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stops" ADD CONSTRAINT "order_stops_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pods" ADD CONSTRAINT "pods_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_order_stop_id_order_stops_id_fk" FOREIGN KEY ("order_stop_id") REFERENCES "public"."order_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_expense_policy_id_expense_policies_id_fk" FOREIGN KEY ("expense_policy_id") REFERENCES "public"."expense_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_rates" ADD CONSTRAINT "vendor_rates_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gps_trip_time_idx" ON "gps_points" USING btree ("trip_id","recorded_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" USING btree ("status");