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
| Amenity filter keys | Prefer **Annonces / `units.amenities`** as source of truth for “our apartment”; map to scraper comp fields where possible. Parking / furnished / dishwasher are **comp-only** filters. |

---

## S8 — Annonces CSV ↔ DB ↔ scraper field map

**Source file:** `annonces actives - active ads(Appartements à louer).csv` (222 units, Sep 2026 export).  
**Encoding:** Windows-1252. Address is split across 4 columns (`street_no`, name, city, postal).

### Does the DB store amenities?

**Yes — on units, not buildings.**

- `buildings` → name, address, coords, janitor contact only.
- `units.amenities` → JSON dict seeded from the Excel/CSV via `unit_amenities.AMENITY_HEADERS`.
- Insights unit pages already read `unit.amenities` (e.g. bedrooms for bed-key matching).

### Annonces → Comp mapping (S3 filter set)

| Filter UI | Comp field | Unit amenity key | Notes |
|-----------|------------|------------------|--------|
| Heating | `heating` | `heating_included` | |
| Electricity | `electricity_included` | `electricity_included` | |
| A/C | `air_conditioning` | `air_conditioning` | |
| Balcony | `balcony` | `balcony` | |
| Laundry | `laundry_in_unit` | `washer_dryer_hookup` | Approximate (hookups vs in-unit) |
| Water | `water_included` | `hot_water_included` | Hot water on inventory |
| Fridge | `fridge_freezer` | `fridge_stove` | Combined on Annonces |
| Stove | `stove_included` | `fridge_stove` | Same inventory flag |
| Parking | `parking` | (none) | Comp-only |
| Furnished | `furnished` | (none) | Comp-only |
| Dishwasher | `dishwasher` | (none) | Comp-only |

**Not filterable yet (no Comp field):** renovated, building_laundry, backyard, internet, security_cameras.

---

## Ticket list

### Done

- [x] **S8** Field map (this doc)
- [x] **S9** Remove Pepinière from scrape + seed CSVs (verify live DB if needed)
- [x] **S2** Radius + sq ft filters (PR #109) — client-side; daily scrape stays 2 km
- [x] **S3** Amenity sidebar (Any / With / Without; unit defaults from inventory)

### Follow-ups

- **Masson** in Annonces but not in daily scrape `buildings.json`. Confirm with Steve.
- Inventory `?` / `inclus` → treat as unknown (Any), not yes.

### Next

- [ ] **S7** Room rentals / Chambre privée exclusion or bucket

### Scrape / data quality

- [ ] **S1b** Facebook multi-pass within **2 km**
- [ ] **S5** Sq ft OCR estimate (yellow badge)
- [ ] **S10** Sq ft quality gate for comparisons
- [ ] **S6** Renovation signal from photos

### Blocked on Steve

- [ ] **S4** Heating ↔ furnished (confirm meaning before code)

---

## Suggested build order

1. S9 ← done  
2. S2 ← done (merged #109)  
3. S3 ← done (this branch)  
4. **S7** ← next  
5. S1b  
6. S5 / S10 / S6  
7. S4 after Steve  

---

## Open questions for Steve (short)

1. **Heating / furnished** — compare / scrape default / only if our unit is furnished?  
2. **Parking** — OK as comps-only filter (not on Annonces)?  
3. **Room rentals** — exclude entirely or separate section?  
