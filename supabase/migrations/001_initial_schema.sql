-- Mz Planer — minimal server schema (v2)
-- ذخیره‌سازی سمت سرور فقط برای ۲ چیز:
--   ۱) ترافیک/آنالیتیکس برای پنل ادمین
--   ۲) اسنپ‌شات یادآوری‌ها برای کرون تلگرام
-- دیتای کاربر (تسک/عادت/یادداشت) در localStorage مرورگر خودش می‌ماند.

create table if not exists analytics_events (
  id          text primary key,          -- uuid v4
  ts          text not null,             -- ISO8601 UTC
  session     text not null,             -- uuid per browser session
  event       text not null,             -- 'pageview' | 'task_create' | ...
  path        text,                      -- '/admin', '/today', ...
  lang        text,                      -- 'en' | 'fa'
  device      text,                      -- 'desktop' | 'mobile' | 'tablet'
  referrer    text,
  ua          text
);
create index if not exists idx_analytics_ts     on analytics_events (ts);
create index if not exists idx_analytics_event  on analytics_events (event, ts);
create index if not exists idx_analytics_session on analytics_events (session, ts);

create table if not exists relay_snapshots (
  id         integer primary key autoincrement,
  ts         text not null,
  payload    text not null,               -- JSON blob (same shape as .reminders/inbox.json)
  sent_json  text                         -- JSON array of {key, sentAt} for dedupe
);
create index if not exists idx_relay_ts on relay_snapshots (ts desc);
