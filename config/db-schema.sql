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

-- -----------------------------------------------------------------------------
-- advisor_va_sessions
-- One row per completed VA case (happyConfirmed = true).
-- recommended_templates stores the raw template names for the audit trail.
-- highest_tier is pre-computed at write time from the template→section→tier lookup.
-- advisor_id is not FK-constrained — advisors table belongs to the Advisor-e platform.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `advisor_va_sessions` (
  `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `advisor_id`            VARCHAR(64)   NOT NULL,
  -- Display name captured at write time from the advisor's own verified JWT. Stored
  -- rather than looked up because a firm manager's token carries the manager's name,
  -- never a colleague's, and this app holds no advisors table to join against.
  -- NULL when Advisor-e's token carries no name claim — screens then show the ID.
  `advisor_name`          VARCHAR(128)           DEFAULT NULL,
  `firm_id`               VARCHAR(64)   NOT NULL,
  `domain`                VARCHAR(128)           DEFAULT NULL,
  `recommended_templates` JSON                   DEFAULT NULL,
  `highest_tier`          ENUM('entry-level','intermediate','advanced') DEFAULT NULL,
  `completed_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_va_sessions_advisor` (`advisor_id`),
  KEY `idx_va_sessions_firm`    (`firm_id`),
  KEY `idx_va_sessions_tier`    (`highest_tier`),
  CONSTRAINT `fk_va_sessions_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- advisor_course_completions
-- One row per completed course session (quiz done or skipped).
-- session_resources stores the raw template names used in that session.
-- highest_tier is pre-computed at write time from the template→section→tier lookup.
-- Unique key on (advisor_id, course_id, session_index) prevents duplicate writes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `advisor_course_completions` (
  `id`                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `advisor_id`        VARCHAR(64)      NOT NULL,
  -- See advisor_va_sessions.advisor_name — captured at write time, NULL until the
  -- Advisor-e token carries a name claim.
  `advisor_name`      VARCHAR(128)              DEFAULT NULL,
  `firm_id`           VARCHAR(64)      NOT NULL,
  `course_id`         VARCHAR(64)      NOT NULL,
  `course_title`      VARCHAR(255)     NOT NULL,
  `course_topic`      VARCHAR(255)              DEFAULT NULL,
  `session_index`     TINYINT UNSIGNED NOT NULL,
  `session_title`     VARCHAR(255)     NOT NULL,
  `session_resources` JSON                      DEFAULT NULL,
  `quiz_score`        TINYINT UNSIGNED          DEFAULT NULL,
  -- Per-question record: [{bankKey, bankRef, score, passed, ungraded}, ...].
  -- Deliberately NOT the advisor's written answer, the question text or the marker's
  -- feedback (owner recommendation, ADVISOR-PROGRESS-HANDOVER §6) — advisors write
  -- differently once they believe a manager reads their words. Normalised and capped
  -- by server/utils/quizRecord.js before it is written; NULL when a quiz was skipped.
  `quiz_questions`    JSON                      DEFAULT NULL,
  `highest_tier`      ENUM('entry-level','intermediate','advanced') DEFAULT NULL,
  `completed_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_session`        (`advisor_id`, `course_id`, `session_index`),
  KEY `idx_course_comp_advisor`         (`advisor_id`),
  KEY `idx_course_comp_firm`            (`firm_id`),
  KEY `idx_course_comp_tier`            (`highest_tier`),
  CONSTRAINT `fk_course_comp_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_clients
-- The firm-scoped client register (client knowledge base, design 2026-07-14).
-- One row per client business, per firm — every advisor at the firm selects
-- from this ONE list, so the same client is never registered twice.
--
-- The client's NAME IS A LABEL, NOT THE KEY: `id` is a generated UUID the
-- advisor never sees, so renaming a client never orphans its case history.
-- `name_key` is a normalised form of the name (lowercased, diacritics and all
-- non-alphanumerics stripped — see clientStore.normaliseNameKey) used ONLY for
-- duplicate detection and the "did you mean…?" check. It is deliberately NOT
-- unique: two genuinely distinct businesses can share a name — the application
-- warns, the database does not block.
--
-- What an advisor can READ about a client remains governed by va_case_studies
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
-- va_case_studies
-- One row per saved case study. Stored centrally (not in browser localStorage)
-- so a case follows the advisor across every device they log in from.
--
-- `visibility` is the entire privacy model:
--   'private' = the owning advisor only, on any of their devices (access-
--               controlled by advisor_id from the verified JWT — team and firm
--               manager cannot see it);
--   'shared'  = the whole firm (team + manager).
-- An advisor can flip a case BOTH ways (private <-> shared); the toggle simply
-- UPDATEs this one column. Default is 'private' as a fail-safe — the save UI
-- always sends an explicit choice, so the default only ever applies if a write
-- somehow arrives without one, in which case we fail to least exposure.
--
-- Reads are scoped from the verified JWT: an advisor sees their own cases (any
-- visibility) plus their firm's 'shared' cases. This closes the legacy
-- localStorage IDOR (identity was previously trusted from the client).
--
-- Mentor review (per-case, manager-gated, anonymised — design 2026-06-26):
--   `mentor_shared` is a SEPARATE privacy axis from `visibility`. The advisor
--   owns private<->shared (firm); the firm MANAGER owns shared-with-mentor. It
--   is a double opt-in — a case reaches the mentor only when it is firm-`shared`
--   AND a manager has approved `mentor_shared`. The `mentor_anon_*` copies hold
--   the anonymised summary/transcript and are written ONLY on the manager's
--   approval; they are the ONLY case content the mentor ever sees — the raw
--   `summary`/`transcript` never leave the firm. `mentor_shared_by` /
--   `mentor_shared_at` stamp who approved the share and when (audit).
--
-- `id` is a client-generated UUID (crypto.randomUUID) preserved as-is across the
-- localStorage -> DB migration. advisor_id is NOT FK-constrained — the advisors
-- table belongs to the Advisor-e platform, not this schema.
-- `decision_trace` is the structured "why this recommendation" trace the engine
-- emitted for the session (domain, lenses, distinction boosts, near-misses,
-- template scores). Stored so a firm manager can review the reasoning later; NULL
-- for cases saved before the trace was persisted.
-- Retention (future): age-based purge can key off `created_at` — no extra column.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_case_studies` (
  `id`                         VARCHAR(64)              NOT NULL,
  `advisor_id`                 VARCHAR(64)              NOT NULL,
  `firm_id`                    VARCHAR(64)              NOT NULL,
  -- Client-knowledge-base link (design 2026-07-14). NULL when the advisor
  -- skipped naming the client, and for every case saved before the feature.
  -- NEVER back-filled from the free-text title — see va_clients note above.
  `client_id`                  VARCHAR(64)                       DEFAULT NULL,
  `title`                      VARCHAR(255)             NOT NULL,
  `mode`                       VARCHAR(32)              NOT NULL,
  `visibility`                 ENUM('private','shared') NOT NULL DEFAULT 'private',
  `domain`                     VARCHAR(128)                      DEFAULT NULL,
  `staircase_step`             VARCHAR(128)                      DEFAULT NULL,
  `growth_stage`               VARCHAR(64)                       DEFAULT NULL,
  `fin_mgt_theme`              VARCHAR(128)                      DEFAULT NULL,
  `templates`                  JSON                              DEFAULT NULL,
  `summary`                    TEXT                              DEFAULT NULL,
  `transcript`                 LONGTEXT                          DEFAULT NULL,
  `decision_trace`             JSON                              DEFAULT NULL,
  `feedback_pending`           TINYINT(1)               NOT NULL DEFAULT 1,
  `review_went_well`           TEXT                              DEFAULT NULL,
  `review_went_less`           TEXT                              DEFAULT NULL,
  `review_changes_recommended` TEXT                              DEFAULT NULL,
  -- Per-template outcomes recorded at review time (product owner 2026-07-14):
  -- [{ title, used: 'full'|'partial'|'none', outcome: 'well'|'less'|null }].
  -- Titles validated server-side against the case's own template list. NULL for
  -- pre-feature reviews — the engine falls back to the case-level review.
  `template_outcomes`          JSON                              DEFAULT NULL,
  `reviewed_at`                DATETIME                          DEFAULT NULL,
  -- Mentor review (per-case, manager-gated, anonymised — see note above).
  `mentor_shared`              TINYINT(1)               NOT NULL DEFAULT 0,
  `mentor_anon_summary`        TEXT                              DEFAULT NULL,
  `mentor_anon_transcript`     LONGTEXT                          DEFAULT NULL,
  `mentor_shared_by`           VARCHAR(64)                       DEFAULT NULL,
  `mentor_shared_at`           DATETIME                          DEFAULT NULL,
  `created_at`                 DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                 DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                        ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cases_advisor`          (`advisor_id`),
  KEY `idx_cases_firm_visibility`  (`firm_id`, `visibility`),
  KEY `idx_cases_domain`           (`domain`),
  KEY `idx_cases_feedback_pending` (`firm_id`, `feedback_pending`),
  KEY `idx_cases_mentor_shared`     (`mentor_shared`, `created_at`),
  KEY `idx_cases_client`           (`client_id`),
  CONSTRAINT `fk_cases_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE,
  -- ON DELETE SET NULL: if a client record is ever removed, its cases revert
  -- to unlinked rather than being destroyed — case history is never collateral.
  CONSTRAINT `fk_cases_client`
    FOREIGN KEY (`client_id`) REFERENCES `va_clients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_courses
-- One row per course built in the Course Builder (CB-16/17, plan
-- design/COURSE-BUILDER-PLAN.md). Stored centrally (not in browser
-- localStorage) so a course follows the advisor across devices, feeds firm
-- reporting, and makes firm-wide sharing possible.
--
-- `visibility` mirrors the va_case_studies privacy model:
--   'private' = the owning advisor only (access-controlled by advisor_id from
--               the verified JWT). Default and fail-safe.
--   'firm'    = shared firm-wide as a read-only template (CB-07, Mike's
--               personal-copy ruling 2026-07-16): teammates see the OUTLINE
--               only (never the author's progress or design conversation) and
--               "use" it by copying — the copy is a fresh private course owned
--               by them, with `copied_from` recording the source (audit only).
--
-- `outline` is the validated + resource-grounded course outline (title, topic,
-- intensity, sessions[]). `progress` is the per-session record array (status,
-- quizScore, completedAt, quizResults, notes). `design_history` is the design
-- conversation that produced the outline (kept for course revision context).
--
-- `id` is a client-generated id preserved as-is across the localStorage -> DB
-- migration (Stage D). advisor_id is NOT FK-constrained — the advisors table
-- belongs to the Advisor-e platform, not this schema.
--
-- Per-session COMPLETIONS for reporting live separately in
-- advisor_course_completions (already wired via /api/activity/log-course) —
-- this table is the course document itself.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_courses` (
  `id`             VARCHAR(64)                        NOT NULL,
  `advisor_id`     VARCHAR(64)                        NOT NULL,
  `firm_id`        VARCHAR(64)                        NOT NULL,
  `status`         ENUM('active','paused','complete') NOT NULL DEFAULT 'active',
  `visibility`     ENUM('private','firm')             NOT NULL DEFAULT 'private',
  `outline`        JSON                               NOT NULL,
  `progress`       JSON                                        DEFAULT NULL,
  `design_history` LONGTEXT                                    DEFAULT NULL,
  `copied_from`    VARCHAR(64)                                 DEFAULT NULL,
  `created_at`     DATETIME                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME                           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_advisor`         (`advisor_id`),
  KEY `idx_courses_firm_visibility` (`firm_id`, `visibility`),
  CONSTRAINT `fk_courses_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
