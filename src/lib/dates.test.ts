import { describe, it, expect } from 'vitest';
import { todayKey, addDaysKey, diffDays, g2j, j2g, headerDate, relDay } from '@/lib/dates';

describe('jalali dates', () => {
  it('converts Sep 24 2026 -> 2 Mehr 1405', () => {
    const j = g2j('2026-09-24');
    expect(j.jy).toBe(1405);
    expect(j.jm).toBe(7);
    expect(j.jd).toBe(2);
  });

  it('round-trips jalaali -> gregorian', () => {
    expect(j2g(1405, 7, 2)).toBe('2026-09-24');
  });

  it('formats dual header sensibly', () => {
    const h = headerDate('2026-09-24', 'fa', 'dual');
    expect(h.line1).toContain('مهر');
    expect(h.line2).toContain('September');
    const en = headerDate('2026-09-24', 'en', 'dual');
    expect(en.line1).toContain('September');
  });
});

describe('relative labels', () => {
  it('en today/tomorrow/yesterday', () => {
    expect(relDay('2026-09-24', 'en', '2026-09-24')).toBe('Today');
    expect(relDay('2026-09-25', 'en', '2026-09-24')).toBe('Tomorrow');
    expect(relDay('2026-09-23', 'en', '2026-09-24')).toBe('Yesterday');
  });
  it('fa امروز/فردا/پس‌فردا/دیروز', () => {
    expect(relDay('2026-09-24', 'fa', '2026-09-24')).toBe('امروز');
    expect(relDay('2026-09-25', 'fa', '2026-09-24')).toBe('فردا');
    expect(relDay('2026-09-26', 'fa', '2026-09-24')).toBe('پس‌فردا');
    expect(relDay('2026-09-23', 'fa', '2026-09-24')).toBe('دیروز');
  });
});

describe('arithmetic', () => {
  it('addDays/diffDays are consistent', () => {
    expect(addDaysKey('2026-09-24', 7)).toBe('2026-10-01');
    expect(diffDays('2026-09-25', '2026-09-24')).toBe(1);
    expect(todayKey(new Date(2026, 8, 24))).toBe('2026-09-24');
  });
});
