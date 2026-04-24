ALTER TABLE `items` ADD `code` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_code_unique` UNIQUE(`code`);