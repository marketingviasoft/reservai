ALTER TABLE `reservations` DROP FOREIGN KEY `reservations_clientId_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `reservations` DROP COLUMN `clientId`;--> statement-breakpoint
DROP TABLE `clients`;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `extension` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(128);
