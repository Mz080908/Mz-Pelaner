import { toJalaali as toJ, toGregorian as toG, isLeapJalaaliYear, jalaaliMonthLength } from 'jalaali-js';
import type { CalendarMode, Lang } from './types';
import { pad2 } from './utils';

export { isLeapJalaaliYear, jalaaliMonthLength };

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysKey(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function diffDays(a: string, b: string): number {
  const ms = parseKey(a).getTime() - parseKey(b).getTime();
  return Math.round(ms / 86400000);
}

export function startOfWeekKey(key: string, weekStartsOn: 0 | 1): string {
  const d = parseKey(key);
  const dow = d.getDay();
  const shift = weekStartsOn === 1 ? (dow + 6) % 7 : dow;
  d.setDate(d.getDate() - shift);
  return todayKey(d);
}

export function weekKeys(key: string, weekStartsOn: 0 | 1): string[] {
  const s = startOfWeekKey(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(s, i));
}

export function monthCells(viewKey: string, weekStartsOn: 0 | 1): string[] {
  const [y, m] = viewKey.split('-').map(Number);
  const first = `${y}-${pad2(m)}-01`;
  const start = startOfWeekKey(first, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDaysKey(start, i));
}

export interface JDate { jy: number; jm: number; jd: number }

export function g2j(key: string): JDate {
  const d = parseKey(key);
  return toJ(d) as JDate;
}

export function j2g(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toG(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

export const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
export const FA_WEEKDAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
export const FA_WEEKDAYS_SHORT = ['ش','ی','د','س','چ','پ','ج'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// Persian transliterations for Gregorian months (used only when explicitly
// showing a Gregorian date in Persian UI — never mix with Jalali month names)
const FA_GREG_MONTHS = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
export function faNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

export function gregLabel(key: string, lang: Lang): string {
  const d = parseKey(key);
  if (lang === 'fa') return `${faNum(d.getDate())} ${FA_GREG_MONTHS[d.getMonth()]} ${faNum(d.getFullYear())}`;
  return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Effective calendar for a language: Persian UI → Jalali, English UI → Gregorian.
 *  'dual' stays dual. */
export function effCalendar(cal: CalendarMode, lang: Lang): CalendarMode {
  if (cal === 'dual') return 'dual';
  return lang === 'fa' ? 'jalali' : 'gregorian';
}

export function jalaliLabel(key: string): string {
  const { jy, jm, jd } = g2j(key);
  return `${faNum(jd)} ${FA_MONTHS[jm - 1]} ${faNum(jy)}`;
}

export function headerDate(key: string, lang: Lang, cal: CalendarMode): { line1: string; line2: string | null } {
  const ec = effCalendar(cal, lang);
  if (ec === 'jalali') return { line1: jalaliLabel(key), line2: gregLabel(key, lang) };
  if (ec === 'dual') {
    return lang === 'fa'
      ? { line1: jalaliLabel(key), line2: gregLabel(key, 'en') }
      : { line1: gregLabel(key, 'en'), line2: jalaliLabel(key) };
  }
  return { line1: gregLabel(key, lang), line2: lang === 'fa' ? jalaliLabel(key) : null };
}

export function weekdayName(key: string, lang: Lang): string {
  const d = parseKey(key);
  if (lang === 'fa') return FA_WEEKDAYS[(d.getDay() + 1) % 7];
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function weekdayShort(idx: number, lang: Lang): string {
  // idx 0=Sunday..6=Saturday
  if (lang === 'fa') return FA_WEEKDAYS_SHORT[(idx + 1) % 7];
  return ['S','M','T','W','T','F','S'][idx];
}

export function relDay(key: string, lang: Lang, now = todayKey()): string {
  const delta = diffDays(key, now);
  if (lang === 'fa') {
    if (delta === 0) return 'امروز';
    if (delta === 1) return 'فردا';
    if (delta === 2) return 'پس‌فردا';
    if (delta === -1) return 'دیروز';
    if (delta < -1) return `${faNum(-delta)} روز پیش`;
    if (delta < 7) return `${faNum(delta)} روز دیگر`;
    return jalaliLabel(key);
  }
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta < -1) return `${-delta}d ago`;
  if (delta < 7) return `In ${delta}d`;
  const d = parseKey(key);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtTime(t: string | null, hour12: boolean, lang: Lang): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (!hour12) return lang === 'fa' ? faNum(`${pad2(h)}:${pad2(m)}`) : `${pad2(h)}:${pad2(m)}`;
  const ap = h >= 12 ? (lang === 'fa' ? 'ب.ظ' : 'PM') : (lang === 'fa' ? 'ق.ظ' : 'AM');
  const hh = h % 12 === 0 ? 12 : h % 12;
  return lang === 'fa' ? `${faNum(hh)}:${faNum(pad2(m))} ${ap}` : `${hh}:${pad2(m)} ${ap}`;
}

export function groupOfTime(t: string | null): 'morning' | 'afternoon' | 'evening' | 'none' {
  if (!t) return 'none';
  const h = +t.split(':')[0];
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/* =================================================================== */
/* Jalali calendar helpers — month grid, navigation, week keys          */
/* =================================================================== */

export interface JMonthInfo { jy: number; jm: number; jd: number; gKey: string }

export function getJalaaliMonthStart(jy: number, jm: number): string {
  const { gy, gm, gd } = toG(jy, jm, 1);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

export function jalaaliMonthLengthLocal(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export function jalaaliAddMonths(jy: number, jm: number, n: number): { jy: number; jm: number } {
  let month = jm + n;
  let year = jy;
  while (month > 12) { month -= 12; year += 1; }
  while (month < 1) { month += 12; year -= 1; }
  return { jy: year, jm: month };
}

export function jalaaliMonthCells(viewKey: string, weekStartsOn: 0 | 1): string[] {
  const { jy, jm } = g2j(viewKey);
  const firstGKey = getJalaaliMonthStart(jy, jm);
  const start = startOfWeekKey(firstGKey, weekStartsOn);
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDaysKey(start, i));
  }
  return cells;
}

export function jalaaliWeekKeys(viewKey: string, weekStartsOn: 0 | 1): string[] {
  const start = startOfWeekKey(viewKey, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

export function jalaaliNavKey(viewKey: string, dir: number): string {
  const { jy, jm } = g2j(viewKey);
  const { jy: ny, jm: nm } = jalaaliAddMonths(jy, jm, dir);
  return getJalaaliMonthStart(ny, nm);
}
