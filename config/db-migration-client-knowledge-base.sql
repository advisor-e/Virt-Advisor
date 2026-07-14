-- =============================================================================
-- Virt Advisor — Client Knowledge Base migration (design 2026-07-14)
-- =============================================================================
-- FOR THE ADVISOR-E (MASTER) TEAM TO RUN — this file is shipped in the branch
-- as a proposal and is NEVER executed by the Virt Advisor dev environment.
--
-- Run ONCE against an EXISTING database that already has the tables from
-- config/db-schema.sql. (A fresh install does not need this file — db-schema.sql
-- now includes everything below.)
--
-- What it does:
--   1. Creates `va_clients` — the firm-scoped client register. The client's
--      NAME IS A LABEL, NOT THE KEY: identity is a generated UUID the advisor
--      never sees, so renaming a client never orphans its case history.
--      `name_key` is a normalised form (lowercased, diacritics and all
--      non-alphanumerics stripped) used ONLY for duplicate detection and the
--      "did you mean…?" check — deliberately NOT unique, because two genuinely
--      distinct businesses can share a name; the application warns, the
--      database does not block.
--   2. Adds `client_id` to `va_case_studies` — the link that makes "what did
--      we recommend for THIS client last time, and how did it go?" answerable.
--      NULLable: naming a client is skippable, and every existing case
--      predates the feature.
--
-- ⚠️ DO NOT BACK-FILL `client_id` for existing cases by matching on the
--    free-text `title`. The title is exactly the unreliable key this design
--    exists to avoid — a wrong match would attach one client's history to
--    another client. Existing cases stay NULL; the knowledge base builds from
--    the feature's ship date forward. (Product owner decision, 2026-07-14.)
-- =============================================================================

USE `virt_advisor`;

-- -----------------------------------------------------------------------------
-- va_clients
-- One row per client business, per firm. Every advisor at the firm selects
-- from this ONE list (so the same client is never registered twice); what an
-- advisor can READ about the client remains governed by va_case_studies
-- `visibility` — sharing a client's name is not sharing their cases.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_clients` (
  `id`          VARCHAR(64)  NOT NULL,
  `firm_id`     VARCHAR(64)  NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `name_key`    VARCHAR(255) NOT NULL,
  `created_by`  VARCHAR(64)  NOT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_firm_name`    (`firm_id`, `name`),
  KEY `idx_clients_firm_namekey` (`firm_id`, `name_key`),
  CONSTRAINT `fk_clients_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_case_studies — link each case to its client (nullable), and record
-- PER-TEMPLATE outcomes at review time.
-- ON DELETE SET NULL: if a client record is ever removed, its cases revert to
-- unlinked rather than being destroyed — case history is never collateral.
--
-- `template_outcomes` (product owner, 2026-07-14): the advisor's per-template
-- record — which templates were actually used, half-used or not used, and how
-- each landed. Array of { title, used: 'full'|'partial'|'none',
-- outcome: 'well'|'less'|null }. Written ONLY via the review route (titles are
-- validated server-side against the case's own template list). NULL for cases
-- reviewed before this feature — the engine then falls back to the case-level
-- review, honestly (no per-template attribution is invented).
-- -----------------------------------------------------------------------------
ALTER TABLE `va_case_studies`
  ADD COLUMN `client_id` VARCHAR(64) DEFAULT NULL AFTER `firm_id`,
  ADD COLUMN `template_outcomes` JSON DEFAULT NULL AFTER `review_changes_recommended`,
  ADD KEY `idx_cases_client` (`client_id`),
  ADD CONSTRAINT `fk_cases_client`
    FOREIGN KEY (`client_id`) REFERENCES `va_clients` (`id`) ON DELETE SET NULL;
