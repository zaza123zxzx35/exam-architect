# Pre-Deploy Report — Kru Exam Planner (สพฐ. ครูผู้ช่วย 2569)

**วันที่/เวลาตรวจสอบ:** 15 ตุลาคม 2026 (รอบ Final Data Safety Review — Confirm Before Clear Managed)  
**Branch:** `main`  
**Commit SHA (last commit):** `e1db5fe3bc62f79f185b70716edbf4ec0e980022` (`e1db5fe`)  
**Remote sync:** `main` = `origin/main` (ahead 0 / behind 0)  
**Working tree:** **dirty** — มีการแก้ไข local ที่ยังไม่ commit (ดู §9)  
**สถานะ Deploy:** **NOT DEPLOYED — WAITING FOR SEPARATE EXPLICIT APPROVAL**  
**คำตัดสิน:** **CONDITIONAL GO**

---

## 0. Executive summary

| หัวข้อ | ผล |
|---|---|
| Automated tests | **PASS** 217/217 (35 files) |
| Lint | **PASS** 0 warnings |
| Production build | **PASS** |
| Force regen ต้องยืนยันก่อน | **PASS** (dialog + preview; ยกเลิกไม่แตะ schedule) |
| Force regen คง `done` / `userEdited` | **PASS** |
| Force regen ไม่สร้าง resource ซ้ำหลังยืนยัน | **PASS** |
| ล้างงาน curated/ไลฟ์ ต้องยืนยันก่อน | **PASS** (dialog + preview; ยกเลิกไม่แตะ schedule) |
| ล้างงานลบรวม done / userEdited (ตามขอบเขตเดิม) | **PASS** — ข้อความยืนยันอธิบายชัด |
| ล้างงานคงงานที่ไม่ใช่ managed | **PASS** |
| API key ฝั่ง server เท่านั้น | **PASS** (สถาปัตยกรรม; ไม่เปิดเผยค่า) |
| Catalog URL taxonomy | **PASS** — 201 `unchecked` · 4 `needs_full_url` · 0 `verified_accessible` |
| Drive 4 stubs ไม่ถูกเดา URL | **PASS** |
| Vercel Dashboard / Production | **NOT VERIFIED** |
| Browser/Mobile E2E | **NOT VERIFIED** |

> **100/100** = ความพร้อมแผนรบในแอป — **ไม่ใช่การการันตีผลสอบ/บรรจุ**

---

## 1. Git status

```
Branch: main @ e1db5fe (= origin/main)
Dirty (modified):
  PRE_DEPLOY_REPORT.md
  scripts/phase-i-journey-audit.mjs
  src/components/VictoryPlanCard.jsx
  src/lib/curated/seedPartB29Plan.js
  src/lib/curated/seedPartB29Plan.test.js
  src/lib/curated/victoryPlan.js
  src/lib/curated/victoryPlan.test.js
  src/pages/Timetable.jsx
  src/pages/Today.jsx
  src/pages/Videos.jsx
Untracked:
  src/components/ClearManagedConfirmDialog.jsx
  src/components/ForceRegenConfirmDialog.jsx
```

Secret scan บน diff: **CLEAN**

---

## 2. Test / Lint / Build (รอบนี้ — รันจริง)

| คำสั่ง | ผล |
|---|---|
| `npm test` | **217/217 passed** (35 files) |
| `npm run lint` | **clean** (oxlint, 0 warnings) |
| `npm run build` | **success** (vite build) |

---

## 3. Clear managed — ขอบเขตและ confirm

### ขอบเขตการลบ (ฟังก์ชันเดิม / `isVictoryManagedTask`)
ลบ Task ที่เข้าเงื่อนไขใดเงื่อนไขหนึ่ง:
- `id` ขึ้นต้นด้วย `curated_` / `live_` / `victory_`
- หรือ `origin` เป็น `curated-unified-plan` · `curated-part-b-29` · `live-tutor-schedule` · `victory-plan-100`

**รวม `status === 'done'` และ `userEdited === true`** — ไม่เหมือน force regen ที่คงรายการเหล่านี้ไว้

งานอื่น (เช่น manual / user) **คงอยู่** · seed meta flags ถูกล้าง

### หลังแก้ (รอบนี้)
1. กด「ล้างงาน curated/ไลฟ์ในเครื่องนี้」→ เปิด `ClearManagedConfirmDialog` + `buildClearManagedPreview` (**ไม่ mutate schedule**)
2. แสดงจำนวนจะลบทั้งหมด · done ที่จะหาย · userEdited ที่จะหาย · pending · งานอื่นที่จะคง · ตัวอย่างชื่อจริง
3. **ยกเลิก** → ปิด dialog · แผนเดิมไม่เปลี่ยน
4. **ยืนยัน** → `commitClearManagedTasks` · ลบเฉพาะ managed ตามขอบเขตเดิม · คงงานอื่น

---

## 4. Force regen — ยืนยันซ้ำในรอบนี้

1. กดปุ่ม → `ForceRegenConfirmDialog` + `buildForceRegenPreview` (**ไม่ mutate schedule**)
2. **ยกเลิก** → แผนเดิมไม่เปลี่ยน
3. **ยืนยัน** → `commitForceVictoryPlan` · คง done/userEdited · แทนที่ pending · ไม่ซ้ำ resource · score 100
4. Unit tests ใน `victoryPlan.test.js` + `seedPartB29Plan.test.js` ยัง **PASS**

---

## 5. ปัญหาตามความรุนแรง

### Critical
*ไม่มี*

### High
*ไม่มีค้าง* — ทั้ง force regen และล้าง curated ต้องยืนยันก่อนแล้วใน working tree

### Medium
| รายการ | สถานะ |
|---|---|
| Drive 4 × `needs_full_url` | คงไว้; มีทบทวนทดแทน; ห้ามเดา URL |
| Vercel Production env / dashboard | NOT VERIFIED |
| localStorage เครื่องเดียว | by design |
| ปุ่ม「ล้างงาน」ลบรวม done (หลังยืนยัน) | by design ตามขอบเขตเดิม; dialog เตือนชัด |

### Low
| รายการ | สถานะ |
|---|---|
| ไม่มี Playwright E2E สำหรับ dialog | มี unit/contract tests แทน |
| Rate limit API in-memory | ยอมรับได้สำหรับ SPA ส่วนตัว |

---

## 6. Resources / URLs

| urlStatus | จำนวน |
|---|---|
| `unchecked` | 201 |
| `needs_full_url` | 4 |
| `verified_accessible` | 0 |

Drive stubs ยังมี ellipsis: `edu-nonn-analysis-key`, `law-nonn-special-12-doc`, `law-nonn-special-34-key`, `civil-nonn-redbook-key`

---

## 7. API / Security (สรุปสั้น)

- คีย์อ่านจาก `OPENAI_API_KEY` ฝั่ง server เท่านั้น · ห้าม `VITE_OPENAI_API_KEY`
- AI เสนอแผน → ต้องยืนยันก่อนบันทึก · ไม่ทับ done/userEdited
- ไม่พิมพ์ secret ในรายงานนี้

ชื่อตัวแปร Production (ค่าไม่แสดง): `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`

---

## 8. Routing / Vercel (จาก repo)

- `vercel.json`: SPA rewrite ยกเว้น `/api/`
- Dashboard / deploy จริง: **NOT VERIFIED**

---

## 9. สิ่งที่ยังไม่ได้ตรวจ

1. Vercel Dashboard env  
2. Production deep links หลัง deploy  
3. Browser manual เปิด dialog บน desktop/mobile  
4. Live OpenAI บน production (ไม่ยิงซ้ำในรอบนี้)

---

## 10. ไฟล์ที่เปลี่ยนใน working tree (ยังไม่ commit)

| ไฟล์ | เหตุผล |
|---|---|
| `src/lib/curated/victoryPlan.js` | preview + retain/protect + clone กัน mutate |
| `src/lib/curated/victoryPlan.test.js` | เทสต์ force preview/cancel/confirm preserve |
| `src/lib/curated/seedPartB29Plan.js` | `commitForceVictoryPlan` + `buildClearManagedPreview` / `commitClearManagedTasks` |
| `src/lib/curated/seedPartB29Plan.test.js` | force + clear contract tests |
| `src/components/ForceRegenConfirmDialog.jsx` | **ใหม่** — dialog ยืนยันจัดแผน 100 |
| `src/components/ClearManagedConfirmDialog.jsx` | **ใหม่** — dialog ยืนยันล้าง curated/ไลฟ์ |
| `src/components/VictoryPlanCard.jsx` | เปิด preview ก่อน force |
| `src/pages/Today.jsx` | ปุ่มรีเฟรชแผน + ปุ่มล้างงานใช้ dialog ยืนยัน |
| `src/pages/Videos.jsx` | lint: derive active id |
| `src/pages/Timetable.jsx` | lint: ลบ unused |
| `scripts/phase-i-journey-audit.mjs` | lint: ลบ unused import |
| `PRE_DEPLOY_REPORT.md` | รายงานรอบนี้ |

---

## 11. Deploy / Post-Deploy (เตรียมไว้เท่านั้น)

ยัง **ห้าม deploy** จนกว่าจะมีคำสั่งอนุมัติแยก  
หลังอนุมัติ: commit → push → ตั้ง env บน Vercel → deploy → smoke (รวมลองกดจัดแผน 100 และล้าง curated แล้วกดยกเลิก/ยืนยัน)

---

## 12. คำตัดสิน

**CONDITIONAL GO** — โค้ดพร้อมขึ้นได้หลัง commit เมื่อได้รับอนุญาต; Production dashboard ยังไม่ตรวจ; working tree ยัง dirty

---

## DEPLOY / COMMIT STATUS

`COMMIT: NOT AUTHORIZED`  
`PUSH: NOT AUTHORIZED`  
`DEPLOY: NOT DEPLOYED — WAITING FOR SEPARATE EXPLICIT APPROVAL`
