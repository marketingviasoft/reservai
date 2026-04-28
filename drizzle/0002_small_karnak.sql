CREATE TYPE "public"."reservation_event_type" AS ENUM('reservation_created', 'reservation_updated', 'reservation_cancelled', 'reservation_checked_out', 'reservation_checked_in');--> statement-breakpoint
CREATE TABLE "reservation_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservationId" integer NOT NULL,
	"eventType" "reservation_event_type" NOT NULL,
	"actorUserId" integer,
	"fromStatus" "reservation_status",
	"toStatus" "reservation_status",
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservationId_reservations_id_fk" FOREIGN KEY ("reservationId") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;