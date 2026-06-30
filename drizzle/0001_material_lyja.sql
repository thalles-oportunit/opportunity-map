CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`eventType` enum('licitacao','dispensa','contrato','obra','convenio','inauguracao','plano','all') NOT NULL DEFAULT 'all',
	`category` varchar(128),
	`entity` varchar(255),
	`municipality` varchar(128),
	`minConfidenceScore` float NOT NULL DEFAULT 0.5,
	`minValueBrl` decimal(18,2),
	`active` boolean NOT NULL DEFAULT true,
	`triggeredCount` int NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128),
	`type` enum('licitacao','dispensa','contrato','obra','convenio','inauguracao','plano') NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`entity` varchar(255),
	`entityCnpj` varchar(18),
	`municipality` varchar(128),
	`state` varchar(2),
	`category` varchar(128),
	`valueBrl` decimal(18,2),
	`eventDate` date,
	`openDate` date,
	`closeDate` date,
	`status` enum('active','closed','cancelled','archived') NOT NULL DEFAULT 'active',
	`sourceId` int,
	`sourceUrl` text,
	`processNumber` varchar(128),
	`modalidade` varchar(128),
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` varchar(128) NOT NULL,
	`description` text,
	`rationale` text,
	`confidenceScore` float NOT NULL DEFAULT 0,
	`predictedOpenDate` date NOT NULL,
	`predictedValueBrl` decimal(18,2),
	`entity` varchar(255),
	`municipality` varchar(128),
	`state` varchar(2),
	`status` enum('predicted','confirmed','cancelled','expired') NOT NULL DEFAULT 'predicted',
	`triggerCount` int NOT NULL DEFAULT 0,
	`recurrencePattern` varchar(128),
	`generatedByLlm` boolean NOT NULL DEFAULT false,
	`llmModel` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int NOT NULL,
	`eventId` int NOT NULL,
	`relationType` enum('trigger','historical','related') NOT NULL DEFAULT 'trigger',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `opportunity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`type` enum('pncp','compras_gov','tribunal','diario_oficial','portal_transparencia','outro') NOT NULL DEFAULT 'outro',
	`active` boolean NOT NULL DEFAULT true,
	`lastSync` timestamp,
	`syncCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_active` ON `alerts` (`active`);--> statement-breakpoint
CREATE INDEX `idx_alerts_eventType` ON `alerts` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_events_type` ON `events` (`type`);--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_events_municipality` ON `events` (`municipality`);--> statement-breakpoint
CREATE INDEX `idx_events_entity` ON `events` (`entity`);--> statement-breakpoint
CREATE INDEX `idx_events_eventDate` ON `events` (`eventDate`);--> statement-breakpoint
CREATE INDEX `idx_opp_status` ON `opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `idx_opp_category` ON `opportunities` (`category`);--> statement-breakpoint
CREATE INDEX `idx_opp_predictedOpenDate` ON `opportunities` (`predictedOpenDate`);--> statement-breakpoint
CREATE INDEX `idx_opp_confidenceScore` ON `opportunities` (`confidenceScore`);--> statement-breakpoint
CREATE INDEX `idx_oe_opportunityId` ON `opportunity_events` (`opportunityId`);--> statement-breakpoint
CREATE INDEX `idx_oe_eventId` ON `opportunity_events` (`eventId`);