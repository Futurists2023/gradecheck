GradeVerify PRD

1. Overview
   Product name
   GradeVerify

Product type
A CIDB contractor intelligence platform for South Africa.

Product vision
GradeVerify exists to make CIDB contractor data usable for verification, procurement research, contractor discovery, and decision support. It should help a user quickly understand whether a contractor is active, what grades and classes they hold, when their registration expires, and whether they match a specific procurement need.

Current foundation
The current proof-of-concept dataset contains 74 normalized contractors, 173 contractor grading rows, and 74 crawl-evidence rows, with zero parse errors.
​
The local data layer already exists in PostgreSQL with three main tables: contractors, contractor_gradings, and crawl_evidence.
​

Positioning
This product is not a generic business directory.
This product is an intelligence and verification tool built on top of structured contractor registry data.

2. Problem, Users, and Outcomes
   Problem statement
   CIDB contractor information is difficult to use in its raw portal form for real-world verification and procurement workflows. Users need a faster, clearer, more trustworthy way to evaluate contractors by status, grade, class, location, and registration timing.

Primary users
Procurement officers

Project managers

Tender administrators

Quantity surveyors

Contractors verifying themselves or competitors

Core user jobs
Verify whether a contractor is Active, Suspended, or Expired.

See every grade and class held by a contractor in one place.

Find contractors matching a required province, city, grade, and class.

Check expiry timing and source confidence before shortlisting a contractor.

Desired outcomes
A user can search by contractor name or CRS number and get a trustworthy answer fast.

A user can browse filtered contractor intelligence pages without needing to understand the CIDB portal.

A user can open a contractor profile and immediately understand status, grade coverage, and verification evidence.

3. Scope
   In scope for MVP
   Homepage with clear product positioning and contractor search.

Contractor profile pages.

Province and city browsing pages.

High-intent grade/class/location intelligence pages.

Verification workflow for name or CRS-number lookup.

Clear source attribution and freshness indicators.

Structured data and canonical SEO architecture.

End-to-end experience using the existing local PostgreSQL dataset.

Out of scope for MVP
Full national crawl at launch.

Contractor account claiming and billing.

Procurement team collaboration features.

CSV/PDF export workflows.

Email or WhatsApp alerts.

Full interactive CIDB calculator product.

Non-goals
Do not build a yellow-pages style listing site.

Do not generate thin pages that only repeat raw rows.

Do not treat SEO traffic as the product; SEO is only an acquisition layer.

4. Product Requirements
   Core product principle
   Every important page must help the user interpret the data, not just display it.

Required experiences
A. Homepage
Must:

Explain what GradeVerify is in plain language.

Let users search by contractor name or CRS number.

Provide fast access to browse by province, city, grade, and class.

Establish trust with source disclosure and update context.

B. Contractor profile page
Must:

Show contractor name, CRS number, province, city, registration status, PE flag, expiry date, and source link.

Show all gradings held by the contractor, not only the first grading.

Present the information as a verification view, not as a generic listing card.

The normalized model already supports this because contractor gradings are stored separately from contractor identity, allowing one contractor to have multiple class-grade records.

C. Filtered intelligence pages
Must:

Support province, city, grade, and class combinations.

Emphasize interpretation, such as what a grade means and why the class matters.

Display contractor status and PE information clearly.

Link to canonical contractor profile pages.

D. Verification workflow
Must:

Allow users to input a contractor name or CRS number.

Return likely matches quickly.

Make it easy to validate the result against the stored source URL and captured timestamp.

E. Trust and evidence
Must:

Show source attribution on contractor pages.

Show captured or last-updated timing where available.

Avoid overwriting structured truth with vague or incomplete display language.

Data requirements
The system must treat:

contractors as the canonical entity table.

contractor_gradings as the intelligence layer for all class-grade combinations.

crawl_evidence as the provenance and audit layer.

These tables already exist locally, and the insert script creates them with indexes for contractor lookups and class/grade filtering.
​

5. Engineering, SEO, and Acceptance Criteria
   Engineering requirements
   Use a clean typed data-access layer.

Keep SQL in one query layer, not inside page components.

Design the database abstraction so local PostgreSQL can later be replaced without rewriting the app structure.

Build the MVP against the current local database first.

The current local pipeline is already re-runnable and uses ON CONFLICT DO NOTHING, which means the SWE LLM should preserve idempotent ingestion and stable schema assumptions.
​

SEO and defensibility requirements
The product must be highly defensive against Google quality penalties.

Required principles:

No thin pages.

No duplicate pages for the same contractor.

Canonical contractor profile URLs.

Clear source attribution.

Freshness signals where data timestamps exist.

Human-readable titles and descriptions.

Pages must add interpretation and utility beyond raw scraped rows.

Avoid any architecture that looks like a mass-generated low-value directory.

MVP acceptance criteria
The MVP is complete when:

A user can search real contractors from the current sample dataset.

A contractor profile page renders real data with all gradings.

At least one real filtered intelligence page works end-to-end.

The product clearly feels like a verification/intelligence tool rather than a directory.

All important pages have sound metadata, canonical structure, and source disclosure.

The existing local data is used successfully without requiring a new scrape.

Data acceptance criteria
The current proof dataset is considered valid for MVP build work because it already contains 74 contractors, 173 grading rows, and zero parse errors.
​
The local ingestion layer is considered valid because it already reads normalized JSON, creates the schema if needed, and inserts contractors, gradings, and crawl evidence into PostgreSQL.
​
