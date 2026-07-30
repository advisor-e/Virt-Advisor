-- ============================================================================
-- Advisor-e Collaborate — people-layer schema (MySQL 8 / InnoDB / utf8mb4)
-- ============================================================================
-- Advisor IDENTITY (name, title, firm, email, phone, location) is owned by
-- Advisory.com and is the system of record — it is NOT stored here. This schema
-- stores only the collaboration-specific data, keyed by the `advisor_id` that
-- Advisory issues. Provision this into the Advisor-e MySQL instance, then point
-- config/integration.js (DB section) / env vars at it.
-- ============================================================================

-- Advertised interest profile (platform-owned extension of the Advisory profile)
CREATE TABLE IF NOT EXISTS advisor_interest (
  advisor_id  VARCHAR(64)  NOT NULL PRIMARY KEY,
  available   TINYINT(1)   NOT NULL DEFAULT 0,
  about       TEXT         NULL,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Strengths / industries / topics the advisor advertises
CREATE TABLE IF NOT EXISTS advisor_tag (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  advisor_id  VARCHAR(64)  NOT NULL,
  kind        ENUM('strength','industry','topic') NOT NULL,
  value       VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_advisor_tag (advisor_id, kind, value),
  KEY idx_tag_value (kind, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1:1 connections (mutual accept)
CREATE TABLE IF NOT EXISTS connection (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  requester_id  VARCHAR(64)  NOT NULL,
  addressee_id  VARCHAR(64)  NOT NULL,
  status        ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pair (requester_id, addressee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Groups (SIGs)
CREATE TABLE IF NOT EXISTS `group` (
  id           VARCHAR(80)  NOT NULL PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  icon         VARCHAR(16)  NULL,
  created_by   VARCHAR(64)  NOT NULL,
  visibility   ENUM('listed','unlisted') NOT NULL DEFAULT 'listed',
  join_policy  ENUM('open','request-approval','invite-only') NOT NULL DEFAULT 'request-approval',
  summary      TEXT         NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_tag (
  group_id VARCHAR(80)  NOT NULL,
  value    VARCHAR(120) NOT NULL,
  PRIMARY KEY (group_id, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_member (
  group_id    VARCHAR(80) NOT NULL,
  advisor_id  VARCHAR(64) NOT NULL,
  role        ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, advisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Consent-based join requests (no auto-join; owner/manager approves)
CREATE TABLE IF NOT EXISTS group_join_request (
  id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id    VARCHAR(80) NOT NULL,
  advisor_id  VARCHAR(64) NOT NULL,
  status      ENUM('requested','approved','declined') NOT NULL DEFAULT 'requested',
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_req (group_id, advisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conversation threads (outreach + group chats)
CREATE TABLE IF NOT EXISTS thread (
  id          VARCHAR(80)  NOT NULL PRIMARY KEY,
  kind        ENUM('outreach','group') NOT NULL,
  owner_id    VARCHAR(64)  NOT NULL,   -- whose inbox this thread belongs to
  with_id     VARCHAR(80)  NOT NULL,   -- the other advisor_id, or the group_id
  with_name   VARCHAR(160) NOT NULL,
  status      ENUM('request','active') NOT NULL DEFAULT 'active',
  direction   ENUM('incoming','outgoing') NOT NULL DEFAULT 'outgoing',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS message (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  thread_id    VARCHAR(80)  NOT NULL,
  sender_id    VARCHAR(64)  NOT NULL,
  sender_name  VARCHAR(160) NOT NULL,
  body         TEXT         NOT NULL,
  lang         VARCHAR(8)   NOT NULL DEFAULT 'en',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_thread (thread_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marketplace — a group lists its own (Tier-4) IP; transactions are RECORD-ONLY
-- (Advisory takes no fee and is not party to the payment). The purchase row is the
-- analytics record; the buyer gains an unlimited-client usage licence + updates.
CREATE TABLE IF NOT EXISTS marketplace_listing (
  id          VARCHAR(80)  NOT NULL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  summary     TEXT         NULL,
  group_id    VARCHAR(80)  NULL,
  created_by  VARCHAR(64)  NOT NULL,
  price       VARCHAR(40)  NULL,
  ip_tier     TINYINT      NOT NULL DEFAULT 4, -- group-owned IP (plan §6 Tier 4)
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- IP-ownership register (plan §6; T3). Classifies an Advisor-e catalogue tool by
-- its page ID into one of the four ownership tiers, with a LOCKED / non-derivable
-- flag on Tier-2 frameworks so they can't be listed or re-sold. This is a SEPARATE
-- classification layer — the source catalogue is never modified. Today the app
-- reads this from an in-code map (server/data/ipClassification.js); wire this table
-- (or Advisory's real IP register) in behind that seam.
CREATE TABLE IF NOT EXISTS ip_register (
  page_id    VARCHAR(80) NOT NULL PRIMARY KEY, -- catalogue tool id (the listing `link`)
  tier       TINYINT     NOT NULL DEFAULT 1,   -- 1 Advisory-owned · 2 locked · 3 co-developed · 4 group-owned
  is_locked  TINYINT(1)  NOT NULL DEFAULT 0,   -- Tier-2 non-derivable flag
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_listing_tag (
  listing_id VARCHAR(80)  NOT NULL,
  value      VARCHAR(120) NOT NULL,
  PRIMARY KEY (listing_id, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketplace_purchase (
  id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  listing_id  VARCHAR(80) NOT NULL,
  buyer_id    VARCHAR(64) NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_purchase (listing_id, buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only audit trail (plan §6; FEAT-AUDITLOG). Records who did what, when,
-- to which target — evidence for shared-IP claims and security review. INSERT
-- ONLY: never UPDATE or DELETE (tamper-evident). `meta_json` holds small non-PII
-- detail (ids/labels only). READ access is admin/compliance-only (gate behind
-- FEAT-RBAC). Keep this table on append-only grants in production.
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id     VARCHAR(64)  NOT NULL,   -- who performed the action
  action       VARCHAR(64)  NOT NULL,   -- dotted code, e.g. 'listing.create'
  target_type  VARCHAR(32)  NULL,       -- 'group' | 'advisor' | 'listing' | …
  target_id    VARCHAR(80)  NULL,
  meta_json    JSON         NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_actor (actor_id, created_at),
  KEY idx_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- In-app notifications (per recipient). The visible text is NOT stored — the
-- frontend renders it from `type` + `params_json` via i18n locale keys, so
-- notifications are language-agnostic. `params_json` holds the interpolation
-- values (e.g. {"name":"Anna Richter"}); `link` is the in-app route to open.
CREATE TABLE IF NOT EXISTS notification (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      VARCHAR(64)  NOT NULL,   -- recipient advisor_id
  type         ENUM('connection_request','group_invitation','message','purchase') NOT NULL,
  params_json  JSON         NULL,
  link         VARCHAR(160) NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_unread (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
