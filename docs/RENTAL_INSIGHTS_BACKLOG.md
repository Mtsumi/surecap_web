# Rental Insights backlog (Steve · Sep 2026)

Living product backlog for **admin Rental Insights** (`/admin/insights`) and the scrape pipeline that feeds it.

| Layer | Repo |
|--------|------|
| Insights UI + filters | [surecap_web](https://github.com/Mtsumi/surecap_web) |
| Daily scrape / comps DB | `selenium_scrape` (scraper.montrealliving.info) |
| Unit inventory + `units.amenities` JSON | API (`surecap_dossier_search` / deploy) + Dropbox Annonces workbook |

**Not in scope:** the public Django scraper form UI (external tab). Filters and comparison UX live on Insights pages only.

---

## Decisions locked (this thread)

| Topic | Decision |
|--------|----------|
| Daily radius | Keep **2 km**. Missing Facebook listings from a wider map zoom is **not** acceptable. |
| Wider scrape | Do **not** change daily to 5–10 km until we have a multi-pass FB strategy. |
| Filters surface | `/admin/insights`, building detail, unit detail — **not** the external scraper form. |
| Pepinière | Remove from scrape portfolio **and** seed lists everywhere. Already absent from Steve’s Annonces CSV. |
| Heating ↔ furnished | **Ask Steve** before implementing (see open questions). |
| Amenity filter keys | Prefer **Annonces / `units.amenities`** as source of truth for “our apartment”; map to scraper comp fields where possible. |

---

## S8 — Annonces CSV ↔ DB ↔ scraper field map

**Source file:** `annonces actives - active ads(Appartements à louer).csv` (222 units, Sep 2026 export).  
**Encoding:** Windows-1252. Address is split across 4 columns (`street_no`, name, city, postal).

### Does the DB store amenities?

**Yes — on units, not buildings.**

- `buildings` → name, address, coords, janitor contact only.
- `units.amenities` → JSON dict seeded from the Excel/CSV via `unit_amenities.AMENITY_HEADERS` (canonical keys below).
- Insights unit pages already read `unit.amenities` (e.g. bedrooms for bed-key matching).

### Annonces columns (inventory)

| Annonces header | Canonical key (`units.amenities`) | Fill (≈) | Notes |
|-----------------|-------------------------------------|----------|--------|
| grandeur | `size` | high | e.g. 3.5 |
| période de location | `lease_period` | high | annuelle |
| chambres | `bedrooms` | 222/222 | |
| SDB | `bathrooms` | 222/222 | |
| superficie habitable | `living_area_sqft` | **218/222** | Critical for comps |
| étage | `floor` | high | |
| entrée laveuse sécheuse | `washer_dryer_hookup` | ~71 oui / many `?` | Hookups, not in-unit laundry |
| buanderie dans édifice? | `building_laundry` | ~160 oui | |
| frigo + cuisinière | `fridge_stove` | mixed oui/inclus/`?` | Combined fridge+stove |
| rénové | `renovated` | ~144 oui | Inventory-only today |
| chauffage inclus | `heating_included` | **8 oui** / 213 non | Rare in portfolio |
| eau chaude inclus | `hot_water_included` | 8 oui | |
| électricité inclus | `electricity_included` | 8 oui | |
| air climatisé | `air_conditioning` | ~11 oui | |
| cour arrière | `backyard` | ~24 oui | |
| balcon | `balcony` | ~155 oui | |
| internet | `internet` | ~66 oui/inclus | |
| caméras sécurité | `security_cameras` | ~116 oui | |

**Not in Annonces at all:** parking, parking type, dishwasher, furnished/meublé, microwave, bike parking, concierge.

**Pepinière:** not in this file (sections: Masson, Lachine, Duff, CDN, Plateau, Mistral). Streets include St-Joseph / 10e avenue as single rows.

### Scraper / Insights `Comp` fields vs Annonces

| Comp / CSV export field | In Annonces? | Comparison note |
|-------------------------|--------------|-----------------|
| `square_feet` | ✅ `living_area_sqft` | Strong — both sides usually present |
| `heating` | ✅ `heating_included` | Map names; rare “oui” on inventory |
| `electricity_included` | ✅ | |
| `air_conditioning` | ✅ | |
| `balcony` | ✅ | |
| `laundry_in_unit` | ⚠️ hookups / building laundry only | Don’t equate 1:1 without care |
| `fridge_freezer` / `stove_included` | ⚠️ combined `fridge_stove` | Split or treat as package |
| `water_included` | ⚠️ hot water only | |
| `parking` / `parking_type` | ❌ | Scraper-only — useful for comps, not unit-side match |
| `furnished` | ❌ | Scraper-only |
| `dishwasher` | ❌ | Scraper-only |
| `renovated` | ✅ Annonces | Not on Insights `Comp` type yet |
| `building_laundry`, `backyard`, `internet`, `security_cameras` | ✅ Annonces | Not all on Insights chips yet |

**Verdict for Kijiji-style filters (S3):** Start sidebar from **intersection + inventory-first keys** (heating, electricity, AC, balcony, laundry variants, renovated, sq ft band, distance). Parking/furnished as **comp-only** filters (filter the market set, not “match my unit”).

---

## Ticket list

### Done / in progress

- [x] **S8** Field map (this doc) — Annonces ↔ `units.amenities` ↔ Insights comps
- [x] **S9** Remove Pepinière from scrape `buildings.json` (9 buildings left), `buildings_w*.csv` / `.xlsx`, API `data/buildings.csv` copies, scraper docs — **still verify** live Postgres has no Pepinière building (deactivate/delete if present) and Insights cards after next deploy/sync
- [x] **S2** Radius + sq ft filters on Insights index / building / unit (client-side; daily scrape stays 2 km; UI note)

### Follow-ups noticed in S8 audit

- **Masson** is in Annonces (32 units) but **not** in daily scrape `buildings.json`. Confirm with Steve whether Masson should be scraped for comps.
- Inventory rows still use `?` / `0` / `inclus` inconsistently — filter UX should treat `?` as unknown (don’t-care / without-bucket), not yes.

### Next (Insights UX)

- [ ] **S3** Amenity sidebar (Kijiji-like): require / don’t care / “without” (missing counts as without); unit page defaults from `unit.amenities`

### Scrape / data quality

- [ ] **S1b** Facebook multi-pass / multi-scrape within **2 km** so map zoom does not hide listings (future; do not widen daily radius)
- [ ] **S7** Exclude or bucket Kijiji “Room rentals / Chambre privée” so roommate ads don’t inflate BR comps
- [ ] **S5** Sq ft: better extraction + optional OCR estimate (yellow “estimated” badge); never treat estimate as ground truth in medians without flag
- [ ] **S10** Sq ft quality gate for $/sqft and tight comparison cohorts
- [ ] **S6** Renovation signal from photos (QC styling) — label as model output

### Blocked on Steve

- [ ] **S4** Heating included ↔ furnished default — confirm meaning before code:
  1. Compare furnished comps as heating-included?
  2. Default scrape filter to furnished-only?
  3. If *our* unit is furnished, only compare furnished listings?

---

## Suggested build order

1. **S9** (ops cleanup) ← done  
2. **S2** (radius + sq ft filters) ← done  
3. **S3** on Insights (amenity sidebar)  
4. **S7** (cheap data quality)  
5. **S1b** (FB coverage without increasing radius)  
6. **S5 / S10 / S6** (harder)  
7. **S4** after Steve answers  

---

## Open questions for Steve (short)

1. **Heating / furnished** — which of (1)(2)(3) above?  
2. **Parking** — Annonces has no parking column; OK to filter comps by parking without matching “our unit”?  
3. **Room rentals** — exclude from Insights comps entirely, or separate section?  
