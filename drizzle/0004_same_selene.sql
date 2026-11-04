CREATE TABLE "fuel_event_reviews" (
	"event_key" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fuel_event_reviews" ADD CONSTRAINT "fuel_event_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;