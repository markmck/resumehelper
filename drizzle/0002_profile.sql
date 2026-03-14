CREATE TABLE `profile` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL DEFAULT '',
  `email` text NOT NULL DEFAULT '',
  `phone` text NOT NULL DEFAULT '',
  `location` text NOT NULL DEFAULT '',
  `linkedin` text NOT NULL DEFAULT ''
);
INSERT INTO `profile` (`id`) VALUES (1);
