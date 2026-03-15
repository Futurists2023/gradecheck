export const GRADE_THRESHOLDS: Record<number, string> = {
  1: "Up to R200,000",
  2: "Up to R650,000",
  3: "Up to R2,000,000",
  4: "Up to R6,500,000",
  5: "Up to R13,000,000",
  6: "Up to R40,000,000",
  7: "Up to R130,000,000",
  8: "Up to R400,000,000",
  9: "Unlimited",
};

export const CLASS_CODE_LABELS: Record<string, string> = {
  CE: "Civil Engineering",
  GB: "General Building",
  EP: "Electrical: Public Installations",
  EB: "Electrical: Building Installations",
  ME: "Mechanical Engineering",
  SQ: "Specialist: Piling & Foundations",
  SH: "Specialist: Structural Steelwork",
  SF: "Specialist: Formwork & Falsework",
  SO: "Specialist: Roofing & Waterproofing",
  SN: "Specialist: Painting & Decorating",
  SG: "Specialist: Glazing",
  SL: "Specialist: Landscaping",
  SK: "Specialist: Lifts & Escalators",
  SB: "Specialist: Demolition",
};

export const CLASS_CODE_SLUGS: Record<string, string> = {
  CE: "civil-engineering-ce",
  GB: "general-building-gb",
  EP: "electrical-public-installations-ep",
  EB: "electrical-building-installations-eb",
  ME: "mechanical-engineering-me",
  SQ: "specialist-piling-foundations-sq",
  SH: "specialist-structural-steelwork-sh",
  SF: "specialist-formwork-falsework-sf",
  SO: "specialist-roofing-waterproofing-so",
  SN: "specialist-painting-decorating-sn",
  SG: "specialist-glazing-sg",
  SL: "specialist-landscaping-sl",
  SK: "specialist-lifts-escalators-sk",
  SB: "specialist-demolition-sb",
};

export const PROVINCE_SLUGS: Record<string, string> = {
  "Eastern Cape": "eastern-cape",
  "Free State": "free-state",
  Gauteng: "gauteng",
  "KwaZulu-Natal": "kwazulu-natal",
  Limpopo: "limpopo",
  Mpumalanga: "mpumalanga",
  "North West": "north-west",
  "Northern Cape": "northern-cape",
  "Western Cape": "western-cape",
};

export const STATUS_LABELS = {
  Active: "Active",
  Suspended: "Suspended",
  Expired: "Expired",
  DeRegistered: "DeRegistered",
} as const;

export const ALL_GRADES = Array.from({ length: 9 }, (_, index) => index + 1);

export const SEO_QUALITY_THRESHOLDS = {
  provinceMinContractors: 10,
  provinceMinLeafPages: 1,
  cityMinContractors: 5,
  cityMinLeafPages: 1,
  leafMinContractors: 5,
  leafMinActiveContractors: 1,
  leafMinEvidenceBackedContractors: 1,
  contractorMinGradings: 1,
  gradeMinLocations: 1,
  gradeMinClasses: 1,
  classMinContractors: 5,
  classMinLeafPages: 1,
} as const;
