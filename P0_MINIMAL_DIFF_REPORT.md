# P0 Minimal Diff — ผลงาน (รอตรวจ)

อ้างอิง `SCHEDULE_SYSTEM_AUDIT_REPORT.md` · **ไม่ได้เริ่ม P1/P2** · **ไม่ได้เปลี่ยนเป้า 8 ชม./23:00** · **ไม่ได้ Push/Deploy Production**

## ไฟล์ที่เปลี่ยน และเหตุผล

| ไฟล์ | Diff สั้น ๆ | เหตุผล P0 |
|---|---|---|
| `src/lib/curated/liveSchedulePlan.js` | `resolveLadyLiveConflicts` ไม่เขียนทับ `startTime`/`endTime` · ตั้ง `scheduleConflictPending` + `sourceStartTime/End` · `restoreSilentLadyDemotion` สำหรับของเก่า 09:00–11:00 | P0.1 คงเวลาต้นทาง · รายงานรอยืนยัน |
| `src/lib/curated/liveConflictAdvisor.js` | `replayEvidenceStatus` · ไม่ยืนยัน replay จาก URL เปล่า · hint ชัด · `awaitingUserDecision` | P0.2 |
| `src/lib/curated/dayTimeline.js` | ยึดนาฬิกาต้นทางของงานที่ชน · ข้อความบทบาทไม่สรุปว่าดูย้อนหลังได้ | P0.1 + P0.2 |
| `src/lib/curated/victoryPlan.js` | lever `conflict_clear` = รายงานชนครบ (ไม่ต้องเลื่อนเงียบ) · โน้ตแผน | ให้คะแนน 100 ยังเข้ากันได้กับ P0 |
| `src/pages/Today.jsx` | ข้อความคำแนะนำ: คงเวลาต้นทาง · รอยืนยัน | UI สะท้อน P0 |
| `src/lib/curated/liveConflictAdvisor.test.js` | regression 7/16/21 + bare URL | ตามข้อกำหนด |
| `src/lib/curated/liveSchedulePlan.test.js` | regression 7/16/21 เวลาต้นทาง | ตามข้อกำหนด |
| `src/lib/curated/victoryPlan.test.js` | ไม่เลื่อน + restore ของเก่า | ตามข้อกำหนด |

## Schema / ข้อมูลเดิม

- **ไม่บังคับ schema ใหม่** — เพิ่มฟิลด์เสริม optional: `scheduleConflictPending`, `sourceStartTime`, `sourceEndTime`
- ของเก่าที่ถูก demote เป็น 09:00–11:00: เมื่อรัน `resolveLadyLiveConflicts` อีกครั้งจะ **restore** จาก `demotedFrom*` (ไม่ invent เวลา)
- ไม่ลบ/รวมรายการจาก URL ซ้ำ

## ผลทดสอบ (รันจริง)

| คำสั่ง | ผล |
|---|---|
| `npm test` | **252 passed** (40 files) |
| `npm run lint` | ผ่าน |
| `npm run build` | ผ่าน |

## พฤติกรรมที่ยืนยันด้วยเทสต์

- **7 ต.ค.:** VIP คง 20:00–22:30 · flag ชน · แนะนำเข้าสดแหกโค้ง · ยังไม่เลื่อน
- **16 ต.ค.:** ออนไลน์คง 11:00–14:00 / 20:00–22:00 · ไม่มี flag ชนเลดี้
- **21 ต.ค.:** อ.ศรัญภรณ์ คง 20:00–22:00 · flag ชน · ไม่เปลี่ยนชื่อเป็นทบทวนกลางวัน
- **bare resourceUrl:** `replayStatus=unconfirmed_link` · `hasReplayLink=false` · hint รอยืนยัน

## ปัญหาที่ยังเหลือ (นอก P0)

- P1: เป้า 8 ชม. / เลิก 23:00 ยังไม่ทำ
- P2: ตัวเลือก UI ยืนยันเข้าสดแล้วค่อย commit การเลื่อน (ตอนนี้รายงานอย่างเดียว)
- Smart Planner ยังไม่ผูก curatedCatalog
- UI วันที่ 7/21 ยังต้องเปิดตรวจด้วยมือเมื่อวันเครื่องตรงหรือมีตัวเลือกวัน

**หยุดรอการตรวจสอบก่อนทำขั้นต่อไป**
