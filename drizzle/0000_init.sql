CREATE TYPE "public"."bouquet_status" AS ENUM('DRAFT', 'CONFIRMED', 'SOLD', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."catalog_item_kind" AS ENUM('FLOWER', 'GREENERY', 'MATERIAL', 'PACKAGING');--> statement-breakpoint
CREATE TYPE "public"."expense_kind" AS ENUM('PACKAGING', 'DELIVERY', 'LABOR', 'RENT', 'UTILITIES', 'MARKETING', 'TAX', 'OVERHEAD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_scope" AS ENUM('BOUQUET', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."unit_of_measure" AS ENUM('STEM', 'BUNCH', 'PIECE', 'GRAM', 'METER');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'STAFF');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'OWNER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "catalog_item_kind" NOT NULL,
	"category" text,
	"unit" "unit_of_measure" NOT NULL,
	"purchase_price_kopiyky" bigint NOT NULL,
	"sale_price_kopiyky" bigint NOT NULL,
	"supplier_name" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_prices_nonneg" CHECK ("catalog_items"."purchase_price_kopiyky" >= 0 AND "catalog_items"."sale_price_kopiyky" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bouquets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"status" "bouquet_status" DEFAULT 'DRAFT' NOT NULL,
	"sale_price_kopiyky" bigint,
	"discount_kopiyky" bigint DEFAULT 0 NOT NULL,
	"amount_received_kopiyky" bigint DEFAULT 0 NOT NULL,
	"sold_on" date,
	"confirmed_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bouquet_sold_has_date" CHECK (("bouquets"."status" = 'SOLD') = ("bouquets"."sold_on" IS NOT NULL)),
	CONSTRAINT "bouquet_amounts_nonneg" CHECK ("bouquets"."discount_kopiyky" >= 0 AND "bouquets"."amount_received_kopiyky" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bouquet_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bouquet_id" uuid NOT NULL,
	"catalog_item_id" uuid,
	"item_name_snapshot" text NOT NULL,
	"unit_snapshot" "unit_of_measure" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_purchase_price_kopiyky" bigint NOT NULL,
	"unit_sale_price_kopiyky" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_quantity_positive" CHECK ("bouquet_lines"."quantity" > 0),
	CONSTRAINT "line_prices_nonneg" CHECK ("bouquet_lines"."unit_purchase_price_kopiyky" >= 0 AND "bouquet_lines"."unit_sale_price_kopiyky" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "expense_scope" NOT NULL,
	"bouquet_id" uuid,
	"kind" "expense_kind" NOT NULL,
	"description" text,
	"amount_kopiyky" bigint NOT NULL,
	"incurred_on" date NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_scope_consistency" CHECK (("expenses"."scope" = 'BOUQUET' AND "expenses"."bouquet_id" IS NOT NULL) OR ("expenses"."scope" = 'GENERAL' AND "expenses"."bouquet_id" IS NULL)),
	CONSTRAINT "expense_amount_nonneg" CHECK ("expenses"."amount_kopiyky" >= 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouquets" ADD CONSTRAINT "bouquets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouquet_lines" ADD CONSTRAINT "bouquet_lines_bouquet_id_bouquets_id_fk" FOREIGN KEY ("bouquet_id") REFERENCES "public"."bouquets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouquet_lines" ADD CONSTRAINT "bouquet_lines_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bouquet_id_bouquets_id_fk" FOREIGN KEY ("bouquet_id") REFERENCES "public"."bouquets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_items_active_idx" ON "catalog_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bouquets_status_idx" ON "bouquets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bouquets_sold_on_idx" ON "bouquets" USING btree ("sold_on");--> statement-breakpoint
CREATE INDEX "bouquet_lines_bouquet_idx" ON "bouquet_lines" USING btree ("bouquet_id");--> statement-breakpoint
CREATE INDEX "bouquet_lines_catalog_idx" ON "bouquet_lines" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "expenses_bouquet_idx" ON "expenses" USING btree ("bouquet_id");--> statement-breakpoint
CREATE INDEX "expenses_incurred_on_idx" ON "expenses" USING btree ("incurred_on");