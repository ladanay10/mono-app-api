-- Collapse unit_of_measure to a single value: PIECE (шт).
-- Every existing row is mapped to PIECE (the app now has one unit only).
-- ALTER COLUMN ... TYPE is DDL: it does NOT fire the bouquet_lines row-level
-- immutability trigger, so historical (CONFIRMED/SOLD) snapshots convert safely.
-- Prices/quantities are untouched — only the unit label folds to «шт».
ALTER TABLE "catalog_items" ALTER COLUMN "unit" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "bouquet_lines" ALTER COLUMN "unit_snapshot" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unit_of_measure";--> statement-breakpoint
CREATE TYPE "public"."unit_of_measure" AS ENUM('PIECE');--> statement-breakpoint
ALTER TABLE "catalog_items" ALTER COLUMN "unit" SET DATA TYPE "public"."unit_of_measure" USING 'PIECE'::"public"."unit_of_measure";--> statement-breakpoint
ALTER TABLE "bouquet_lines" ALTER COLUMN "unit_snapshot" SET DATA TYPE "public"."unit_of_measure" USING 'PIECE'::"public"."unit_of_measure";
