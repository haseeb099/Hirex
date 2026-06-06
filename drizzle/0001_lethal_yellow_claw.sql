CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`status` enum('Draft','Applied','Interview','Offer','Rejected') NOT NULL DEFAULT 'Draft',
	`notes` text,
	`appliedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(255),
	`headline` varchar(255),
	`resumeText` text,
	`skills` json DEFAULT ('[]'),
	`experienceYears` int DEFAULT 0,
	`preferredRoles` json DEFAULT ('[]'),
	`preferredLocations` json DEFAULT ('[]'),
	`targetSalary` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`externalId` varchar(255),
	`title` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`location` varchar(255),
	`jobType` varchar(100),
	`description` text,
	`requirements` text,
	`salaryMin` int,
	`salaryMax` int,
	`salaryCurrency` varchar(10) DEFAULT 'USD',
	`url` text,
	`source` varchar(100) DEFAULT 'manual',
	`matchScore` float DEFAULT 0,
	`matchTier` enum('high','medium','low') DEFAULT 'low',
	`reasoning` text,
	`coverLetter` text,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memory_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`memoryType` varchar(50) DEFAULT 'application_outcome',
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_entries_id` PRIMARY KEY(`id`)
);
