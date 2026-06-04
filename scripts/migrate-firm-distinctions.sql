-- Migration: firm_advisory_distinctions table
-- Run once against the Advisor-e MySQL database.
-- Safe to re-run (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS firm_advisory_distinctions (
  id           INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  firm_id      VARCHAR(64)      NOT NULL,
  domain       VARCHAR(64)      NOT NULL,
  description  VARCHAR(255)     NOT NULL,
  triggers     JSON             NOT NULL,
  templates    JSON             NOT NULL,
  boost        TINYINT UNSIGNED NOT NULL DEFAULT 5,
  created_by   VARCHAR(255),
  created_at   DATETIME         DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_firm_domain (firm_id, domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
