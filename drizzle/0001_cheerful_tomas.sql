CREATE TYPE "public"."item_condition" AS ENUM('novo', 'bom', 'regular', 'danificado');--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "brand" varchar(128);--> statement-breakpoint
UPDATE "items" SET "brand" = 'Nao informado' WHERE "brand" IS NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "brand" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "model" varchar(128);--> statement-breakpoint
UPDATE "items" SET "model" = 'Nao informado' WHERE "model" IS NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "model" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "assetNumber" varchar(128);--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "condition" "item_condition" DEFAULT 'bom' NOT NULL;
