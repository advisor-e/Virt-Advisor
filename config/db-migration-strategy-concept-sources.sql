-- =============================================================================
-- Virt Advisor — Add Concept: the original PDFs a manager uploads (item 15.20)
-- =============================================================================
-- FOR THE ADVISOR-E (MASTER) TEAM TO RUN — this file is shipped in the branch
-- as a proposal and is NEVER executed by the Virt Advisor dev environment.
--
-- Run ONCE against an EXISTING database that already has the tables from
-- config/db-schema.sql. (A fresh install does not need this file — db-schema.sql
-- now includes the table below.)
--
-- 🔴 ONE SERVER SETTING IS NEEDED BESIDE IT: `max_allowed_packet` of at least
-- 32M. Each row carries one uploaded PDF of up to 20 MB in a single INSERT; the
-- MySQL 5.7 default (4M) refuses it, and the 8.x default (64M) already clears it.
-- A refusal is loud — the manager's Save fails with a database error and nothing
-- half-saved is left behind — but nobody can add a concept until it is set.
--
-- What it does: creates `strategy_concept_sources`, one row per original PDF a
-- manager uploaded to build an imported Strategy Planner concept. Mike ruled on
-- 2026-09-23 that the original is KEPT, against the version of the concept it
-- produced, because the conversion library's SVG back-end "is no longer
-- maintained and may be removed" — keeping the originals is what lets a concept
-- be converted again without every firm uploading its material again. He ruled
-- on 2026-09-29 that it is kept HERE, in the database, rather than in a folder on
-- the server's disk. design/features/strategy-planner.md §9.
--
-- 🔴 WHAT THIS HOLDS. A firm's own teaching material, which can carry client
-- names and real case studies. It is never sent to a model (Mike, 2026-09-23),
-- and every row is deleted when its concept is removed.
--
-- `firm_id` is a scope id: a real firm, or one of the reserved manager-tier rows
-- (`__platform__`, `__global__:…`, `__group__:…`) every tier already needs in
-- `firms` — see server/utils/dbFailure.js.
-- =============================================================================

USE `virt_advisor`;

CREATE TABLE IF NOT EXISTS `strategy_concept_sources` (
  `id`              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `firm_id`         VARCHAR(64)       NOT NULL,
  `concept_id`      VARCHAR(64)       NOT NULL,
  `concept_version` INT UNSIGNED      NOT NULL DEFAULT 1,
  `role`            ENUM('teaching','response') NOT NULL,
  -- Teaching PDFs are taught in the order they were dropped; the Response Form is 1.
  `position`        SMALLINT UNSIGNED NOT NULL,
  `filename`        VARCHAR(255)      NOT NULL,
  `byte_size`       INT UNSIGNED      NOT NULL,
  `sha256`          CHAR(64)          NOT NULL,
  -- LONGBLOB, not MEDIUMBLOB: MEDIUMBLOB stops at 16 MB and the upload cap is 20.
  `pdf`             LONGBLOB          NOT NULL,
  `saved_by`        VARCHAR(255)      NOT NULL,
  `created_at`      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_concept_source` (`firm_id`, `concept_id`, `concept_version`, `role`, `position`),
  CONSTRAINT `fk_concept_sources_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
