ALTER TABLE `candidate_profiles` MODIFY COLUMN `skills` json;--> statement-breakpoint
ALTER TABLE `candidate_profiles` MODIFY COLUMN `preferredRoles` json;--> statement-breakpoint
ALTER TABLE `candidate_profiles` MODIFY COLUMN `preferredLocations` json;--> statement-breakpoint
ALTER TABLE `memory_entries` MODIFY COLUMN `metadata` json;