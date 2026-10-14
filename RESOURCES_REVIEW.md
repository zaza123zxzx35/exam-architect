# Resources review list (Phase D)

Generated from live source comparison on 2026-10-14. **No URLs were invented or reconstructed.** Incomplete / unmatched entries are preserved here for human review.

## Upstream English video library

| Metric | Count |
|---|---|
| Videos in workspace `src/data/videoData.js` | 39 |
| Videos in upstream `kru-phuchuay-english-2569` | 39 |
| Missing from workspace | **0** |
| Extra in workspace | **0** |
| Malformed `http(s)` URLs in video seed | **0** |

Titles, source URLs, and category strings for the English app video seed appear intact versus upstream.

## Duplicate video source URLs (same URL, multiple entries)

Preserve both until a human decides merge vs intentional reuse.

| URL | Entry IDs | Notes |
|---|---|---|
| `https://www.facebook.com/share/v/19Mijy9p3L/` | `lady-k2-87`, `lady-k2-88` | Ep8.7 and Ep8.8 share the same link in seed data |
| `https://www.facebook.com/share/v/18nPZY8JEy/` | `lady-k2-e6`, `lady-k1-e6` | Same special-case episode listed under two category labels |

## HTML planner links not present in video library

From `Deployment-kru-phuchuay-plan-2569/index.html`: **66** unique absolute links; **38** are **not** in `videoData.js`.

**M2 update:** All HTML planner links are now imported into `src/data/htmlPlannerData.js` and listed on `/resources` with status flags. Unique URLs not in English `videoData` = **43** (Phase D’s 38 plus importantLinks / fuller inventory). Do not drop them.

### Categories of unmatched HTML links

1. **i-test.kruphuchuay.com quiz deep links** (many include personal `u_id` query param in the HTML source — must be stripped on import; values not listed here).
2. **Facebook post / share URLs** used as LIVE/VOD task links (not all mirrored as video catalog rows).
3. **Important links** (not videos):

| Name | URL |
|---|---|
| Timetable ตัวเต็ม (เว็บไซต์) | `https://kru-phuchuay-english-2569.vercel.app/timetable` |
| Dashboard (เก็บคะแนน Quiz) | `https://kru-phuchuay-english-2569.vercel.app/` |
| ตรวจประกาศรับสมัคร (HRMS.OBEC) | `https://hrms.obec.go.th/` |
| เฉลยกฎหมายข้าราชการที่ดี (Google Drive) | `https://drive.google.com/file/d/1bflOPJkhXV_jn7/view` |
| เฉลยเล่มแดงกฎหมายครู (Google Drive) | `https://drive.google.com/file/d/1u5d9UzKGG7X4TzJbe6LRIUJf4M-WDUmW/view` |

**Status:** Answer-key Drive links exist only in the HTML planner today. They are **not** yet surfaced in the unified SPA (blocked on M2 Resources port). Treat as **incomplete import**, not lost upstream English data.

## Course catalog (HTML only — not yet ported)

6 course blurbs in HTML `courses[]` (อ.นนท์ VIP tracks + ครูเลดี้เก๋ VIP). No dedicated SPA page yet.

## English Major vs ภาค ก grouping

Official exam structure in both apps:

- **ภาค ก** includes ทักษะภาษาอังกฤษ (language skills, 50/200).
- **วิชาเอกภาษาอังกฤษ** is scored under **ภาค ข** (50/100 with วิชาการศึกษา).

Workspace schema (`src/lib/storage/schema.js`) sets `english-major` → `examPart: 'ข'`. Video categories label วิชาเอก as **ภาคข**.  

**Finding:** Resources are **not** grouped under ภาค ก for the major subject. If product intent was “show English major under a ภาค ก filter,” that conflicts with the exam’s ภาค ข placement and was **not implemented**. Recommend clarifying before any regroup.

## Seed inventory (workspace)

| Resource | Count |
|---|---|
| Study plan priorities | 5 |
| Mock exams | 12 |
| Notes | 4 |
| Quizzes / questions | 7 / 35 |
| Videos | 39 |
