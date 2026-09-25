import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from '@/lib/parser';

const NOW = '2026-09-24'; // Thursday

describe('quick-add parser', () => {
  it('parses EN example from the spec', () => {
    const p = parseQuickAdd('Meeting with Ali tomorrow at 6pm #work high', NOW);
    expect(p.title).toBe('Meeting with Ali');
    expect(p.date).toBe('2026-09-25');
    expect(p.time).toBe('18:00');
    expect(p.tags).toEqual(['work']);
    expect(p.priority).toBe('high');
  });

  it('parses FA example from the spec', () => {
    const p = parseQuickAdd('فردا ساعت ۶ جلسه با علی #کار مهم', NOW);
    expect(p.title).toContain('جلسه با علی');
    expect(p.date).toBe('2026-09-25');
    expect(p.time).toBe('18:00');
    expect(p.tags).toEqual(['کار']);
    expect(p.priority).toBe('high');
  });

  it('understands today / tonight / every day', () => {
    expect(parseQuickAdd('Buy milk today', NOW).date).toBe(NOW);
    const t = parseQuickAdd('Wind down tonight', NOW);
    expect(t.date).toBe(NOW);
    expect(t.time).toBe('20:00');
    const r = parseQuickAdd('Standup every day at 09:00', NOW);
    expect(r.repeat).toBe('daily');
    expect(r.time).toBe('09:00');
  });

  it('understands weekday names', () => {
    const en = parseQuickAdd('Review on monday', NOW);
    expect(en.date).toBe('2026-09-28');
    const fa = parseQuickAdd('جلسه دوشنبه', NOW);
    expect(fa.date).toBe('2026-09-28');
  });

  it('understands پس‌فردا and in N hours', () => {
    expect(parseQuickAdd('تسک پس‌فردا', NOW).date).toBe('2026-09-26');
    const h = parseQuickAdd('Call back in 2 hours', NOW);
    expect(h.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('never destroys the original text', () => {
    const weird = '!!! grrr $$$ 2026 blah blah';
    const p = parseQuickAdd(weird, NOW);
    expect(p.title.length).toBeGreaterThan(0);
  });

  it('parses 24h time and bare ساعت with minutes', () => {
    expect(parseQuickAdd('جلسه ساعت ۱۸:۳۰', NOW).time).toBe('18:30');
    expect(parseQuickAdd('Standup 18:30', NOW).time).toBe('18:30');
  });
});
