# GradeVerify URL Slug Architecture

## 1. Purpose

This document defines the canonical URL structure for GradeVerify.

The goal is to create URLs that are:

- Easy for users to read.
- Clear about the page topic.
- Consistent across the whole product.
- Safe from duplicate-content and thin-page SEO risks.
- Scalable when the dataset grows from the current sample to a national crawl.

This project is a **CIDB contractor intelligence platform**, not a generic directory.
So the URL structure must reflect verification, procurement research, grade interpretation, and contractor intelligence.

---

## 2. SEO Principles

Google recommends using descriptive, readable words in URLs rather than opaque parameters or long ID strings.[^1][^2]
Google also recommends using hyphens instead of underscores to separate words in URLs.[^2]

### Hard rules

- Use lowercase only.
- Use hyphens only.
- Never use underscores.
- Avoid query parameters for indexable filter pages.
- Keep one canonical URL per page type.
- Keep one canonical URL per contractor profile.
- Use descriptive words, not internal abbreviations alone.
- Keep paths shallow and stable.
- Do not include dates in slugs.
- Do not generate public indexable URLs for empty or thin combinations.

---

## 3. Canonical Base Paths

These are the approved top-level namespaces.

| Page type                 | Canonical path             |
| :------------------------ | :------------------------- |
| Homepage                  | `/`                        |
| National contractor hub   | `/cidb-contractors/`       |
| Single contractor profile | `/cidb-contractor/`        |
| Verification tool         | `/verify-cidb-contractor/` |
| CIDB grades hub           | `/cidb-grades/`            |
| CIDB class codes hub      | `/cidb-class-codes/`       |
| CIDB grade table page     | `/cidb-grade-table/`       |
| Methodology page          | `/methodology/`            |
| Data updates page         | `/data-updates/`           |
| About page                | `/about-gradeverify/`      |
| Contact page              | `/contact/`                |

### Recommendation

Use `cidb` in the public slug because it aligns the path with real search language and makes the breadcrumb more informative.
Use singular `/cidb-contractor/` for entity pages and plural `/cidb-contractors/` for hubs and listings.

---

## 4. Public Hub Structure

## A. National and geography hubs

| Page type    | Canonical pattern                                | Example                                   |
| :----------- | :----------------------------------------------- | :---------------------------------------- |
| National hub | `/cidb-contractors/`                             | `/cidb-contractors/`                      |
| Province hub | `/cidb-contractors/{province-slug}/`             | `/cidb-contractors/gauteng/`              |
| City hub     | `/cidb-contractors/{province-slug}/{city-slug}/` | `/cidb-contractors/gauteng/johannesburg/` |

### Province slug dictionary

Use these exact province slugs:

- `eastern-cape`
- `free-state`
- `gauteng`
- `kwazulu-natal`
- `limpopo`
- `mpumalanga`
- `north-west`
- `northern-cape`
- `western-cape`

### City slug rules

Convert all city names to lowercase hyphenated slugs.

Examples:

- `Cape Town` → `cape-town`
- `Johannesburg` → `johannesburg`
- `Benoni` → `benoni`
- `Port Elizabeth` → `port-elizabeth`
- `eMalahleni` → `emalahleni`

### City normalization rules

- Lowercase.
- Remove punctuation.
- Replace spaces with hyphens.
- Replace `&` with `and`.
- Keep the common public spelling.

---

## B. Status hubs

| Page type           | Canonical pattern                                               | Example                                                  |
| :------------------ | :-------------------------------------------------------------- | :------------------------------------------------------- |
| Province status hub | `/cidb-contractors/{province-slug}/{status-slug}/`              | `/cidb-contractors/gauteng/active/`                      |
| City status hub     | `/cidb-contractors/{province-slug}/{city-slug}/{status-slug}/`  | `/cidb-contractors/gauteng/johannesburg/active/`         |
| Province PE hub     | `/cidb-contractors/{province-slug}/pe-contractors/`             | `/cidb-contractors/gauteng/pe-contractors/`              |
| City PE hub         | `/cidb-contractors/{province-slug}/{city-slug}/pe-contractors/` | `/cidb-contractors/gauteng/johannesburg/pe-contractors/` |

### Approved status slugs

- `active`
- `suspended`
- `expired`

### Rule

Do not create separate indexed URLs for every possible status plus every possible grade plus every possible class unless the page meets your content threshold.
If a filtered combination is too thin, redirect or canonicalize upward to the stronger parent page.

---

## C. Grade hubs

| Page type          | Canonical pattern                                          | Example                                           |
| :----------------- | :--------------------------------------------------------- | :------------------------------------------------ |
| Province grade hub | `/cidb-contractors/{province-slug}/grade-{n}/`             | `/cidb-contractors/gauteng/grade-1/`              |
| City grade hub     | `/cidb-contractors/{province-slug}/{city-slug}/grade-{n}/` | `/cidb-contractors/gauteng/johannesburg/grade-1/` |

### Rule

Always use `grade-{n}` and never a plain numeric segment like `/1/`.
This makes the URL self-explanatory.

---

## D. Class hubs

| Page type          | Canonical pattern                                             | Example                                                       |
| :----------------- | :------------------------------------------------------------ | :------------------------------------------------------------ |
| Province class hub | `/cidb-contractors/{province-slug}/{class-slug}/`             | `/cidb-contractors/gauteng/general-building-gb/`              |
| City class hub     | `/cidb-contractors/{province-slug}/{city-slug}/{class-slug}/` | `/cidb-contractors/gauteng/johannesburg/general-building-gb/` |

### Rule

Do not use raw class codes like `/gb/` as the canonical public slug.
Use full class meaning plus code.

---

## E. Grade + class leaf pages

These are the highest-intent SEO pages and should usually be the main indexable leaf pages.

| Page type                  | Canonical pattern                                                       | Example                                                               |
| :------------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| Province grade + class hub | `/cidb-contractors/{province-slug}/grade-{n}/{class-slug}/`             | `/cidb-contractors/gauteng/grade-1/general-building-gb/`              |
| City grade + class hub     | `/cidb-contractors/{province-slug}/{city-slug}/grade-{n}/{class-slug}/` | `/cidb-contractors/gauteng/johannesburg/grade-1/general-building-gb/` |

### Rule

This is the preferred canonical destination for searches like:

- CIDB Grade 1 GB contractors Johannesburg
- Grade 5 CE contractors Gauteng
- CIDB General Building contractors Cape Town

### Indexing threshold

Only generate these pages if the page has enough real value, such as:

- minimum contractor count threshold,
- meaningful explanatory copy,
- useful related links,
- and enough unique data to avoid thin content.

---

## 5. Contractor Profile URLs

Each contractor must have exactly one canonical profile URL.

| Page type          | Canonical pattern                            | Example                                                         |
| :----------------- | :------------------------------------------- | :-------------------------------------------------------------- |
| Contractor profile | `/cidb-contractor/{crs-number}-{name-slug}/` | `/cidb-contractor/10084062-african-amber-property-development/` |

### Profile slug rules

- Start with the CRS number.
- Follow with a cleaned contractor-name slug.
- Use the CRS number as the true identifier in code.
- Treat the text slug as decorative and human-readable.
- If the text slug changes later, the old URL should still resolve and 301 to the new canonical.

### Company-name cleanup rules

Remove legal suffix clutter where practical:

- `pty`
- `ltd`
- `cc`
- `pty-ltd`

### Example transformations

- `AFRICAN AMBER PROPERTY DEVELOPMENT (PTY) LTD` → `10084062-african-amber-property-development`
- `A2F TRADING (PTY) LTD` → `10248612-a2f-trading`
- `A AND T RETICULATION` → `10252418-a-and-t-reticulation`

---

## 6. Educational URL Structure

These pages support topical authority, user education, and adjacent CIDB informational search intent.

## A. Grade education

| Page type             | Canonical pattern              | Example                      |
| :-------------------- | :----------------------------- | :--------------------------- |
| Grade hub             | `/cidb-grades/`                | `/cidb-grades/`              |
| Individual grade page | `/cidb-grades/cidb-grade-{n}/` | `/cidb-grades/cidb-grade-1/` |

### Approved examples

- `/cidb-grades/cidb-grade-1/`
- `/cidb-grades/cidb-grade-5/`
- `/cidb-grades/cidb-grade-9/`

---

## B. Class code education

| Page type             | Canonical pattern                 | Example                                  |
| :-------------------- | :-------------------------------- | :--------------------------------------- |
| Class code hub        | `/cidb-class-codes/`              | `/cidb-class-codes/`                     |
| Individual class page | `/cidb-class-codes/{class-slug}/` | `/cidb-class-codes/general-building-gb/` |

---

## C. Supporting informational pages

| Page type               | Canonical pattern                      |
| :---------------------- | :------------------------------------- |
| Grade table page        | `/cidb-grade-table/`                   |
| Verification explainer  | `/how-to-verify-a-cidb-contractor/`    |
| CIDB status explainer   | `/cidb-registration-status-explained/` |
| PE contractor explainer | `/what-is-a-pe-contractor/`            |

### Reserved future slugs

Reserve these now, even if you do not build them immediately:

- `/cidb-registration-calculator/`
- `/cidb-grade-calculator/`
- `/cidb-tender-value-limits/`

---

## 7. Class Slug Dictionary

Use these exact public slugs.

| Class code | Canonical slug                         |
| :--------- | :------------------------------------- |
| CE         | `civil-engineering-ce`                 |
| GB         | `general-building-gb`                  |
| EP         | `electrical-public-installations-ep`   |
| EB         | `electrical-building-installations-eb` |
| ME         | `mechanical-engineering-me`            |
| SQ         | `specialist-piling-foundations-sq`     |
| SH         | `specialist-structural-steelwork-sh`   |
| SF         | `specialist-formwork-falsework-sf`     |
| SO         | `specialist-roofing-waterproofing-so`  |
| SN         | `specialist-painting-decorating-sn`    |
| SG         | `specialist-glazing-sg`                |
| SL         | `specialist-landscaping-sl`            |
| SK         | `specialist-lifts-escalators-sk`       |
| SB         | `specialist-demolition-sb`             |

### Rule

Always preserve the class code at the end of the slug.
That keeps the slug readable to humans and precise for regulated CIDB terminology.

---

## 8. Canonicalization Rules

Google recommends descriptive, stable URLs and warns against overly complex URL patterns that create indexing problems.[^3][^2]
So GradeVerify should enforce one canonical URL for each content target and redirect non-canonical variants.[^2]

### Required redirect behavior

- Redirect raw class-code URLs to full class-slug URLs.
- Redirect uppercase URLs to lowercase.
- Redirect old contractor name slugs to the current canonical profile slug.
- Redirect duplicate filter paths to the approved canonical path.
- Redirect trailing-slash variants according to one global standard.
- Redirect empty or thin leaf pages to the nearest useful parent page.

### Example

These should **not** all exist as separate indexable pages:

- `/cidb-contractors/gauteng/johannesburg/grade-1/gb/`
- `/cidb-contractors/gauteng/johannesburg/grade-1/general-building/`
- `/cidb-contractors/gauteng/johannesburg/grade-1/general-building-gb/`

Only this should be canonical:

- `/cidb-contractors/gauteng/johannesburg/grade-1/general-building-gb/`

---

## 9. Noindex and Non-Public Paths

These paths should not be indexable:

- Internal search results pages with arbitrary query strings.
- Claim-profile flows.
- User account pages.
- Empty filtered combinations.
- Admin tools.
- Internal testing routes.
- API routes.

### Suggested non-public namespaces

- `/claim/`
- `/account/`
- `/admin/`
- `/api/`
- `/internal/`

---

## 10. Final Recommended Launch Set

If you want the correct first-wave URL set for MVP, launch these page patterns first:

### Core public pages

1. `/`
2. `/cidb-contractors/`
3. `/cidb-contractors/{province-slug}/`
4. `/cidb-contractors/{province-slug}/{city-slug}/`
5. `/cidb-contractors/{province-slug}/{city-slug}/grade-{n}/`
6. `/cidb-contractors/{province-slug}/{city-slug}/grade-{n}/{class-slug}/`
7. `/cidb-contractor/{crs-number}-{name-slug}/`
8. `/verify-cidb-contractor/`
9. `/cidb-grades/`
10. `/cidb-grades/cidb-grade-{n}/`
11. `/cidb-class-codes/`
12. `/cidb-class-codes/{class-slug}/`
13. `/cidb-grade-table/`

### Second-wave pages

14. `/cidb-contractors/{province-slug}/{status-slug}/`
15. `/cidb-contractors/{province-slug}/{city-slug}/{status-slug}/`
16. `/cidb-contractors/{province-slug}/pe-contractors/`
17. `/cidb-contractors/{province-slug}/{city-slug}/pe-contractors/`
18. `/how-to-verify-a-cidb-contractor/`
19. `/cidb-registration-status-explained/`
20. `/what-is-a-pe-contractor/`

---

## 11. Implementation Notes for SWE LLM

### Slug generation

Build centralized helpers for:

- `slugifyProvince(province)`
- `slugifyCity(city)`
- `classCodeToSlug(classCode)`
- `contractorToProfileSlug(crsNumber, contractorName)`

### Reverse mapping

Also build reverse mappers for:

- `provinceSlugToName(slug)`
- `classSlugToCode(slug)`
- `gradeSegmentToNumber(segment)`

### Validation

Reject invalid public route params early:

- unknown province slug,
- unknown class slug,
- invalid grade number,
- malformed contractor slug.

### Rendering rule

Do not generate public pages for combinations that fail the minimum content threshold.

If you want, I can now create the follow-up document: **TypeScript slug helper spec + redirect matrix** for the SWE LLM.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

[^2]: https://developers.google.com/search/docs/crawling-indexing/url-structure

[^3]: https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites

[^4]: https://support.google.com/webmasters/thread/200231450/proper-url-structure-format?hl=en

[^5]: https://www.keywordinsights.ai/blog/url-structure-best-practices/

[^6]: https://www.linkedin.com/pulse/url-structure-best-practices-google-search-aman-jain-ubxxf

[^7]: https://www.briskon.com/blog/best-practices-for-seo-friendly-url-structure/

[^8]: https://www.searchenginejournal.com/are-hyphens-in-domain-names-okay-with-google/414691/

[^9]: https://www.medresponsive.com/blog/google-updates-url-structure-best-practices-guidelines/

[^10]: https://www.scribd.com/document/491838286/02-Google-SEO-starter-guide

[^11]: https://www.siteguru.co/seo-academy/underscores-hyphens

[^12]: https://proof3.co/insights/url-structure-best-practices-for-seo-friendly-urls

[^13]: https://www.stephanspencer.com/underscores-still-not-word-separators/

[^14]: https://dev.to/canburaks/a-beginners-guide-to-structure-blog-post-urls-leg

[^15]: https://support.google.com/webmasters/thread/197062651/i-have-underscores-on-my-url-should-i-migrate-to-hyphens-for-best-seo-practices?hl=en
