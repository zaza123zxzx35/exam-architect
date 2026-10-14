export const initialQuizzes = [
  {
    id: 'q-g1',
    category: 'ภาค ก - ความสามารถในการคิดวิเคราะห์',
    title: 'ชุดฝึกหัด 1: ตรรกะ + ลำดับตัวเลข',
    description: 'ฝึกทักษะการคิดวิเคราะห์ (ออกสอบ 50/200 คะแนน)',
    questions: [
      {
        id: 1,
        q: 'ถ้า A > B, B > C, และ C > D ข้อใดต้องเป็นจริงเสมอ?',
        options: ['A < C', 'A > D', 'B = D', 'A < D'],
        answer: 1,
        explanation: 'จาก A > B > C > D ดังนั้น A > D อย่างแน่นอน'
      },
      {
        id: 2,
        q: 'หาเลขที่ขาดไปในลำดับ: 2, 6, 12, 20, ?, 42',
        options: ['28', '30', '32', '36'],
        answer: 1,
        explanation: 'ผลต่างเพิ่มทีละ 2: +4, +6, +8, +10, +12 → 20 + 10 = 30'
      },
      {
        id: 3,
        q: '"นกบินได้" "ไก่เป็นนก" จาก 2 ประโยคข้างต้น ข้อใดเป็นผลสรุปที่ถูกต้องที่สุด?',
        options: ['ไก่บินได้', 'ไก่อาจบินได้หรือไม่ก็ได้', 'ไก่บินไม่ได้แน่นอน', 'ทุกชนิดของนกบินได้'],
        answer: 1,
        explanation: 'ประโยคแรกกล่าวถึงนกโดยทั่วไป อาจมีข้อยกเว้น ดังนั้นใช้คำว่า "อาจ"'
      },
      {
        id: 4,
        q: 'ในห้องมีคน 5 คน ทุกคนจับมือกันทุกคู่ รวมกี่ครั้ง?',
        options: ['5', '10', '15', '20'],
        answer: 1,
        explanation: 'C(5,2) = 5×4/2 = 10 ครั้ง'
      },
      {
        id: 5,
        q: 'หาค่าที่แตกต่างจากกลุ่มอื่น: 8, 27, 64, 100, 125',
        options: ['8', '27', '100', '125'],
        answer: 2,
        explanation: '8=2³, 27=3³, 64=4³, 125=5³ แต่ 100 ไม่ใช่กำลัง 3 ของจำนวนเต็ม'
      }
    ]
  },
  {
    id: 'q-g2',
    category: 'ภาค ก - ทักษะภาษาอังกฤษ',
    title: 'ชุดฝึกหัด 2: Reading + Vocab (ระดับกลาง)',
    description: 'เน้นทักษะอ่านความเข้าใจ + คำศัพท์ออกสอบบ่อย',
    questions: [
      {
        id: 1,
        q: '"The company\'s profits decreased significantly last quarter." The word "significantly" means:',
        options: ['slightly', 'greatly', 'hardly', 'equally'],
        answer: 1,
        explanation: 'significantly = อย่างมีนัยสำคัญ = greatly / considerably'
      },
      {
        id: 2,
        q: 'Passage: "Tom was late for work because his car broke down on the highway." Why was Tom late?',
        options: ['He slept in', 'His car had a problem', 'The highway was closed', 'He forgot his phone'],
        answer: 1,
        explanation: 'broke down = พังเสีย / มีปัญหา (เครื่องยนต์)'
      },
      {
        id: 3,
        q: 'Fill in the blank: I have been teaching English ___ 2018.',
        options: ['since', 'for', 'at', 'on'],
        answer: 0,
        explanation: 'ต่อเวลาจุดนัดพัก (2018) → since; for ต่อช่วงเวลา'
      },
      {
        id: 4,
        q: 'The opposite of "optimistic" is:',
        options: ['cheerful', 'pessimistic', 'realistic', 'enthusiastic'],
        answer: 1,
        explanation: 'optimistic = มองโลกในแง่ดี → ตรงข้าม pessimistic = มองโลกในแง่ร้าย'
      },
      {
        id: 5,
        q: '"She speaks English fluently." Which part of speech is "fluently"?',
        options: ['Noun', 'Adjective', 'Adverb', 'Verb'],
        answer: 2,
        explanation: 'fluently = คำวิเศษณ์ (Adverb) ขยาย Verb "speaks"'
      }
    ]
  },
  {
    id: 'q-g3',
    category: 'ภาค ก - ความรู้ทั่วไป / สัมภาษณ์',
    title: 'ชุดฝึกหัด 3: สังคม/เศรษฐกิจ/กฎหมายที่อาจารย์ต้องรู้',
    description: 'ความรู้ทั่วไป + เศรษฐกิจไทย + กฎหมายครูผู้ช่วย',
    questions: [
      {
        id: 1,
        q: 'สพฐ. ย่อมาจากคำว่าอะไร?',
        options: ['สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน', 'สภาครูประจำประเทศไทย', 'สำนักงานคณะกรรมการส่งเสริมอาชีพครู', 'สำนักงานปลัดกระทรวงศึกษาฯ'],
        answer: 0,
        explanation: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)'
      },
      {
        id: 2,
        q: 'การศึกษาขั้นพื้นฐานในไทย (ตามรัฐธรรมนูญ) ครอบคลุมกี่ปี?',
        options: ['9 ปี', '12 ปี', '6 ปี', '15 ปี'],
        answer: 1,
        explanation: 'รัฐธรรมนูญบัญญัติการศึกษาไม่เสียค่าใช้จ่าย 12 ปี (ประถม 6 + มัธยม 6)'
      },
      {
        id: 3,
        q: 'หน่วยที่ดูแลโรงเรียนประถมในท้องถิ่นเรียกว่า?',
        options: ['สพม. (สำนักงานเขตพื้นที่การศึกษามัธยม)', 'สพป. (สำนักงานเขตพื้นที่การศึกษาประถมศึกษา)', 'เทศบาล', 'อบจ.'],
        answer: 1,
        explanation: 'สพป. = ประถม; สพม. = มัธยม (ทั้งคู่อยู่ใต้ สพฐ.)'
      },
      {
        id: 4,
        q: 'ครูผู้ช่วย สามารถต่ออายุสัญญาได้สูงสุดกี่รอบ?',
        options: ['2 รอบ', '3 รอบ', '4 รอบ', 'จำนวนรอบไม่จำกัด'],
        answer: 1,
        explanation: 'ตามระเบียบ สพฐ. ต่อสัญญาได้สูงสุด 3 รอบ (แต่ละรอบ 1 ปี) → ต้องสอบบรรจุครูประจำถ้าต้องการดำรงตำแหน่งถาวร'
      },
      {
        id: 5,
        q: 'รัฐธรรมนูญ ฉบับปัจจุบัน (2560) บัญญัติเสรีภาพในการศึกษาในข้อใด?',
        options: ['มาตรา 27', 'มาตรา 43', 'มาตรา 60', 'มาตรา 81'],
        answer: 1,
        explanation: 'มาตรา 43 — บัญญัติสิทธิในการได้รับการศึกษาไม่เสียค่าใช้จ่าย 12 ปี และมหาวิทยาลัย 3 ปี'
      }
    ]
  },
  {
    id: 'q-e1',
    category: 'ภาค ข - วิชาการศึกษา',
    title: 'ชุดฝึกหัด 4: จิตวิทยาการศึกษา + หลักสูตร 62',
    description: 'เนื้อหาที่ออกสอบบ่อยทุกปี',
    questions: [
      {
        id: 1,
        q: 'ทฤษฎี "ขั้นบันไดแห่งความต้องการ" ของ Maslow ข้อใดอยู่ในชั้นต่ำสุด?',
        options: ['ความปลอดภัย', 'ความรักและการเป็นส่วนหนึ่ง', 'ความต้องการทางสรีรวิทยา', 'ความเคารพตนเอง'],
        answer: 2,
        explanation: 'ขั้นแรกสุด = สรีรวิทยา (หิว นอน หายใจ) > ปลอดภัย > รัก > ความภาคภูมิ > ทำตนให้สมบูรณ์'
      },
      {
        id: 2,
        q: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2562 จัดการศึกษาให้ผู้เรียนมีคุณลักษณะอันพึงประสงค์กี่ประการ?',
        options: ['5 ประการ', '6 ประการ', '8 ประการ', '10 ประการ'],
        answer: 2,
        explanation: 'คุณลักษณะอันพึงประสงค์ 8 ประการ (จิตศรัทธา, ปัญญา, ความมีหัวหน้าทีมฯลฯ)'
      },
      {
        id: 3,
        q: '"การเรียนรู้โดยทำ" (Learning by Doing) เป็นทฤษฎีของใคร?',
        options: ['Jean Piaget', 'B.F. Skinner', 'John Dewey', 'Lev Vygotsky'],
        answer: 2,
        explanation: 'John Dewey - ผู้ให้ความสำคัญกับการเรียนรู้จากประสบการณ์จริง'
      },
      {
        id: 4,
        q: 'หลักการจัดการเรียนรู้ที่เน้นให้ผู้เรียนสร้างความรู้ด้วยตนเองจากประสบการณ์ เรียกว่า?',
        options: ['Behaviorism', 'Constructivism', 'Cognitivism', 'Humanism'],
        answer: 1,
        explanation: 'Constructivism (ทฤษฎีสร้างนิยม) เช่น Piaget และ Vygotsky'
      },
      {
        id: 5,
        q: 'การเรียนรู้แบบ "สัตย์ปฏิบัติ" (Authentic Assessment) มีลักษณะอย่างไร?',
        options: ['เลือกคำตอบเพียงข้อเดียว', 'วัดผลจากการทำงานในชีวิตจริง', 'จดจำเนื้อหา', 'สอบปลายภาคเท่านั้น'],
        answer: 1,
        explanation: 'เน้นประเมินจากการปฏิบัติงานจริงที่มีความหมาย กับชีวิตประจำวัน'
      }
    ]
  },
  {
    id: 'q-e2',
    category: 'ภาค ข - จิตวิทยาการเรียนรู้',
    title: 'ชุดฝึกหัด 5: นักจิตวิทยา + ทฤษฎีเรียนรู้',
    description: 'ผสมนักจิตวิทยา + เทคนิคการสอน (ออกสอบ 50/100)',
    questions: [
      {
        id: 1,
        q: 'ทฤษฎี Operant Conditioning (ส่วนเพิ่ม-ส่วนลด) เป็นงานของใคร?',
        options: ['Ivan Pavlov', 'B.F. Skinner', 'Edward Thorndike', 'Albert Bandura'],
        answer: 1,
        explanation: 'Skinner = Operant (รางวัล/โทษ) ; Pavlov = Classical (สัญญาณ)'
      },
      {
        id: 2,
        q: '"ลูกแมวลองผิดลองถูกในลิขิต กลายเป็นรู้วิธีเปิดประตู" เป็นทฤษฎีอะไรของใคร?',
        options: ['Insight Learning (Kohler)', 'Trial & Error / Law of Effect (Thorndike)', 'Latent Learning (Tolman)', 'Social Learning (Bandura)'],
        answer: 1,
        explanation: 'Law of Effect + Trial & Error = Edward Thorndike'
      },
      {
        id: 3,
        q: 'การเรียนรู้ด้วยการสังเกตคนอื่น (Modeling / Social Learning Theory) เป็นของใคร?',
        options: ['Jean Piaget', 'Albert Bandura', 'Benjamin Bloom', 'Jerome Bruner'],
        answer: 1,
        explanation: 'Albert Bandura - ทฤษฎีโบโอดอลล์ (Bobo Doll experiment) เรียนรู้จากการเห็นคนอื่นทำ'
      },
      {
        id: 4,
        q: 'การแบ่งขั้นของความรู้จัก Bloom Taxonomy ระดับสูงสุดคืออะไร (ฉบับล่าสุด)?',
        options: ['Knowledge (จำ)', 'Evaluation (ประเมิน)', 'Create / Create sth new', 'Analysis'],
        answer: 2,
        explanation: 'Bloom Revised 2001: Remember → Understand → Apply → Analyze → Evaluate → Create (สูงสุด)'
      },
      {
        id: 5,
        q: 'Piaget แบ่งการพัฒนาสติปัญญา 4 ขั้น ข้อใดเป็นขั้นที่ตรงกับเด็กประถมต้น (อายุ 7-11)?',
        options: ['Sensorimotor', 'Preoperational', 'Concrete Operational', 'Formal Operational'],
        answer: 2,
        explanation: 'Concrete = คิดเป็นรูปธรรม (ได้) เริ่มมีเหตุผล (ประถมต้น) ; Formal = มัธยมขึ้นไป'
      }
    ]
  },
  {
    id: 'q-m1',
    category: 'ภาค ข - วิชาเอกภาษาอังกฤษ (Grammar)',
    title: 'ชุดฝึกหัด 6: Grammar Tense + Structure ระดับสูง',
    description: 'Grammar ที่ออกสอบขั้นสูง (ออกสอบ 50/100)',
    questions: [
      {
        id: 1,
        q: 'Choose the correct form: She ___ to the gym every morning for two years.',
        options: ['goes', 'has gone', 'has been going', 'is going'],
        answer: 2,
        explanation: 'ต่อย้อนเวลา "for two years" + ทำเรื่อยๆ = Present Perfect Continuous'
      },
      {
        id: 2,
        q: 'The synonym of "abundant" is:',
        options: ['scarce', 'plentiful', 'expensive', 'ancient'],
        answer: 1,
        explanation: 'abundant = อุดมสมบูรณ์ = plentiful / plenty'
      },
      {
        id: 3,
        q: 'Which sentence is grammatically CORRECT?',
        options: [
          'Neither the teacher nor the students was late.',
          'Neither the teacher nor the students were late.',
          'Neither the teacher or the students were late.',
          'Neither the teacher nor the students is late.'
        ],
        answer: 1,
        explanation: 'Neither...nor ใช้ Verb กับคำนามหลังสุด (students → were)'
      },
      {
        id: 4,
        q: '"I regret ___ him the truth; he was very upset."',
        options: ['tell', 'to tell', 'telling', 'told'],
        answer: 2,
        explanation: 'regret + V-ing = เสียใจที่ได้ทำอะไรไปแล้ว (ทำแล้วเสียใจ)'
      },
      {
        id: 5,
        q: 'Change to reported speech: "Where do you live?" she asked me.',
        options: [
          'She asked me where did I live.',
          'She asked me where I lived.',
          'She asked me where I live.',
          'She asked me where do I live.'
        ],
        answer: 1,
        explanation: 'Reported speech = change + verb tense back → present → past + ใช้ประโยคบอกเล่า (ไม่กลับประโยคคำถาม)'
      }
    ]
  },
  {
    id: 'q-m2',
    category: 'ภาค ข - วิชาเอกภาษาอังกฤษ (วิธีการสอน)',
    title: 'ชุดฝึกหัด 7: Methodology ภาษาอังกฤษ + Literature',
    description: 'วิธีการสอนภาษาอังกฤษ (Approach/Method) + บทกวี/นวนิยาย',
    questions: [
      {
        id: 1,
        q: 'วิธีการสอนภาษาที่ห้ามใช้ภาษาแม่สอน สั่ง "ได้ยิน → พูด" ก่อน (เนื้อหาเป็นคำสั่ง / actions):',
        options: ['Grammar Translation', 'Total Physical Response (TPR)', 'Audiolingual Method', 'Communicative Approach'],
        answer: 1,
        explanation: 'TPR (James Asher) = สั่งการเป็นภาษาที่สอง แล้วให้นักเรียนทำท่าทางตาม (ยึด "ได้ยิน → พูด" ก่อน)'
      },
      {
        id: 2,
        q: 'วิธีการสอนที่เน้นการสื่อสารใช้ในชีวิตจริง (Task-based / Focus fluency ก่อน accuracy) คือ:',
        options: ['CLT (Communicative Language Teaching)', 'Direct Method', 'Silent Way', 'Suggestopedia'],
        answer: 0,
        explanation: 'CLT = ยุคปัจจุบัน (เน้นการใช้ภาษาสื่อสารให้ได้ — ไม่เนี้ยแน่ Grammar เท่านั้น)'
      },
      {
        id: 3,
        q: 'เนื้อหาเรื่อง "Romeo and Juliet" เป็นผลงานของใคร?',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        answer: 1,
        explanation: 'วิลเลียม เชคสเปียร์ (1597) - บทละครชีวิตรักย้อนศัตรูตระกูล'
      },
      {
        id: 4,
        q: 'การสอนภาษาอังกฤษ โดยเน้นให้นักเรียน "ค้นพบกฎ Grammar เอง" จากตัวอย่างหลายๆ ตัว (ไม่สอนกฎตรงๆ) คือ:',
        options: ['Deductive Teaching', 'Inductive Teaching', 'Rote Learning', 'Drill & Practice'],
        answer: 1,
        explanation: 'Inductive = ให้ตัวอย่างหลายๆ ตัว แล้วให้นักเรียน "หากฎ" เอง → ตามด้วย Deductive เพื่อยืนยัน'
      },
      {
        id: 5,
        q: 'หลักการสอนภาษาอังกฤษในหลักสูตร 2562 คือข้อใด?',
        options: ['เน้น Grammar อย่างเดียว', 'เน้นการใช้ภาษาเพื่อสื่อสาร (4 ทักษะ)', 'เน้นแค่ Listening', 'เน้นแค่เรียนคำศัพท์'],
        answer: 1,
        explanation: 'หลักสูตร 62 = 4 ทักษะ (ฟัง-พูด-อ่าน-เขียน) สื่อสารได้จริง + ความเข้าใจวัฒนธรรม'
      }
    ]
  }
]
