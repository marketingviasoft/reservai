CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`company` varchar(256),
	`document` varchar(32),
	`address` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`categoryId` int,
	`serialNumber` varchar(128),
	`photoUrl` text,
	`photoKey` varchar(512),
	`status` enum('disponivel','emprestado','manutencao','extraviado') NOT NULL DEFAULT 'disponivel',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `serial_number_idx` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `kit_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kitId` int NOT NULL,
	`itemId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kit_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`status` enum('completo','incompleto') NOT NULL DEFAULT 'completo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`itemId` int,
	`kitId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int,
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`status` enum('pendente','ativa','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`checkoutAt` bigint,
	`checkoutByUserId` int,
	`checkinAt` bigint,
	`checkinByUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_kitId_kits_id_fk` FOREIGN KEY (`kitId`) REFERENCES `kits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_items` ADD CONSTRAINT `kit_items_itemId_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_items` ADD CONSTRAINT `reservation_items_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_items` ADD CONSTRAINT `reservation_items_itemId_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_items` ADD CONSTRAINT `reservation_items_kitId_kits_id_fk` FOREIGN KEY (`kitId`) REFERENCES `kits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_checkoutByUserId_users_id_fk` FOREIGN KEY (`checkoutByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_checkinByUserId_users_id_fk` FOREIGN KEY (`checkinByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;