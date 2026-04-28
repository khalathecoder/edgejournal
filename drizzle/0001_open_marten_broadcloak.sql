CREATE TABLE `propFirmAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`firmName` varchar(255) NOT NULL,
	`accountNumber` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propFirmAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propFirmPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`firmName` varchar(255) NOT NULL,
	`purchaseDate` timestamp NOT NULL,
	`accountCount` int NOT NULL,
	`costPerAccount` decimal(10,2),
	`totalCost` decimal(10,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propFirmPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradeJournalEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradeJournalEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tradeScreenshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeId` int NOT NULL,
	`userId` int NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`caption` varchar(255),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradeScreenshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propFirmAccountId` int NOT NULL,
	`instrument` varchar(50) NOT NULL,
	`direction` enum('LONG','SHORT') NOT NULL,
	`entryPrice` decimal(12,4) NOT NULL,
	`exitPrice` decimal(12,4) NOT NULL,
	`quantity` int NOT NULL,
	`entryTime` timestamp NOT NULL,
	`exitTime` timestamp NOT NULL,
	`grossPnL` decimal(12,2) NOT NULL,
	`commission` decimal(10,2) DEFAULT '0',
	`netPnL` decimal(12,2) NOT NULL,
	`strategy` varchar(255),
	`importedFrom` varchar(50) NOT NULL DEFAULT 'MANUAL',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
