-- =============================================================================
-- Virt Advisor — Sales Tracker migration (item 17, stage 1)
-- =============================================================================
-- FOR THE ADVISOR-E (MASTER) TEAM TO RUN — this file is shipped in the branch
-- as a proposal and is NEVER executed by the Virt Advisor dev environment.
--
-- Run ONCE against an EXISTING database that already has the tables from
-- config/db-schema.sql. It needs the `firms` table and the `__platform__` row.
--
-- WHAT THIS IS. The Sales Tracker is an advisor's own business development:
-- the deals they are working and the referral partners ("centres of influence")
-- who send them. Ported from the standalone app at advisor-e/sales-tracker-nuxt.
-- The plan is design/features/sales-tracker.md §10; this file is stage 1.
--
-- =============================================================================
-- 🔴 THE ONE THING THAT MATTERS MOST: WHOSE DEALS ARE THESE?
-- =============================================================================
-- The source app has NO CONCEPT OF A FIRM. Its own comment reads:
--
--     // Pipeline is shared across the firm - no userId filter
--
-- That is true for a single-firm product and false for ours twice over:
--
--   1. Virt Advisor is MULTI-TENANT. Ported literally, one firm would read
--      another firm's prospects, fee values and who is chasing whom.
--   2. Mike ruled 2026-09-21 that this is the ADVISOR'S OWN tool — "the gain is
--      to the advisor, not to their client". Scoping to the firm alone would
--      show every advisor at a firm every other advisor's deals.
--
-- So the rule here is BOTH, and it is not optional:
--
--   * `firm_id`    — the tenant. Never read from a request body; always from
--                    the verified JWT (req.firmId). Same rule that closed the
--                    cases IDOR — see server/routes/clients.js.
--   * `advisor_id` — the owner. The advisor whose pipeline this is.
--   * `visibility` — 'private' (the owner alone; the DEFAULT and the fail-safe)
--                    or 'firm' (readable by the advisor's colleagues).
--
-- This trio is COPIED FROM `va_courses` in config/db-schema.sql rather than
-- invented here, so the Sales Tracker inherits a privacy model that is already
-- built, already reviewed and already tested. Do not diverge from it.
--
-- ⚠ OPEN QUESTION FOR MIKE, recorded rather than assumed: whether a FIRM
--   MANAGER sees their advisors' pipelines by default. `visibility` carries
--   either answer with no schema change; the Team screen (stage 4) is where it
--   becomes visible. Until he rules, nothing widens the default.
--
-- =============================================================================
-- FIVE TABLES, NOT THE TEN THE SOURCE APP HAS
-- =============================================================================
-- Five of the source's ten do not come across, and each omission is a decision:
--
--   `user`, `session`   ALL LOGIN IS THE MASTER APP'S, never ours. Their tables
--                       duplicate authentication Virt Advisor already has and
--                       would add a second credential store to defend. Identity
--                       comes from the verified JWT: req.advisorId / req.firmId.
--
--   `auditlog`          WE ALREADY HAVE ONE. `audit_log` in db-schema.sql is
--                       append-only and carries actor_id / action / target_type
--                       / target_id / meta_json — a superset of their columns.
--                       The Sales Tracker writes rows to it; it does not get a
--                       second, differently-shaped audit table.
--
--   `appconfig`         WE ALREADY HAVE ONE, AND IT IS BETTER. Their table is a
--                       per-key JSON store — `list:<key>` → JSON, deduplicated
--                       to "most recent per key" in application code. That is
--                       exactly `firm_framework_versions` (firm_id, config_key,
--                       config_json), which does the dedup in the database AND
--                       brings version history and restore for free. The Lists
--                       screen (stage 4) uses config keys prefixed
--                       `sales-tracker-list:`.
--
--   `customlanguage`    Stage 6, which the survey recommends dropping: Virt
--                       Advisor already has language and currency handling and
--                       8 locale files against their 6. Porting it means running
--                       two translation systems side by side. NOT created here;
--                       if Mike keeps stage 6, it gets its own migration.
--
-- The three blog tables ARE created, because Mike ruled 2026-09-21 that he
-- wants all eight screens including the blog tool (stage 5). They are inert
-- until that stage is built.
-- =============================================================================

USE `virt_advisor`;

-- -----------------------------------------------------------------------------
-- va_sales_pipeline
-- One row per prospective deal. The heart of the feature.
--
-- The source's `PipelineEntry` has 34 business columns; every one is kept, with
-- its type preserved, because they are the advisor's own working record and
-- dropping one loses data the screen already collects.
--
-- WHAT CHANGED FROM THE SOURCE, AND WHY:
--   * `id` VARCHAR(64) not INT AUTO_INCREMENT. Our convention across va_cases,
--     va_courses and va_clients: a generated id, so a row can be created
--     offline/optimistically and is never guessable by counting.
--   * `user_id INT` → `advisor_id` + `firm_id` + `visibility`. See the header.
--   * Money is DECIMAL(14,2), unchanged — NEVER a float. These are fee values a
--     firm reports on.
--   * `secure_meeting`, `quiz_completed`, `proposal_sent`, `job_secured` and
--     `follow_up_meeting` are TINYINT(1), MySQL's boolean.
--
-- The three indexes mirror the three the source declared, with `firm_id` and
-- `advisor_id` leading instead of `userId` — they exist because the screen
-- filters on status, lead staff and partner.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_sales_pipeline` (
  `id`                      VARCHAR(64)             NOT NULL,
  `advisor_id`              VARCHAR(64)             NOT NULL,
  `firm_id`                 VARCHAR(64)             NOT NULL,
  `visibility`              ENUM('private','firm')  NOT NULL DEFAULT 'private',

  -- Who the prospect is
  `prospect_name`           VARCHAR(255)            NOT NULL,
  `business_name`           VARCHAR(255)                     DEFAULT NULL,
  `prospect_status`         VARCHAR(80)             NOT NULL,
  `address`                 VARCHAR(500)                     DEFAULT NULL,
  `contact_phone`           VARCHAR(80)                      DEFAULT NULL,
  `email`                   VARCHAR(255)                     DEFAULT NULL,
  `industry`                VARCHAR(120)                     DEFAULT NULL,
  `existing_fee_value`      VARCHAR(120)                     DEFAULT NULL,

  -- Who at the firm is on it
  `partner`                 VARCHAR(255)                     DEFAULT NULL,
  `lead_staff`              VARCHAR(255)                     DEFAULT NULL,
  `support_staff`           VARCHAR(255)                     DEFAULT NULL,

  -- How it came in
  `relationship_type`       VARCHAR(80)                      DEFAULT NULL,
  `prospect_source`         VARCHAR(120)                     DEFAULT NULL,
  `coi_involved`            VARCHAR(255)                     DEFAULT NULL,
  `date_last_contact`       DATETIME                         DEFAULT NULL,

  -- The approach
  `approach_date`           DATETIME                         DEFAULT NULL,
  `approach_style`          VARCHAR(120)                     DEFAULT NULL,
  `secure_meeting`          TINYINT(1)              NOT NULL DEFAULT 0,
  `quiz_completed`          TINYINT(1)              NOT NULL DEFAULT 0,

  -- The meeting
  `sales_style`             VARCHAR(80)                      DEFAULT NULL,
  `meeting_theme`           VARCHAR(120)                     DEFAULT NULL,
  `meeting_date`            DATETIME                         DEFAULT NULL,
  `follow_up_meeting`       TINYINT(1)              NOT NULL DEFAULT 0,
  `follow_up_meeting_date`  DATETIME                         DEFAULT NULL,
  `total_needs_stage`       VARCHAR(80)                      DEFAULT NULL,

  -- The outcome. Money is DECIMAL, never FLOAT.
  `proposal_sent`           TINYINT(1)              NOT NULL DEFAULT 0,
  `proposal_value`          DECIMAL(14,2)           NOT NULL DEFAULT 0.00,
  `job_secured`             TINYINT(1)              NOT NULL DEFAULT 0,
  `date_secured`            DATETIME                         DEFAULT NULL,
  `job_secured_value`       DECIMAL(14,2)           NOT NULL DEFAULT 0.00,
  `additional_work_secured` DECIMAL(14,2)           NOT NULL DEFAULT 0.00,

  `comments`                LONGTEXT                         DEFAULT NULL,
  `created_at`              DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_pipeline_advisor`        (`advisor_id`, `updated_at`),
  KEY `idx_pipeline_firm_vis`       (`firm_id`, `visibility`, `updated_at`),
  KEY `idx_pipeline_status`         (`firm_id`, `prospect_status`, `updated_at`),
  KEY `idx_pipeline_lead_staff`     (`firm_id`, `lead_staff`, `updated_at`),
  KEY `idx_pipeline_partner`        (`firm_id`, `partner`, `updated_at`),
  CONSTRAINT `fk_pipeline_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_sales_coi
-- Centres of influence — the referral partners who send an advisor work, and
-- what they have actually sent.
--
-- `could_we`, `how_would_we`, `will_we` and `test_review` are the source's own
-- scoring columns (INT, default 0). They are the advisor's assessment of the
-- relationship; the source app does not constrain their range and neither does
-- this, so no data is lost in the port. If a range is ever ruled, it belongs in
-- the route's validation where a bad value can be REPORTED, not silently
-- truncated by the database.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_sales_coi` (
  `id`                         VARCHAR(64)             NOT NULL,
  `advisor_id`                 VARCHAR(64)             NOT NULL,
  `firm_id`                    VARCHAR(64)             NOT NULL,
  `visibility`                 ENUM('private','firm')  NOT NULL DEFAULT 'private',

  `coi_name`                   VARCHAR(255)            NOT NULL,
  `email`                      VARCHAR(255)                     DEFAULT NULL,
  `cell`                       VARCHAR(80)                      DEFAULT NULL,
  `entity`                     VARCHAR(255)                     DEFAULT NULL,
  `position`                   VARCHAR(255)                     DEFAULT NULL,
  `industry`                   VARCHAR(120)                     DEFAULT NULL,
  `other`                      VARCHAR(255)                     DEFAULT NULL,
  `lead_relationship_partner`  VARCHAR(255)                     DEFAULT NULL,
  `relationship_support`       VARCHAR(255)                     DEFAULT NULL,

  -- The advisor's own assessment of the relationship
  `could_we`                   INT                     NOT NULL DEFAULT 0,
  `how_would_we`               INT                     NOT NULL DEFAULT 0,
  `will_we`                    INT                     NOT NULL DEFAULT 0,
  `test_review`                INT                     NOT NULL DEFAULT 0,

  -- What the relationship has actually produced
  `total_referrals`            INT                     NOT NULL DEFAULT 0,
  `total_converted`            INT                     NOT NULL DEFAULT 0,
  `fee_value`                  DECIMAL(14,2)           NOT NULL DEFAULT 0.00,

  `created_at`                 DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                 DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                       ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_coi_advisor`     (`advisor_id`, `updated_at`),
  KEY `idx_coi_firm_vis`    (`firm_id`, `visibility`, `updated_at`),
  KEY `idx_coi_industry`    (`firm_id`, `industry`, `updated_at`),
  KEY `idx_coi_partner`     (`firm_id`, `lead_relationship_partner`, `updated_at`),
  CONSTRAINT `fk_coi_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- THE BLOG TOOL — stage 5. Created here, INERT until that stage is built.
-- =============================================================================
-- Mike ruled 2026-09-21 that the blog tool is in scope. These three tables are
-- created now so the schema is complete in one migration rather than two.
--
-- ⚠ NOTHING READS OR WRITES THEM YET, and stage 5 carries the strictest bar in
--   the standards: 100% test coverage on anything validating LLM output, plus a
--   prompt-injection guard the source app does not have. See
--   design/features/sales-tracker.md §10 stage 5.
--
-- 🔴 AND ONE FAULT THAT MUST NOT BE PORTED: the source's pages/index.vue pipes
--    marked() straight into v-html with NO sanitiser, on text a model generated.
--    Our rule is isomorphic-dompurify on every v-html path. The schema cannot
--    enforce that; the reviewer of stage 5 must.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- va_sales_blog_input
-- The brief an advisor fills in before generating a post. `signature` is the
-- source's own de-duplication key for "have I asked for this before?".
-- The four *_json columns hold small authored structures, not model output.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_sales_blog_input` (
  `id`                  VARCHAR(64)   NOT NULL,
  `advisor_id`          VARCHAR(64)   NOT NULL,
  `firm_id`             VARCHAR(64)   NOT NULL,

  `signature`           VARCHAR(191)  NOT NULL,
  `topic`               VARCHAR(255)  NOT NULL,
  `audience`            VARCHAR(255)  NOT NULL,
  `objective`           VARCHAR(255)  NOT NULL,
  `tone`                VARCHAR(80)   NOT NULL,
  `length`              VARCHAR(80)   NOT NULL,
  `cta`                 VARCHAR(255)  NOT NULL,
  `principles_json`     JSON          NOT NULL,
  `selected_person`     VARCHAR(255)           DEFAULT NULL,
  `target_mode`         VARCHAR(120)           DEFAULT NULL,
  `style_strength`      VARCHAR(40)            DEFAULT NULL,
  `style_titles_json`   JSON                   DEFAULT NULL,
  `length_ranges_json`  JSON                   DEFAULT NULL,
  `style_thresholds_json` JSON                 DEFAULT NULL,

  `created_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_blog_input_signature` (`advisor_id`, `signature`),
  KEY `idx_blog_input_updated`   (`firm_id`, `updated_at`),
  CONSTRAINT `fk_blog_input_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_sales_blog_post
-- A generated post, draft or final. `outline_text` and `final_text` are MODEL
-- OUTPUT: treat them as untrusted on the way out (sanitise before any v-html)
-- as well as on the way in.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_sales_blog_post` (
  `id`              VARCHAR(64)            NOT NULL,
  `advisor_id`      VARCHAR(64)            NOT NULL,
  `firm_id`         VARCHAR(64)            NOT NULL,

  `kind`            ENUM('draft','final')  NOT NULL,
  `title`           VARCHAR(255)           NOT NULL,
  `topic`           VARCHAR(255)           NOT NULL,
  `audience`        VARCHAR(255)           NOT NULL,
  `objective`       VARCHAR(255)           NOT NULL,
  `tone`            VARCHAR(80)            NOT NULL,
  `length`          VARCHAR(80)            NOT NULL,
  `cta`             VARCHAR(255)           NOT NULL,
  `selected_person` VARCHAR(255)                    DEFAULT NULL,
  `target_mode`     VARCHAR(120)                    DEFAULT NULL,
  `outline_text`    LONGTEXT               NOT NULL,
  `final_text`      LONGTEXT                        DEFAULT NULL,
  `is_pinned`       TINYINT(1)             NOT NULL DEFAULT 0,
  `metadata_json`   JSON                            DEFAULT NULL,

  `created_at`      DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_blog_post_kind`   (`advisor_id`, `kind`, `updated_at`),
  KEY `idx_blog_post_pinned` (`advisor_id`, `is_pinned`, `updated_at`),
  KEY `idx_blog_post_firm`   (`firm_id`, `updated_at`),
  CONSTRAINT `fk_blog_post_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- va_sales_blog_reference
-- Source material an advisor supplies for the model to write from: a pasted
-- document or a URL. `content` is advisor-supplied text — it reaches a prompt,
-- so stage 5 wraps it in explicit delimiters rather than concatenating it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `va_sales_blog_reference` (
  `id`          VARCHAR(64)   NOT NULL,
  `advisor_id`  VARCHAR(64)   NOT NULL,
  `firm_id`     VARCHAR(64)   NOT NULL,

  `title`       VARCHAR(255)  NOT NULL,
  `type`        VARCHAR(50)   NOT NULL,          -- 'document' | 'url'
  `content`     LONGTEXT               DEFAULT NULL,
  `url`         VARCHAR(500)           DEFAULT NULL,
  `topic`       VARCHAR(255)           DEFAULT NULL,

  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_blog_ref_topic`   (`advisor_id`, `topic`, `updated_at`),
  KEY `idx_blog_ref_updated` (`advisor_id`, `updated_at`),
  KEY `idx_blog_ref_firm`    (`firm_id`, `updated_at`),
  CONSTRAINT `fk_blog_ref_firm`
    FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
