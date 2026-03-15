You are a senior full-stack engineer. Your task is to scaffold a production-ready Next.js 14 project called **GradeVerify** — a CIDB contractor intelligence registry for South Africa.

**Do not invent data. Do not use mock data. All data comes from a local PostgreSQL database already populated with real CIDB contractor records.**

---

### Tech stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Local PostgreSQL (will migrate to Supabase later — abstract the DB layer from day one)
- **SEO:** next-seo + JSON-LD structured data via `next/script`
- **Sitemap:** next-sitemap
- **Analytics:** Plausible (script tag only, no SDK)
- **Package manager:** npm

---

### Database schema (already exists locally)

```sql
-- contractors (74 rows)
crs_number          TEXT PRIMARY KEY
contractor_name     TEXT
trading_name        TEXT (nullable)
registration_status TEXT  -- 'Active' | 'Suspended' | 'Expired'
pe_flag             BOOLEAN
province            TEXT
city                TEXT
expiry_date         DATE (nullable)
source_url          TEXT
captured_at         TIMESTAMPTZ

-- contractor_gradings (173 rows)
id          TEXT PRIMARY KEY  -- e.g. '10084062-1'
crs_number  TEXT  -- FK → contractors
grade_level INTEGER  -- 1–9
class_code  TEXT  -- e.g. 'CE', 'GB', 'EP', 'ME', 'EB', 'SQ', 'SH', 'SF', 'SO', 'SN', 'SG', 'SL', 'SK', 'SB'
pe_flag     BOOLEAN
```

---

### Environment variables

Create a `.env.local` file with:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=cidb_contractors
PGUSER=postgres
PGPASSWORD=your_password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=GradeVerify
```

---

### Project structure to scaffold

```
gradeVerify/
├── app/
│   ├── layout.tsx                              ← Root layout, global nav, footer
│   ├── page.tsx                                ← Homepage
│   ├── contractor/
│   │   └── [slug]/
│   │       └── page.tsx                        ← Contractor profile page
│   ├── contractors/
│   │   ├── page.tsx                            ← National directory index
│   │   └── [province]/
│   │       ├── page.tsx                        ← Province hub
│   │       └── [city]/
│   │           ├── page.tsx                    ← City index
│   │           └── [grade]/
│   │               └── [class]/
│   │                   └── page.tsx            ← Leaf page (primary SEO page)
│   ├── grades/
│   │   ├── page.tsx                            ← Grade hub
│   │   └── [grade-slug]/
│   │       └── page.tsx                        ← Grade explanation page
│   ├── verify/
│   │   └── page.tsx                            ← Free verification tool
│   └── not-found.tsx                           ← Custom 404
├── components/
│   ├── ui/                                     ← shadcn/ui components
│   ├── ContractorCard.tsx
│   ├── ContractorTable.tsx
│   ├── GradeBadge.tsx
│   ├── StatusBadge.tsx
│   ├── PEBadge.tsx
│   ├── ExpiryCountdown.tsx
│   ├── BreadcrumbNav.tsx
│   ├── SiteHeader.tsx
│   └── SiteFooter.tsx
├── lib/
│   ├── db.ts                                   ← DB connection (pg Pool, abstracted)
│   ├── queries.ts                              ← All SQL queries as typed functions
│   ├── utils.ts                                ← Slug helpers, formatters
│   └── constants.ts                            ← Grade thresholds, class code labels
├── types/
│   └── index.ts                                ← Shared TypeScript interfaces
├── public/
│   └── robots.txt
├── next.config.ts
├── next-sitemap.config.js
└── tailwind.config.ts
```

---

### Step 1 — Types (`types/index.ts`)

```typescript
export interface Contractor {
  crs_number: string;
  contractor_name: string;
  trading_name: string | null;
  registration_status: "Active" | "Suspended" | "Expired";
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
```

---

### Step 2 — Database layer (`lib/db.ts` and `lib/queries.ts`)

**`lib/db.ts`** — connection pool, abstracted so it can be swapped for Supabase client later:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export default pool;
```

**`lib/queries.ts`** — write these typed query functions, each returns typed results, never raw SQL in components:

```typescript
// 1. Get single contractor with all gradings
getContractorBySlug(slug: string): Promise<ContractorWithGradings | null>
// slug format: '[crs_number]-[contractor-name-kebab-case]'
// parse crs_number from slug prefix, query by crs_number

// 2. Get contractors for leaf page (province + city + grade + class)
getContractorsByFilter(params: {
  province: string
  city: string
  grade_level: number
  class_code: string
}): Promise<ContractorWithGradings[]>

// 3. Get all contractors for a city
getContractorsByCity(province: string, city: string): Promise<ContractorWithGradings[]>

// 4. Get all contractors for a province
getContractorsByProvince(province: string): Promise<ContractorWithGradings[]>

// 5. Get all contractors (national index)
getAllContractors(): Promise<Contractor[]>

// 6. Get all unique province + city combinations
getAllCities(): Promise<{ province: string; city: string; count: number }[]>

// 7. Get all unique province + city + grade + class combinations with count >= 5
getAllLeafPages(): Promise<{
  province: string
  city: string
  grade_level: number
  class_code: string
  count: number
}[]>

// 8. Search by CRS number or name (for verify tool)
searchContractors(query: string): Promise<Contractor[]>

// 9. Get stats for homepage
getStats(): Promise<{
  total: number
  active: number
  suspended: number
  expired: number
  provinces: number
  cities: number
}>
```

All queries must use parameterised inputs (`$1`, `$2`) — never string interpolation.

---

### Step 3 — Constants (`lib/constants.ts`)

```typescript
// CIDB grade rand value thresholds (official CIDB values)
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

// Full class code labels
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

// Slug helpers
export const provinceToSlug = (province: string): string =>
  province
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const slugToProvince: Record<string, string> = {
  gauteng: "Gauteng",
  "kwazulu-natal": "KwaZulu-Natal",
  "western-cape": "Western Cape",
  // extend as crawl scales
};
```

---

### Step 4 — Core components

Build each component in order. All components are server components unless they require client interactivity.

---

**`components/StatusBadge.tsx`**

- Props: `status: 'Active' | 'Suspended' | 'Expired'`
- Active → green pill
- Suspended → amber pill
- Expired → red pill
- Use shadcn/ui `Badge` component

---

**`components/GradeBadge.tsx`**

- Props: `grade_level: number`, `class_code: string`
- Renders: `Grade [N] · [Class Full Name]` as a styled card
- Show rand threshold below in smaller text
- Use `GRADE_THRESHOLDS` and `CLASS_CODE_LABELS` from constants

---

**`components/PEBadge.tsx`**

- Props: `pe_flag: boolean`
- If true: render a distinct badge "PE Contractor" with a tooltip: "Potentially Emerging Enterprise — qualifies for preferential procurement"
- If false: render nothing

---

**`components/ExpiryCountdown.tsx`**

- Props: `expiry_date: string | null`, `status: string`
- If Active and expiry > today: "Expires in X months" (green if > 6 months, amber if ≤ 6 months)
- If Expired: "Expired [X months/years] ago" (red)
- If Suspended: "Suspended — Expiry: [date]" (amber)
- If null: "Expiry date unavailable"

---

**`components/BreadcrumbNav.tsx`**

- Props: `items: { label: string; href: string }[]`
- Renders a breadcrumb trail with JSON-LD `BreadcrumbList` schema inline
- Final item is not a link (current page)

---

**`components/ContractorTable.tsx`**

- Props: `contractors: ContractorWithGradings[]`
- Server component rendering an HTML table
- Columns: Contractor Name (linked to profile) | Status | Grades Held | PE | Expiry | City
- "Grades Held" shows all grade badges for that contractor, not just the first one
- Sortable client-side by name and status using a lightweight client wrapper
- Shows "No contractors found" state gracefully

---

### Step 5 — Page implementations

---

**Contractor profile page — `app/contractor/[slug]/page.tsx`**

```typescript
// generateStaticParams: fetch all contractors, return slug array
// slug format: `${crs_number}-${contractor_name_kebab}`

// generateMetadata:
// title: `[Contractor Name] — CIDB Grade [highest grade] [primary class] | GradeVerify`
// description: `Verify [Contractor Name] CIDB registration. CRS [number]. Status: [Active/Expired/Suspended]. Grade [X] [Class]. Located in [City], [Province].`
// canonical: absolute URL

// Page layout (top to bottom):
// 1. BreadcrumbNav
// 2. H1: contractor_name
// 3. Status badge + PE badge inline
// 4. CRS Number: [number] (styled as a code/label)
// 5. Location: [City], [Province]
// 6. ExpiryCountdown
// 7. "Contractor Grades" section — one GradeBadge per grading row
// 8. "Verification" panel:
//    - "Data sourced from the CIDB Register of Contractors"
//    - "Captured: [captured_at formatted]"
//    - External link: "Verify on CIDB portal →" linking to source_url
// 9. JSON-LD: Organization schema

// JSON-LD shape:
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": contractor_name,
  "identifier": crs_number,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": city,
    "addressRegion": province,
    "addressCountry": "ZA"
  },
  "description": `CIDB registered contractor. Grade [X] [Class]. Status: [status].`
}
```

---

**Leaf page — `app/contractors/[province]/[city]/[grade]/[class]/page.tsx`**

```typescript
// generateStaticParams:
// Call getAllLeafPages()
// Filter to count >= 5
// Return array of { province, city, grade, class } as slugs

// generateMetadata:
// title: `Grade [N] [Class Full Name] Contractors in [City], [Province] | GradeVerify`
// description: `Find verified Grade [N] [Class Full Name] CIDB contractors in [City], [Province]. [Count] registered contractors. Active, PE-flagged and expired listings.`

// Page layout:
// 1. BreadcrumbNav: Home → Contractors → [Province] → [City] → Grade [N] → [Class]
// 2. H1: "Grade [N] [Class Full Name] Contractors in [City], [Province]"
// 3. Short intro paragraph (2–3 sentences):
//    - What this grade + class means
//    - Rand value threshold
//    - Number of contractors found
// 4. Stats row: [Total] contractors | [Active count] Active | [PE count] PE contractors
// 5. ContractorTable with filtered results
// 6. "What is a Grade [N] [Class] contractor?" expandable section
//    - Use GRADE_THRESHOLDS and CLASS_CODE_LABELS for content
//    - JSON-LD FAQPage schema
// 7. Related pages section:
//    - Other grades for same class in this city
//    - Other classes for same grade in this city
//    - Link to parent city page

// JSON-LD: BreadcrumbList + FAQPage + ItemList
```

---

**City index page — `app/contractors/[province]/[city]/page.tsx`**

```typescript
// Shows aggregate stats for the city
// Grade breakdown table: Grade | Classes available | Contractor count
// Links to all leaf pages that meet >= 5 threshold
// ContractorTable showing all contractors in city (all statuses)
// JSON-LD: BreadcrumbList
```

---

**Homepage — `app/page.tsx`**

```typescript
// Above fold:
// H1: "Verify any CIDB contractor in South Africa"
// Subheading: "Search the Register of Contractors by name, CRS number, grade, or location"
// Search bar (client component) — searches by name or CRS number, calls /api/search
// Stats bar: [X] Contractors | [X] Active | [X] Provinces | Last updated [date]

// Below fold:
// "Browse by Province" — grid of province cards linking to province hub pages
// "Browse by Grade" — grid of grade cards 1–9 with rand thresholds
// "How it works" — 3-step explanation (Search → Verify → Confirm)
// JSON-LD: WebSite + SearchAction schema
```

---

**Grade explanation page — `app/grades/[grade-slug]/page.tsx`**

```typescript
// Static content page, no DB query needed for content
// grade-slug format: 'cidb-grade-1', 'cidb-grade-5', etc.

// Page layout:
// H1: "What is a CIDB Grade [N] Contractor?"
// Intro paragraph: official definition
// Rand value threshold table (all grades for context, current highlighted)
// Class codes available at this grade
// "Find Grade [N] contractors near you" — links to city pages filtered by grade
// JSON-LD: FAQPage + BreadcrumbList
```

---

**Verify tool — `app/verify/page.tsx`**

```typescript
// Client component
// Search input: CRS number or contractor name
// On submit: calls GET /api/search?q=[query]
// Results: shows ContractorCard for each match
// If no match: "No contractor found. Verify directly on the CIDB portal →"
// CTA below results: "Need a full report? Sign up →" (placeholder for future paid tier)
```

---

### Step 6 — API route

**`app/api/search/route.ts`**

```typescript
// GET /api/search?q=[query]
// Calls searchContractors(query) from queries.ts
// Returns JSON array of Contractor objects
// Rate limit: basic — return 400 if query < 2 characters
// Return max 20 results
```

---

### Step 7 — Root layout (`app/layout.tsx`)

- `SiteHeader` — logo "GradeVerify", nav links: Contractors | Verify | Grades | About
- `SiteFooter` — "Data sourced from CIDB Register of Contractors. GradeVerify is an independent verification tool and is not affiliated with CIDB."
- Plausible analytics script tag (domain: `gradeverify.co.za`)
- Global metadata defaults via `generateMetadata`
- `robots` meta: index, follow on all public pages

---

### Step 8 — SEO configuration

**`next-sitemap.config.js`:**

```javascript
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  generateRobotsTxt: true,
  exclude: ["/claim/*", "/api/*"],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/api/", "/claim/"] },
    ],
  },
};
```

**`public/robots.txt`:** (overridden by next-sitemap at build, but scaffold as fallback)

---

### Step 9 — `next.config.ts`

```typescript
const nextConfig = {
  // Redirect non-slug city/grade URLs to canonical form
  async redirects() {
    return [
      {
        source: "/contractors/:province/:city",
        has: [{ type: "query", key: "grade" }],
        destination: "/contractors/:province/:city",
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
```

---

### Definition of done

- `npm run dev` starts without errors
- Homepage loads with real stats from PostgreSQL
- `/contractor/[slug]` renders a real contractor profile with all gradings
- At least one leaf page renders with a real filtered contractor table

```
- All pages have correct `<title>`, `<meta description>`, and canonical tags
```

- All pages have valid JSON-LD structured data (validate with Google Rich Results Test)
- No TypeScript errors
- No raw SQL outside of `lib/queries.ts`
- `npm run build` completes successfully with static pages generated
