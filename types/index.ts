export type RegistrationStatus = "Active" | "Suspended" | "Expired" | "DeRegistered";

export interface Contractor {
  crs_number: string;
  contractor_name: string;
  trading_name: string | null;
  registration_status: RegistrationStatus;
  pe_flag: boolean;
  province: string;
  city: string;
  expiry_date: string | null;
  source_url: string;
  captured_at: string;
}

export interface ContractorGrading {
  id: string;
  crs_number: string;
  grade_level: number;
  class_code: string;
  pe_flag: boolean;
}

export interface ContractorWithGradings extends Contractor {
  gradings: ContractorGrading[];
}

export interface CitySummary {
  province: string;
  city: string;
  count: number;
}

export interface LeafPageSummary {
  province: string;
  city: string;
  grade_level: number;
  class_code: string;
  count: number;
}

export interface HomepageStats {
  total: number;
  active: number;
  suspended: number;
  expired: number;
  provinces: number;
  cities: number;
  latest_capture: string | null;
}

export interface ProvinceStats {
  province: string;
  total: number;
  active: number;
  suspended: number;
  expired: number;
  cities: number;
}

export interface CityGradeBreakdown {
  grade_level: number;
  classes: string[];
  contractor_count: number;
}

export interface CityGradeClassPath {
  class_code: string;
  contractor_count: number;
  active_count: number;
  pe_count: number;
  has_public_leaf: boolean;
}

export interface CityGradeChooserRow {
  grade_level: number;
  contractor_count: number;
  active_count: number;
  classes: string[];
  public_leaf_count: number;
  pe_count: number;
}

export interface RelatedLeafLink {
  province: string;
  city: string;
  grade_level: number;
  class_code: string;
  count: number;
}

export interface GradeLocation {
  province: string;
  city: string;
  count: number;
}

export interface ClassSummary {
  class_code: string;
  contractor_count: number;
}

export interface EvidenceSummary {
  evidence_rows: number;
  contractors_with_evidence: number;
  source_urls: number;
  latest_capture: string | null;
}
