ALTER TABLE `template_variant_items` ADD `project_id` integer REFERENCES `projects`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `template_variant_items` ADD `project_bullet_id` integer REFERENCES `project_bullets`(`id`) ON DELETE cascade;
