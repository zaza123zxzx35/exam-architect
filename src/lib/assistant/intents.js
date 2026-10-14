/**
 * Deterministic intent catalog for the study assistant.
 * Only intents listed here are claimed as supported.
 */
export const ASSISTANT_INTENTS = [
  'confirm',
  'cancel',
  'help',
  'create_plan',
  'revise_plan',
  'add_task',
  'remove_task',
  'reschedule_task',
  'change_duration',
  'change_daily_limit',
  'change_priority',
  'show_today',
  'show_exams',
  'summarize_progress',
  'find_resources',
  'unsupported',
]

const RULES = [
  {
    intent: 'confirm',
    weight: 100,
    patterns: [
      /^(yes|y|ok|okay|confirm|apply|save|do it)\b/i,
      /^(ใช่|ตกลง|ยืนยัน|บันทึก|เอาเลย|ได้เลย|โอเค|ok)\s*$/i,
      /ยืนยัน(การ)?(บันทึก|เปลี่ยนแปลง|แผน)/i,
      /apply (the )?plan/i,
    ],
  },
  {
    intent: 'cancel',
    weight: 100,
    patterns: [
      /^(no|n|cancel|nevermind|never mind|abort)\b/i,
      /^(ไม่|ยกเลิก|ไม่เอา|เลิก|อย่าบันทึก)\s*$/i,
      /cancel (the )?(plan|change|preview)/i,
      /ยกเลิก(แผน|การเปลี่ยนแปลง|ตัวอย่าง)/i,
    ],
  },
  {
    intent: 'help',
    weight: 80,
    patterns: [
      /\bhelp\b|what can you do|commands?/i,
      /ช่วย(เหลือ)?|ทำอะไรได้|คำสั่ง|howto|how to/i,
    ],
  },
  {
    intent: 'show_exams',
    weight: 90,
    patterns: [
      /exam dates?|when is the exam|upcoming exams?/i,
      /วันสอบ|สอบเมื่อไหร่|นับถอยหลัง(ถึง)?สอบ|ดูวันสอบ/i,
    ],
  },
  {
    intent: 'show_today',
    weight: 90,
    patterns: [
      /today'?s (plan|schedule|tasks?)|show today|what.*(today|tonight)/i,
      /วันนี้(มี)?(อะไร|งาน|แผน|ตาราง)|แผนวันนี้|ตารางวันนี้|ติวอะไรวันนี้/i,
    ],
  },
  {
    intent: 'summarize_progress',
    weight: 90,
    patterns: [
      /progress|how am i doing|summary|stats/i,
      /ความคืบหน้า|สรุป(ความ)?คืบหน้า|ทำไปเท่าไหร่|เปอร์เซ็นต์/i,
    ],
  },
  {
    intent: 'find_resources',
    weight: 90,
    patterns: [
      /find (a )?(resource|link|video)|show (me )?(resources|links)/i,
      /หา(ลิงก์|ทรัพยากร|คลิป|คอร์ส)|มีลิงก์|resource/i,
    ],
  },
  {
    intent: 'change_daily_limit',
    weight: 85,
    patterns: [
      /daily (limit|cap|max)|limit.*(day|daily)/i,
      /ลิมิต.*(วัน|ต่อวัน)|ไม่เกิน\s*\d+.*(ชม|ชั่วโมง|นาที).*วัน|ชั่วโมงต่อวัน/i,
    ],
  },
  {
    intent: 'change_duration',
    weight: 80,
    patterns: [
      /change (session )?duration|session (length|minutes)/i,
      /เปลี่ยน(ความ)?ยาว(ช่วง|session)?|ปรับช่วงละ|session\s*\d+\s*min/i,
      /(?:ตั้ง|เปลี่ยน|ปรับ)?ช่วงละ\s*\d+\s*นาที/i,
    ],
  },
  {
    intent: 'change_priority',
    weight: 80,
    patterns: [
      /change priority|set priority|make (it )?high priority/i,
      /เปลี่ยนความสำคัญ|priority|สำคัญ(มาก|น้อย)|เร่งด่วน/i,
    ],
  },
  {
    intent: 'reschedule_task',
    weight: 85,
    patterns: [
      /reschedule|move (the )?task|postpone|defer/i,
      /เลื่อน(งาน|ตาราง)|ย้ายงาน|จัดใหม่|reschedule/i,
    ],
  },
  {
    intent: 'remove_task',
    weight: 85,
    patterns: [
      /remove (the )?task|delete (the )?task|drop (the )?task/i,
      /ลบ(งาน|รายการ)|เอาออก|remove task/i,
    ],
  },
  {
    intent: 'add_task',
    weight: 75,
    patterns: [
      /add (a )?(task|session)|schedule (a )?task/i,
      /เพิ่ม(งาน|ช่วง|รายการ)|ใส่งาน/i,
    ],
  },
  {
    intent: 'revise_plan',
    weight: 70,
    patterns: [
      /revise|update (the )?plan|change (the )?plan|instead|also add|make it/i,
      /แก้แผน|ปรับแผน|เปลี่ยนแผน|เพิ่มวิชา|เอาออกจากแผน|แทนที่จะ/i,
    ],
  },
  {
    intent: 'create_plan',
    weight: 95,
    patterns: [
      /create (a )?plan|make (a )?plan|plan (my )?study|build (a )?schedule/i,
      /สร้างแผน|จัดแผน|วางแผนติว|ช่วยจัดตาราง|อยากติว|ช่วยติว/i,
    ],
  },
]

/**
 * @param {string} text
 * @param {{ pendingChange?: object | null, lastIntent?: string | null }} [context]
 */
export function classifyIntent(text, context = {}) {
  const raw = String(text || '').trim()
  if (!raw) {
    return { intent: 'unsupported', confidence: 0, scores: {}, language: detectLanguage(raw) }
  }

  // Pending confirmation shortcuts
  if (context.pendingChange) {
    for (const rule of RULES.filter(r => r.intent === 'confirm' || r.intent === 'cancel')) {
      if (rule.patterns.some(p => p.test(raw))) {
        return {
          intent: rule.intent,
          confidence: 1,
          scores: { [rule.intent]: rule.weight },
          language: detectLanguage(raw),
        }
      }
    }
  }

  const scores = Object.create(null)
  for (const rule of RULES) {
    let hit = 0
    for (const pattern of rule.patterns) {
      if (pattern.test(raw)) hit += 1
    }
    if (hit) scores[rule.intent] = (scores[rule.intent] || 0) + rule.weight * hit
  }

  // Follow-up revise bias when a draft exists
  if (context.lastRequest && /เพิ่ม|เอาออก|instead|also|change|ปรับ|แก้/i.test(raw)) {
    scores.revise_plan = (scores.revise_plan || 0) + 25
  }

  // Planning phrases should beat bare exam/duration keyword hits
  if (/อยากติว|สร้างแผน|create (a )?plan|make (a )?plan/i.test(raw)) {
    scores.create_plan = (scores.create_plan || 0) + 40
  }

  let best = 'unsupported'
  let bestScore = 0
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = intent
      bestScore = score
    }
  }

  // Ambiguous: two close top scores
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const ambiguous = ranked.length >= 2 && ranked[0][1] - ranked[1][1] < 15

  if (bestScore < 40) {
    return {
      intent: 'unsupported',
      confidence: bestScore / 100,
      scores,
      language: detectLanguage(raw),
      ambiguous: false,
    }
  }

  return {
    intent: best,
    confidence: Math.min(1, bestScore / 100),
    scores,
    language: detectLanguage(raw),
    ambiguous,
    alternatives: ambiguous ? ranked.slice(0, 2).map(r => r[0]) : [],
  }
}

export function detectLanguage(text) {
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th'
  if (/[a-z]/i.test(text)) return 'en'
  return 'th'
}

export function listSupportedCommands(lang = 'th') {
  if (lang === 'en') {
    return [
      'Create a study plan',
      'Add / remove a study task',
      'Reschedule unfinished work',
      'Change session duration or daily limit',
      'Change priority',
      "Show today's plan",
      'Show exam dates',
      'Summarize progress',
      'Find resources by subject',
      'Revise a proposed plan, then confirm or cancel',
    ]
  }
  return [
    'สร้างแผนติว',
    'เพิ่ม / ลบงาน',
    'เลื่อนงานค้าง',
    'เปลี่ยนความยาวช่วงหรือลิมิตต่อวัน',
    'เปลี่ยนความสำคัญ',
    'ดูแผนวันนี้',
    'ดูวันสอบ',
    'สรุปความคืบหน้า',
    'หาทรัพยากรตามวิชา',
    'แก้แผนที่เสนอ แล้วยืนยันหรือยกเลิก',
  ]
}
