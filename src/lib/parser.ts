/**
 * Quick-add smart parser.
 * Tolerant by design: it never destroys the original text — leftover words
 * always survive as the task title.
 *
 * EN: "Meeting with Ali tomorrow at 6pm #work high"
 * FA: "فردا ساعت ۶ جلسه با علی #کار مهم"
 */
import type { Priority, ReminderKind, RepeatKind } from './types';
import { todayKey, addDaysKey } from './dates';

export interface ParsedTask {
  title: string;
  date: string | null;
  time: string | null;
  tags: string[];
  priority: Priority | null;
  reminder: ReminderKind;
  repeat: RepeatKind;
}

const FA_DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5',
  '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5',
  '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGIT_MAP[d] ?? d);
}

const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const FA_WEEKDAYS: Record<string, number> = {
  'شنبه': 6, 'یکشنبه': 0, 'یک شنبه': 0, 'دوشنبه': 1, 'دو شنبه': 1,
  'سه‌شنبه': 2, 'سه شنبه': 2, 'چهارشنبه': 3, 'چهار شنبه': 3,
  'پنجشنبه': 4, 'پنج شنبه': 4, 'جمعه': 5,
};

function nextWeekday(from: string, target: number): string {
  const d = new Date(from + 'T12:00:00');
  let delta = (target - d.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysKey(from, delta);
}

function parseTimeToken(raw: string): { time: string; len: number } | null {
  const s = normalizeDigits(raw).trim().toLowerCase();
  // 18:30 / 6:30pm / 6pm / 18
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (m) {
    let h = +m[1];
    if (m[3]?.startsWith('p') && h < 12) h += 12;
    if (m[3]?.startsWith('a') && h === 12) h = 0;
    if (h > 23 || +m[2] > 59) return null;
    return { time: `${String(h).padStart(2, '0')}:${m[2]}`, len: raw.length };
  }
  m = s.match(/^(\d{1,2})\s*(am|pm|a|p)$/);
  if (m) {
    let h = +m[1];
    if (h < 1 || h > 12) return null;
    if (m[2].startsWith('p') && h < 12) h += 12;
    if (m[2].startsWith('a') && h === 12) h = 0;
    return { time: `${String(h).padStart(2, '0')}:00`, len: raw.length };
  }
  return null;
}

export function parseQuickAdd(input: string, now = todayKey()): ParsedTask {
  const original = input.trim();
  let rest = ` ${original} `;
  const out: ParsedTask = {
    title: original, date: null, time: null, tags: [],
    priority: null, reminder: 'none', repeat: 'none',
  };
  if (!original) return out;
  const take = (re: RegExp, cb: (m: RegExpMatchArray) => void) => {
    const m = rest.match(re);
    if (m) { cb(m); rest = rest.replace(m[0], ' '); }
    return !!m;
  };

  // ---- tags (#work / #کار) ----
  const tagRe = /#([\p{L}\p{N}_-]+)/gu;
  let tm: RegExpExecArray | null;
  while ((tm = tagRe.exec(rest)) !== null) out.tags.push(tm[1]);
  rest = rest.replace(tagRe, ' ');

  const lower = () => ` ${normalizeDigits(rest).toLowerCase()} `;

  // ---- repeat ----
  if (/\bevery\s+day\b|\beveryday\b/.test(lower()) || rest.includes('هر روز') || rest.includes('هرروز')) {
    out.repeat = 'daily'; rest = rest.replace(/\bevery\s*day\b/gi, ' ').replace(/هر\s*روز/g, ' ');
  } else if (/\bevery\s+weekday\b|\bweekdays\b/.test(lower()) || rest.includes('روزهای کاری') || rest.includes('روز کاری')) {
    out.repeat = 'weekdays'; rest = rest.replace(/\bevery\s*weekdays?\b/gi, ' ').replace(/روزهای?\s*کاری/g, ' ');
  } else if (/\bevery\s+week\b|\bweekly\b/.test(lower()) || rest.includes('هر هفته')) {
    out.repeat = 'weekly'; rest = rest.replace(/\bevery\s*week\b|\bweekly\b/gi, ' ').replace(/هر\s*هفته/g, ' ');
  } else if (/\bevery\s+month\b|\bmonthly\b/.test(lower()) || rest.includes('هر ماه')) {
    out.repeat = 'monthly'; rest = rest.replace(/\bevery\s*month\b|\bmonthly\b/gi, ' ').replace(/هر\s*ماه/g, ' ');
  } else {
    const em = lower().match(/\bevery\s+(\w+day)\b/);
    if (em && EN_WEEKDAYS[em[1]] !== undefined) {
      out.repeat = 'weekly'; out.date = nextWeekday(now, EN_WEEKDAYS[em[1]]);
      rest = rest.replace(new RegExp(`\\bevery\\s+${em[1]}\\b`, 'i'), ' ');
    }
  }

  // ---- priority ----
  if (/\burgent\b|!!/.test(lower()) || /(ضروری|اورژانسی|فوری)/.test(rest)) {
    out.priority = 'urgent';
    rest = rest.replace(/\burgent\b/gi, ' ').replace(/!!/g, ' ').replace(/ضروری|اورژانسی|فوری/g, ' ');
  } else if (/\bhigh\b|\bimportant\b|!/.test(lower()) || /(مهم|بالا|پر اولویت)/.test(rest)) {
    out.priority = 'high';
    rest = rest.replace(/\bhigh\b|\bimportant\b/gi, ' ').replace(/مهم|بالا|پر\s*اولویت/g, ' ');
    // keep single "!" only if it was priority marker at end; preserve mid-sentence "!"
    if (/!\s*$/.test(rest)) rest = rest.replace(/!\s*$/, ' ');
  } else if (/\blow\b/.test(lower()) || /(کم‌اهمیت|کم اهمیت|کم)/.test(rest)) {
    // be careful: bare کم/کم‌اهمیت only
    if (/\blow\b/i.test(rest) || /کم‌?اهمیت/.test(rest)) {
      out.priority = 'low';
      rest = rest.replace(/\blow\b/gi, ' ').replace(/کم‌?اهمیت|کم\s*اهمیت/g, ' ');
    }
  }

  // ---- dates EN ----
  take(/\btomorrow\b/i, () => { out.date = addDaysKey(now, 1); });
  take(/\btonight\b/i, () => { out.date = now; if (!out.time) out.time = '20:00'; });
  take(/\btoday\b/i, () => { out.date = now; });
  if (!out.date) {
    const inm = lower().match(/\bin\s+(\d+)\s*(hour|hours|hr|hrs)\b/);
    if (inm) {
      const d = new Date();
      d.setHours(d.getHours() + +inm[1]);
      out.date = todayKey(d);
      out.time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      rest = rest.replace(/\bin\s+\d+\s*(hour|hours|hr|hrs)\b/i, ' ');
    }
  }
  take(/\bnext\s+week\b/i, () => { out.date = addDaysKey(now, 7); });
  if (!out.date) {
    const nwd = lower().match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (nwd) {
      out.date = nextWeekday(now, EN_WEEKDAYS[nwd[1]]);
      rest = rest.replace(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i, ' ');
    } else {
      const wd = lower().match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
      if (wd) {
        out.date = nextWeekday(now, EN_WEEKDAYS[wd[1]]);
        rest = rest.replace(new RegExp(`\\b${wd[1]}\\b`, 'i'), ' ');
      }
    }
  }

  // ---- dates FA ----
  if (rest.includes('پس‌فردا') || rest.includes('پس فردا')) { out.date = addDaysKey(now, 2); rest = rest.replace(/پس‌?فردا|پس\s*فردا/g, ' '); }
  else if (rest.includes('فردا')) { out.date ??= addDaysKey(now, 1); rest = rest.replace(/فردا/g, ' '); }
  if (rest.includes('امروز')) { out.date = now; rest = rest.replace(/امروز/g, ' '); }
  if (rest.includes('امشب')) { out.date = now; out.time ??= '20:00'; rest = rest.replace(/امشب/g, ' '); }
  if (rest.includes('هفته بعد') || rest.includes('هفته‌ی بعد')) { out.date ??= addDaysKey(now, 7); rest = rest.replace(/هفته‌?ی?\s*بعد/g, ' '); }
  if (!out.date) {
    // longest names first so "شنبه" can't shadow "دوشنبه" (substring)
    const ordered = Object.entries(FA_WEEKDAYS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, idx] of ordered) {
      const re = new RegExp(`(^|[\\s،,])${name}([\\s،,]|$)`);
      if (re.test(rest)) { out.date = nextWeekday(now, idx); rest = rest.replace(name, ' '); break; }
    }
  }

  // ---- time EN: "at 6pm", "6pm", "18:30" ----
  take(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i, (m) => {
    const p = parseTimeToken(m[1]);
    if (p) { out.time = p.time; } else { rest = ` ${m[1]} ` + rest; }
  });
  if (!out.time) {
    const all = rest.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi);
    if (all) {
      const p = parseTimeToken(all[all.length - 1]);
      if (p) { out.time = p.time; rest = rest.replace(all[all.length - 1], ' '); }
    }
  }
  if (!out.time) {
    const clock = rest.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (clock) { out.time = `${clock[1].padStart(2, '0')}:${clock[2]}`; rest = rest.replace(clock[0], ' '); }
  }

  // ---- time FA: "ساعت ۶" / "ساعت ۱۸:۳۰" ----
  const faClock = normalizeDigits(rest).match(/ساعت\s*(\d{1,2})(?::(\d{2}))?/);
  if (faClock) {
    const h = Math.min(23, +faClock[1]);
    const m = faClock[2] ? Math.min(59, +faClock[2]) : '00';
    // bare ساعت ۶ in the evening-ish contexts → keep as-is (06:00 would be odd for meetings, assume 18:00 for 1..7?)
    let hh = h;
    if (!faClock[2] && h >= 1 && h <= 7) hh = h + 12;
    if (h >= 8 && h <= 11 && /عصر|غروب|شب|بعدازظهر|بعد از ظهر/.test(rest)) hh = h + 12;
    out.time = `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    rest = rest.replace(/ساعت\s*[۰-۹٠-٩0-9]{1,2}(?::[۰-۹٠-٩0-9]{2})?/, ' ');
  }

  // ---- reminder hints: "remind me" / "یادآوری" ----
  if (/\bremind\b/i.test(rest) || rest.includes('یادآوری') || rest.includes('یادم بنداز') || rest.includes('یاداوری')) {
    out.reminder = out.time || out.date ? 'at' : 'none';
    rest = rest.replace(/\bremind(\s+me)?\b/gi, ' ').replace(/یادآوری|یادم\s*بنداز|یاداوری/g, ' ');
  }

  const title = rest.replace(/\s{2,}/g, ' ').replace(/[،,]\s*$/g, '').trim();
  out.title = title || original;
  return out;
}
