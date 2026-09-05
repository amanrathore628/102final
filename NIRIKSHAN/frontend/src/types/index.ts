export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'MP' | 'District Officer' | 'State Officer' | 'Ministry Officer' | 'Administrator';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}


export interface WorkSummary {
  id: number;
  priority: 'High' | 'Medium' | 'Low';
  work_code: string;
  work_name: string;
  category: string;
  state: string;
  district: string;
  vendor: string;
  sanctioned_amount: number;
  expenditure: number;
  utilization_pct: number;
  risk_score: number;
  risk_level: RiskLevel;
  status: string;
  days_since_sanction: number;
}

export interface SignalBreakdown {
  signal_key: string;
  label: string;
  raw_score: number;
  weight_pct: number;
  contribution: number;
  status: string;
}

export interface WorkDetail {
  id: number;
  work_code: string;
  project_name: string;
  category: string;
  state: string;
  district: string;
  constituency: string;
  mp_name: string;
  vendor: string;
  executing_agency: string;
  sanctioned_amount: number;
  expenditure: number;
  utilization_pct: number;
  completion_pct: number;
  days_since_sanction: number;
  status: string;
  latitude: number;
  longitude: number;
  sanction_date: string;
  risk_assessment: {
    composite_score: number;
    risk_level: RiskLevel;
    price_score: number;
    price_weight: number;
    iqr_score: number;
    iqr_weight: number;
    benford_score: number;
    benford_weight: number;
    hhi_score: number;
    hhi_weight: number;
    photo_score: number;
    photo_weight: number;
    explanation: string;
    disclaimer: string;
  };
  review_case: {
    id: number | null;
    status: string;
    priority: string;
    assigned_to: string;
    age_days: number;
  };
  items: Array<{
    id: number;
    item_name: string;
    category: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_amount: number;
  }>;
  photos: Array<{
    id: number;
    url: string;
    stage: string;
    timestamp: string;
    latitude: number;
    longitude: number;
  }>;
  timeline: Array<{
    title: string;
    date: string;
    actor: string;
    status: string;
  }>;
  documents: Array<{
    title: string;
    type: string;
    size?: string;
    count?: number;
    date: string;
  }>;
}

export interface RiskEvidenceData {
  work_id: number;
  work_code: string;
  work_name: string;
  district: string;
  state: string;
  sanctioned_amount: number;
  expenditure: number;
  composite_score: number;
  risk_level: RiskLevel;
  module_1_price: {
    score: number;
    items_analyzed: number;
    avg_variance_pct: number;
    high_variance_items: number;
    evidence_table: Array<{
      item_name: string;
      reported_price: number;
      gem_reference_price: number | null;
      quantity: number;
      unit: string;
      absolute_difference: number;
      variance_pct: number;
      match_confidence: number;
      risk_badge: string;
    }>;
    explanation: string;
  };
  module_2_iqr: {
    score: number;
    observed_value: number;
    median: number;
    q1: number;
    q3: number;
    iqr: number;
    lower_bound: number;
    upper_bound: number;
    outlier_status: string;
    outlier_level: string;
    explanation: string;
  };
  module_3_benford: {
    score: number;
    mad: number;
    deviation_status: string;
    distribution: Array<{
      digit: number;
      expected_pct: number;
      observed_pct: number;
      count: number;
    }>;
    explanation: string;
  };
  module_4_hhi: {
    score: number;
    hhi_score: number;
    concentration_level: string;
    vendor_shares: Array<{
      vendor_name: string;
      expenditure: number;
      share_pct: number;
    }>;
    target_vendor_share: number;
    explanation: string;
  };
  module_5_photo: {
    score: number;
    photo_similarity_pct: number;
    text_similarity_pct: number;
    geo_distance_m: number;
    geo_relationship: string;
    combined_confidence: string;
    explanation: string;
  };
  evidence_summary: string;
  audit_evidence: Array<{
    id: number;
    timestamp: string;
    actor: string;
    role: string;
    description: string;
  }>;
}

export interface ReviewQueueItem {
  id: number;
  work_id: number;
  priority: string;
  work_code: string;
  work_name: string;
  district: string;
  risk_score: number;
  risk_level: RiskLevel;
  signals_summary: string;
  signals_list: string[];
  assigned_to: string;
  age_days: number;
  status: string;
  expenditure: number;
  sanctioned_amount: number;
}

export interface GeoDistrict {
  id: number;
  district_name: string;
  state_name: string;
  total_works: number;
  total_expenditure_cr: number;
  flagged_works: number;
  high_risk_works: number;
  utilization_pct: number;
  risk_score: number;
  top_signal: string;
  lat: number;
  lng: number;
}

export interface DuplicatePairItem {
  id: number;
  pair_id: string;
  photo_similarity_pct: number;
  text_similarity_pct: number;
  geo_distance_m: number;
  combined_confidence: string;
  status: string;
  work_a: {
    id: number;
    work_code: string;
    project_name: string;
    district: string;
    state: string;
    sanctioned_amount: number;
    expenditure: number;
    sanction_date: string;
    latitude: number;
    longitude: number;
    photo_url: string;
  };
  work_b: {
    id: number;
    work_code: string;
    project_name: string;
    district: string;
    state: string;
    sanctioned_amount: number;
    expenditure: number;
    sanction_date: string;
    latitude: number;
    longitude: number;
    photo_url: string;
  };
  evidence: {
    phash_result: string;
    distance_result: string;
    text_similarity: string;
    metadata_comparison: string;
    date_comparison: string;
  };
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  full_timestamp: string;
  user: string;
  role: string;
  action: string;
  work_id: string;
  work_name: string;
  details: string;
  previous_state: string;
  new_state: string;
  full_event_text: string;
  evidence_link?: string | null;
}
