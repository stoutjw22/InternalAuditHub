// ─────────────────────────────────────────────────────────────────────────────
// TypeScript models for the 6-Year Integrated Audit Plan feature.
// ─────────────────────────────────────────────────────────────────────────────

export type AuditPlanDomain =
  | 'Cybersecurity'
  | 'Business Continuity'
  | 'Claims'
  | 'Third-Party Risk'
  | 'Financial Reporting'
  | 'Actuarial / ERM'
  | 'IT Infrastructure'
  | 'IT / SDLC'
  | 'ERM / Governance'
  | 'Claims / Fraud'
  | 'Claims/UW/Agency'
  | 'Underwriting'
  | 'Data Governance'
  | 'Compliance'
  | 'HR'
  | 'Actuarial'
  | 'Market Conduct'
  | 'Legal / Governance'
  | 'IT Asset Mgmt'
  | 'Operations'
  | 'IT Operations'
  | 'Policy Admin'
  | 'Physical Security'
  | 'Governance';

export type ResidualLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type PlanYearStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Deferred';

export type ControlTier =
  | 'Tier 1 (MAR/Fin Rptg)'
  | 'Tier 2 (Key Ops/Reg)'
  | 'Tier 3 (Supporting)';

export type RelianceResult = 'Clean' | 'Exceptions' | 'Not Tested';

export type MARTestType = 'Design + Effectiveness' | 'Effectiveness' | 'Inspection';

// ── AuditableEntity ──────────────────────────────────────────────────────────

export interface AuditableEntityList {
  id: number;
  au_id: string;
  name: string;
  domain: AuditPlanDomain;
  priority_score: string | null;
  residual_level: ResidualLevel | null;
  mar_required: boolean;
}

export interface AuditableEntity extends AuditableEntityList {
  domain_display: string;
  rank: number | null;
  residual_level_display: string | null;
  primary_clusters: string | null;
  frameworks: string | null;
  risk_count: number | null;
  key_control_ids: string | null;
  agile_scope: string | null;
  estimated_hours: number | null;
  erm_risk_category: string | null;
  risk_appetite_threshold: string | null;
  exceeds_appetite: string | null;
  frequency_override_triggers: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditableEntityDetail extends AuditableEntity {
  plan_years: AuditPlanYearNested[];
  controls: KeyControlNested[];
}

// ── AuditPlanYear ─────────────────────────────────────────────────────────────

export interface AuditPlanYearNested {
  id: number;
  fiscal_year: number;
  planned_year: number | null;
  quarter: string | null;
  status: PlanYearStatus;
  status_display: string;
  is_scheduled: boolean;
}

export interface AuditPlanYear extends AuditPlanYearNested {
  au: number;
  au_detail: AuditableEntityList;
  quarter_display: string | null;
  created_at: string;
  updated_at: string;
}

// ── RiskScoringConfig ─────────────────────────────────────────────────────────

export interface RiskScoringConfig {
  id: number;
  factor: string;
  weight: string;
  weight_percent: string;
  score_1_label: string;
  score_2_label: string;
  score_3_label: string;
  score_4_label: string;
  score_5_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── ControlEffectivenessScale ─────────────────────────────────────────────────

export interface ControlEffectivenessScale {
  id: number;
  score: string;
  label: string;
  meaning: string;
  typical_signal: string;
  created_at: string;
  updated_at: string;
}

// ── ControlRelianceCycle ──────────────────────────────────────────────────────

export interface ControlRelianceCycle {
  id: number;
  control: number;
  control_detail: {
    id: number;
    control_id: string;
    control_name: string;
    is_key_control: boolean;
  };
  cycle_year: number;
  result: RelianceResult | null;
  result_display: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── KeyControlAssignment ──────────────────────────────────────────────────────

export interface KeyControlNested {
  id: number;
  control_id: string;
  is_key_control: boolean;
  control_name: string;
  framework: string | null;
  layer: string | null;
  grc_domain: string | null;
  control_type: string | null;
  frequency: string | null;
  control_tier: ControlTier | null;
  control_tier_display: string | null;
  baseline_complete: boolean;
  control_effectiveness: string | null;
  reliance_ready: boolean;
  testing_strategy: string | null;
  reliance_cycles: ControlRelianceCycle[];
}

export interface KeyControlAssignment extends KeyControlNested {
  assigned_au: number | null;
  assigned_au_detail: AuditableEntityList | null;
  control_type_display: string | null;
  category: string | null;
  category_display: string | null;
  frequency_display: string | null;
  grc_theme: string | null;
  sub_area: string | null;
  plan_year: number | null;
  created_at: string;
  updated_at: string;
}

// ── GRCTestingTheme ───────────────────────────────────────────────────────────

export interface GRCTestingTheme {
  id: number;
  layer: string;
  domain: string;
  sub_theme_code: string;
  sub_theme_name: string;
  control_count: number | null;
  control_types: string | null;
  key_evidence: string | null;
  planned_audit_years: string | null;
  created_at: string;
  updated_at: string;
}

// ── MARTestingEngagement ──────────────────────────────────────────────────────

export interface MARTestingEngagement {
  id: number;
  fiscal_year: number;
  mar_test_area: string;
  control_theme: string;
  control_count: number | null;
  au_scope: string | null;
  test_type: MARTestType | null;
  test_type_display: string | null;
  sample_size: number | null;
  quarter: string | null;
  assigned_to: string | null;
  estimated_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── AuditPlanSummary ──────────────────────────────────────────────────────────

export interface AuditPlanSummary {
  id: number;
  fiscal_year: number;
  planned_audits: number;
  mar_required_count: number;
  non_mar_count: number;
  avg_priority_score: string;
  estimated_total_hours: number;
  coverage_notes: string | null;
  generated_at: string;
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface BulkImportResult {
  status: 'success' | 'error';
  results: {
    entities: { created: number; updated: number };
    plan_years: { created: number; updated: number };
    controls: { created: number; updated: number };
    grc_themes: { created: number; updated: number };
    mar_engagements: { created: number; updated: number };
  };
}
