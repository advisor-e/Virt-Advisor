-- =============================================================================
-- Virt Advisor — Firm Manager Schema
-- =============================================================================
-- Run this file once against the Advisor-e MySQL database to create the
-- tables required by the Firm Manager hub.
--
-- INTEGRATION NOTE (for Advisor-e team):
--   All tables use firm_id (VARCHAR 64) as a scoping key. This value must
--   match the firmId claim carried in the Advisor-e JWT — see AUTH.firmIdClaim
--   in config/integration.js.
--
--   If Advisor-e already has a `firms` table, skip the CREATE TABLE `firms`
--   block below and update each FOREIGN KEY constraint that references it to
--   point to the existing table instead.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `virt_advisor`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `virt_advisor`;

-- -----------------------------------------------------------------------------
-- firms
-- Master record for each firm. If Advisor-e already owns a firms table,
-- drop this block and remap the FKs below to that table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `firms` (
  `id`              VARCHAR(64)  NOT NULL,
  `name`            VARCHAR(255) NOT NULL,
  `slug`            VARCHAR(128) NOT NULL,
  `logo_url`        VARCHAR(512)          DEFAULT NULL,
  `primary_colour`  VARCHAR(7)            DEFAULT '#000000',
  `persona_name`    VARCHAR(128)          DEFAULT NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_firms_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- firm_documents
-- Tracks every PDF uploaded by a firm, stored in Google Drive.
-- `category` matches a value from DRIVE.categories in config/integration.js.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `firm_documents` (
  `id`             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `firm_id`        VARCHAR(64)    NOT NULL,
  `category`       VARCHAR(64)    NOT NULL,
  `file_name`      VARCHAR(255)   NOT NULL,
  `drive_file_id`  VARCHAR(255)   NOT NULL,
  `mime_type`      VARCHAR(128)   NOT NULL,
  `size_bytes`     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `uploaded_by`    VARCHAR(255)   NOT NULL,
  `created_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_firm_docs_firm_cat` (`firm_id`, `category`),
  CONSTRAINT `fk_firm_docs_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- firm_framework_versions
-- Stores per-firm JSON overrides for the AI decision framework.
-- Only one version per (firm_id, config_key) is active at any time.
-- Previous versions are retained (up to FRAMEWORK.maxVersionHistory) for rollback.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `firm_framework_versions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `firm_id`      VARCHAR(64)  NOT NULL,
  `config_key`   VARCHAR(128) NOT NULL,
  `config_json`  LONGTEXT     NOT NULL,
  `version`      INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `saved_by`     VARCHAR(255) NOT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fw_firm_key_active`   (`firm_id`, `config_key`, `is_active`),
  KEY `idx_fw_firm_key_version`  (`firm_id`, `config_key`, `version`),
  CONSTRAINT `fk_firm_fw_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- firm_videos
-- Video links added by a firm, tagged to a specific advisory domain.
-- `domain` matches the domain keys defined in data/domains.json.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `firm_videos` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `firm_id`     VARCHAR(64)   NOT NULL,
  `domain`      VARCHAR(128)  NOT NULL,
  `title`       VARCHAR(255)  NOT NULL,
  `url`         VARCHAR(512)  NOT NULL,
  `added_by`    VARCHAR(255)  NOT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_firm_videos_domain` (`firm_id`, `domain`),
  CONSTRAINT `fk_firm_videos_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- firm_storage_usage
-- Running total of Drive storage used per firm.
-- Updated (incremented/decremented) on each upload/delete.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `firm_storage_usage` (
  `firm_id`     VARCHAR(64)     NOT NULL,
  `bytes_used`  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`firm_id`),
  CONSTRAINT `fk_firm_storage_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
