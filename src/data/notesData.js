export const initialNotes = [
  {
    id: 'n1',
    category: 'ภาค ก',
    subject: 'ความสามารถในการคิดวิเคราะห์',
    title: 'สรุป 5 ชนิดโจทย์ที่ออกบ่อย',
    content: `1. ลำดับตัวเลข (Number Sequence)
   - ลองดูผลต่างก่อน (d)
   - ถ้าผลต่างไม่สม่ำเสมอ ลองกำลังสอง / กำลังสาม
   - Pattern ที่เป็นที่นิยม: Fibonacci, Even/Odd, Prime

2. นิรนาม / ความสัมพันธ์ (Analogy)
   - หาความสัมพันธ์คู่แรกก่อน แล้วเอาไป Apply กับคู่ถัดไป
   - สังเกต: ส่วนกลับ, ประเภทเดียวกัน, สาเหตุ-ผล, ส่วน-ทั้งหมด

3. การให้เหตุผล (Logical Reasoning)
   - ระมัดระวังคำว่า "ทุก", "บาง", "ไม่ได้หมายความว่า"
   - ระวัง: ผลจาก A→B ไม่ได้แปลว่า B→A

4. โจทย์นับและความน่าจะเป็น
   - Combination (C) : ใช้เมื่อไม่สนใจลำดับ
   - Permutation (P) : ใช้เมื่อสนใจลำดับ
   - จำสูตร C(n,k) = n!/(k!·(n-k)!)

5. รูปภาพและ Spatial Reasoning
   - หา Pattern: แลกเปลี่ยนตำแหน่ง, หมุน, สะท้อน, เพิ่ม/ลดจำนวน`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'n2',
    category: 'ภาค ก',
    subject: 'ทักษะภาษาอังกฤษ',
    title: 'Grammar 10 จุดสำคัญที่ออกสอบทุกปี',
    content: `1. Tense 12 ชนิด - โฟกัส Present Perfect, Past Perfect, Future Tense
2. Passive Voice - เปลี่ยน Active → Passive ได้คล่อง
3. Reported Speech - เปลี่ยน Tense และ Time Marker
4. If Clause (Conditionals) 3 แบบ - Type 0,1,2,3
5. Subject-Verb Agreement - รายชื่อ Collective Noun, Either/Neither, Each
6. Gerund vs Infinitive - Verb บางตัวตามด้วย V-ing อย่างเดียว (enjoy, mind, finish)
7. Preposition - Time: in/on/at, Place, Phrasal Verb บ่อยๆ
8. Relative Pronoun - who/whom/which/that/whose + Reduced Clause
9. Article - a/an/the, Zero Article (ไม่ใช้ the กับประเภททั่วไป)
10. Tag Question - ดู Main Verb ว่าเป็น PoV หรือ Not`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'n3',
    category: 'ภาค ข',
    subject: 'วิชาการศึกษา',
    title: 'สรุปทฤษฎีการเรียนรู้สำคัญ + ผู้ริเริ่ม',
    content: `1. Behaviorism (B.F. Skinner, Pavlov, Thorndike)
   → Learning = เปลี่ยนแปลงพฤติกรรม
   → เน้น Reward / Punishment, Conditioning
   → ใช้ดีกับการฝึกทักษะ, ท่องจำ

2. Cognitivism (Jean Piaget, Bruner, Ausubel)
   → เรียนรู้โดยการจัดระเบียบข้อมูลในจิตใจ
   → 4 ระยะพัฒนา Piaget: Sensorimotor → Preoperational → Concrete → Formal
   → Discovery Learning (Bruner), Meaningful Learning (Ausubel)

3. Constructivism (Vygotsky, John Dewey)
   → ผู้เรียนสร้างความรู้เองจากประสบการณ์
   → Zone of Proximal Development (ZPD) + Scaffolding (Vygotsky)
   → Learning by Doing (Dewey)

4. Humanism (Maslow, Rogers)
   → เน้นศักยภาพและความสำคัญของบุคคล
   → Pyramid of Needs (Maslow)
   → Student-Centered, Self-Directed Learning

5. 21st Century Skills
   → 4C: Critical Thinking, Creativity, Collaboration, Communication
   + ด้าน ICT, Life & Career Skills`,
    createdAt: new Date().toISOString()
  },
  {
    id: 'n4',
    category: 'ภาค ค',
    subject: 'สัมภาษณ์',
    title: 'คำถามที่ถามบ่อย + เทคนิคการตอบ',
    content: `ส่วนที่ 1 - แนะนำตัวเอง
- ไม่ต้องเล่าประวัติยาวๆ
- เน้นจุดแข็ง: ความรู้ด้านภาษาอังกฤษ, ประสบการณ์สอนจริง, ความพยายามเตรียมตัว
- ปิดท้ายด้วย Passion: "ผมรักการสอนและอยากดูเด็กๆ พัฒนาตัวเอง"

ส่วนที่ 2 - ทำไมอยากเป็นครู?
- ไม่ต้องตอบ "เพราะต้องการงานมั่นคง"
- ตอบ: "ประสบการณ์สอนครั้งแรกทำให้ผมเห็นว่าความรู้ของผมสามารถเปลี่ยนแปลงชีวิตเด็กได้"

ส่วนที่ 3 - สถานการณ์ (Case Study)
- เด็กทำร้ายกันในห้องเรียน: 1) แยกฝ่าย 2) ฟังทั้งสอง 3) หาสาเหตุ 4) สื่อสารผู้ปกครอง 5) ติดตามผล
- เด็กไม่ใส่ใจเรียน: หาสาเหตุที่แท้จริง (ปัญหาบ้าน/เพื่อน/เนื้อหาไม่เข้าใจ) แล้วปรับวิธีการสอนให้เหมาะสม

เทคนิค: STAR
- Situation (สถานการณ์)
- Task (ภาระงาน)
- Action (การกระทำที่คุณทำจริง)
- Result (ผลลัพธ์) - มีตัวเลขจะดีกว่า!`,
    createdAt: new Date().toISOString()
  }
]
