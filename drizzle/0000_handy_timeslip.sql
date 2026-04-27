CREATE TYPE "public"."item_status" AS ENUM('disponivel', 'emprestado', 'manutencao', 'extraviado');--> statement-breakpoint
CREATE TYPE "public"."kit_status" AS ENUM('completo', 'incompleto');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pendente', 'ativa', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#6366f1',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"categoryId" integer,
	"serialNumber" varchar(128),
	"photoUrl" text,
	"photoKey" varchar(512),
	"status" "item_status" DEFAULT 'disponivel' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "kit_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"kitId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"status" "kit_status" DEFAULT 'completo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservationId" integer NOT NULL,
	"itemId" integer,
	"kitId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"startDate" bigint NOT NULL,
	"endDate" bigint NOT NULL,
	"status" "reservation_status" DEFAULT 'pendente' NOT NULL,
	"checkoutAt" bigint,
	"checkoutByUserId" integer,
	"checkinAt" bigint,
	"checkinByUserId" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"phone" varchar(32),
	"extension" varchar(16),
	"department" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_kitId_kits_id_fk" FOREIGN KEY ("kitId") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_reservationId_reservations_id_fk" FOREIGN KEY ("reservationId") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_items" ADD CONSTRAINT "reservation_items_kitId_kits_id_fk" FOREIGN KEY ("kitId") REFERENCES "public"."kits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_checkoutByUserId_users_id_fk" FOREIGN KEY ("checkoutByUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_checkinByUserId_users_id_fk" FOREIGN KEY ("checkinByUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "serial_number_idx" ON "items" USING btree ("serialNumber");