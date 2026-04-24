import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_M5Lgd3PWBoqe@ep-ancient-mountain-ai7vu90g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("Starting migration...");

  // Schemas
  await sql`CREATE SCHEMA IF NOT EXISTS config`;
  await sql`CREATE SCHEMA IF NOT EXISTS audit`;
  await sql`CREATE SCHEMA IF NOT EXISTS agents`;
  console.log("✓ Schemas created");

  // Enums
  await sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_structure_enum') THEN
      CREATE TYPE deal_structure_enum AS ENUM ('stock_purchase','asset_purchase','merger_forward','merger_reverse','carve_out','f_reorg');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_model_enum') THEN
      CREATE TYPE integration_model_enum AS ENUM ('fully_integrated','hybrid','standalone');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tsa_required_enum') THEN
      CREATE TYPE tsa_required_enum AS ENUM ('yes','no','tbd');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_enum') THEN
      CREATE TYPE priority_enum AS ENUM ('critical','high','medium','low');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status_enum') THEN
      CREATE TYPE item_status_enum AS ENUM ('not_started','in_progress','blocked','complete','na');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_severity_enum') THEN
      CREATE TYPE risk_severity_enum AS ENUM ('critical','high','medium','low');
    END IF;
  END $$`;
  console.log("✓ Enums created");

  // Deals
  await sql`CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    deal_structure deal_structure_enum NOT NULL,
    integration_model integration_model_enum NOT NULL,
    close_date DATE NOT NULL,
    cross_border BOOLEAN DEFAULT FALSE,
    jurisdictions JSONB DEFAULT '[]',
    tsa_required tsa_required_enum DEFAULT 'tbd',
    industry_sector VARCHAR(50),
    shared_services JSONB DEFAULT '[]',
    deal_value_range VARCHAR(20),
    target_entities INTEGER,
    target_gaap VARCHAR(20),
    target_erp VARCHAR(50),
    buyer_maturity VARCHAR(30),
    acquirer_gaap VARCHAR(20),
    acquirer_fye DATE,
    functional_scope JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pre_close',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    neon_branch_id  VARCHAR(50),
    neon_branch_url TEXT
  )`;
  console.log("✓ deals table");

  // Team members
  await sql`CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200),
    role VARCHAR(50),
    workstreams JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ team_members table");

  // Checklist items
  await sql`CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    item_id VARCHAR(10) NOT NULL,
    workstream VARCHAR(80) NOT NULL,
    section VARCHAR(100),
    description TEXT NOT NULL,
    phase VARCHAR(20) NOT NULL,
    milestone_date DATE,
    priority priority_enum DEFAULT 'medium',
    status item_status_enum DEFAULT 'not_started',
    owner_id UUID REFERENCES team_members(id),
    dependencies JSONB DEFAULT '[]',
    tsa_relevant BOOLEAN DEFAULT FALSE,
    cross_border_flag BOOLEAN DEFAULT FALSE,
    risk_indicators JSONB DEFAULT '[]',
    functional_area VARCHAR(30),
    ai_guidance TEXT,
    notes JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    evidence_url VARCHAR(500),
    blocked_reason TEXT,
    na_justification TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, item_id)
  )`;
  console.log("✓ checklist_items table");

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_checklist_deal_status ON checklist_items(deal_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_checklist_deal_ws ON checklist_items(deal_id, workstream)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_checklist_milestone ON checklist_items(deal_id, milestone_date)`;
  console.log("✓ indexes");

  // Risk alerts
  await sql`CREATE TABLE IF NOT EXISTS risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL,
    description TEXT,
    indicators JSONB DEFAULT '[]',
    affected_items JSONB DEFAULT '[]',
    mitigation TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`;
  console.log("✓ risk_alerts table");

  // Audit history
  await sql`CREATE TABLE IF NOT EXISTS audit.status_history (
    id BIGSERIAL PRIMARY KEY,
    checklist_item_id UUID,
    deal_id UUID NOT NULL,
    field VARCHAR(30) DEFAULT 'status',
    old_value VARCHAR(100),
    new_value VARCHAR(100) NOT NULL,
    changed_by UUID,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ audit.status_history table");

  // Progress snapshots
  await sql`CREATE TABLE IF NOT EXISTS progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    period_end DATE NOT NULL,
    summary JSONB NOT NULL,
    workstreams JSONB NOT NULL,
    owners JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, period_end)
  )`;
  console.log("✓ progress_snapshots table");

  // Saved filters
  await sql`CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    filters JSONB NOT NULL,
    is_preset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ saved_filters table");

  // Milestones
  await sql`CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL,
    phase VARCHAR(20) NOT NULL,
    days_from_close INTEGER NOT NULL,
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ milestones table");

  // Config tables
  await sql`CREATE TABLE IF NOT EXISTS config.risk_rules (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    severity_default VARCHAR(10),
    predicate JSONB,
    description_template TEXT,
    mitigation_template TEXT,
    active BOOLEAN DEFAULT TRUE
  )`;
  console.log("✓ config.risk_rules table");

  await sql`CREATE TABLE IF NOT EXISTS config.guidance_library (
    id SERIAL PRIMARY KEY,
    workstream VARCHAR(80),
    section VARCHAR(100),
    context_flags JSONB,
    prompt_template TEXT,
    expansion_prompt TEXT
  )`;
  console.log("✓ config.guidance_library table");

  // TSA services
  await sql`CREATE TABLE IF NOT EXISTS tsa_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    service_category VARCHAR(50),
    service_name VARCHAR(200),
    pricing_model VARCHAR(20),
    monthly_cost DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    sla_metrics JSONB,
    exit_readiness INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
  )`;
  console.log("✓ tsa_services table");

  // ── Agent tables ──────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS agents.documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id      UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    doc_type     VARCHAR(30) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    blob_url     TEXT NOT NULL,
    preview_text TEXT,
    format       VARCHAR(10) DEFAULT 'markdown',
    word_count   INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_agent_docs_deal ON agents.documents(deal_id, created_at DESC)`;
  console.log("✓ agents.documents table");

  await sql`CREATE TABLE IF NOT EXISTS agents.prompt_library (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    text        TEXT NOT NULL,
    category    VARCHAR(50),
    is_global   BOOLEAN DEFAULT FALSE,
    deal_id     UUID REFERENCES deals(id) ON DELETE CASCADE,
    created_by  VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ agents.prompt_library table");

  await sql`CREATE TABLE IF NOT EXISTS agents.skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    steps       JSONB NOT NULL DEFAULT '[]',
    is_global   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ agents.skills table");

  await sql`CREATE TABLE IF NOT EXISTS agents.role_permissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role         VARCHAR(30) NOT NULL,
    action_type  VARCHAR(50) NOT NULL,
    allowed      BOOLEAN DEFAULT TRUE,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, action_type)
  )`;
  console.log("✓ agents.role_permissions table");

  // ── Parent Organizational Profiles ────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS parent_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name             VARCHAR(100) NOT NULL,
    org_type             VARCHAR(30),
    parent_industry      VARCHAR(50),
    hq_jurisdiction      VARCHAR(50),
    parent_gaap          VARCHAR(20),
    parent_erp           VARCHAR(50),
    fiscal_year_end      VARCHAR(3),
    reporting_currency   VARCHAR(10),
    imo_structure        VARCHAR(30),
    buyer_maturity       VARCHAR(20),
    integration_playbook TEXT,
    imo_lead             VARCHAR(100),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
  )`;
  console.log("✓ parent_profiles table");

  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS parent_profile_id UUID REFERENCES parent_profiles(id) ON DELETE SET NULL`;
  console.log("✓ deals.parent_profile_id FK column");

  // ── Catalogue Review Engine: generation log + override ledger ──
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS generation_log JSONB`;
  console.log("✓ deals.generation_log JSONB column");

  await sql`CREATE TABLE IF NOT EXISTS override_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id          UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    item_id          VARCHAR(10),
    item_description TEXT,
    workstream       VARCHAR(80),
    override_type    VARCHAR(30),
    previous_value   VARCHAR(100),
    new_value        VARCHAR(100),
    warning_shown    BOOLEAN DEFAULT FALSE,
    override_reason  TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_override_deal ON override_log(deal_id, created_at DESC)`;
  console.log("✓ override_log table");

  // ── API Telemetry ───────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS api_telemetry (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id       UUID REFERENCES deals(id) ON DELETE SET NULL,
    call_type     VARCHAR(30) NOT NULL,
    model         VARCHAR(60),
    input_tokens  INTEGER,
    output_tokens INTEGER,
    latency_ms    INTEGER,
    actions_taken JSONB DEFAULT '[]',
    doc_type      VARCHAR(30),
    status        VARCHAR(10) DEFAULT 'ok',
    error_msg     TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_telemetry_deal    ON api_telemetry(deal_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_telemetry_created ON api_telemetry(created_at DESC)`;
  console.log("✓ api_telemetry table");

  // ── Workstream context overrides on deals ───────────────────
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS workstream_overrides JSONB`;
  console.log("✓ deals.workstream_overrides JSONB column");

  // ── Master Catalogue (seeded by scripts/seed-catalogue.ts) ───────────────
  await sql`CREATE TABLE IF NOT EXISTS master_catalogue (
    item_id              VARCHAR(10) PRIMARY KEY,
    workstream           VARCHAR(80) NOT NULL,
    section              VARCHAR(150),
    description          TEXT NOT NULL,
    phase                VARCHAR(20) NOT NULL,
    priority             priority_enum NOT NULL DEFAULT 'medium',
    tsa_relevant         BOOLEAN DEFAULT FALSE,
    cross_border_flag    BOOLEAN DEFAULT FALSE,
    risk_indicators      JSONB DEFAULT '[]',
    functional_area      VARCHAR(30),
    dependencies         JSONB DEFAULT '[]',
    node_id              VARCHAR(50) DEFAULT 'GENERAL',
    capability_node      VARCHAR(50),
    must_have            BOOLEAN DEFAULT FALSE,
    must_have_reason     TEXT,
    sector_affinity      JSONB DEFAULT '[]',
    maturity_sensitive   BOOLEAN DEFAULT FALSE,
    version              INTEGER DEFAULT 1,
    updated_at           TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_master_workstream ON master_catalogue(workstream)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_master_phase      ON master_catalogue(phase)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_master_must_have  ON master_catalogue(must_have) WHERE must_have = TRUE`;
  console.log("✓ master_catalogue table");

  // Verify
  const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'config', 'audit', 'agents') ORDER BY table_schema, table_name`;
  console.log("\n=== ALL TABLES ===");
  tables.forEach(t => console.log(`  ${t.table_schema}.${t.table_name}`));
  console.log(`\nTotal: ${tables.length} tables`);
  console.log("\n✅ Migration complete!");
}

migrate().catch(e => { console.error("MIGRATION ERROR:", e); process.exit(1); });
