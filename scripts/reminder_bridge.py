#!/usr/bin/env python3
"""
Mz Planer → Telegram Reminder Bridge

Reads the local relay file (.reminders/inbox.json) written by the Next.js
/api/relay endpoint, and sends due/overdue reminders to the configured
Telegram bot at the exact reminderAt time.

Runs as a cron/daemon — checks every 30 seconds by default.
"""

import json
import os
import sys
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

# --- Config --------------------------------------------------------------
RELAY_FILE = Path(__file__).parent.parent / '.reminders' / 'inbox.json'
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or '8972631162:AAEKHbkA3xiBE299c2VNOjdbL8z_G9i5icE'
CHAT_ID = os.getenv('TELEGRAM_CHAT_ID') or '6730837278'
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '30'))  # seconds
SENT_CACHE_FILE = Path(__file__).parent.parent / '.reminders' / 'sent_cache.json'
# -------------------------------------------------------------------------

TG_API = f'https://api.telegram.org/bot{BOT_TOKEN}'
PROXY = {'http': 'http://127.0.0.1:9081', 'https': 'http://127.0.0.1:9081'}


def load_cache() -> dict:
    try:
        with open(SENT_CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_cache(cache: dict):
    try:
        SENT_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SENT_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def send_telegram(text: str, parse_mode: str = 'HTML') -> bool:
    try:
        r = requests.post(
            f'{TG_API}/sendMessage',
            json={'chat_id': CHAT_ID, 'text': text, 'parse_mode': parse_mode},
            proxies=PROXY,
            timeout=10,
        )
        return r.ok
    except Exception as e:
        print(f'[ERROR] Telegram send failed: {e}', file=sys.stderr)
        return False


def format_task_reminder(task: dict, is_overdue: bool = False) -> str:
    icon = '🔴' if is_overdue else '⏰'
    priority_emoji = {
        'urgent': '🔴', 'high': '🟠', 'normal': '🔵', 'low': '🟣',
    }.get(task.get('priority', 'normal'), '🔵')
    title = task.get('title', 'بدون عنوان')
    date_str = task.get('date') or 'بدون تاریخ'
    time_str = task.get('time') or 'کل روز'
    if is_overdue:
        return (
            f'{icon} <b>عقب‌افتاده (Overdue)</b> {priority_emoji}\n'
            f'📋 {title}\n'
            f'📅 {date_str} · ⏱ {time_str}'
        )
    reminder_at = task.get('reminderAt')
    if reminder_at:
        dt = datetime.fromisoformat(reminder_at.replace('Z', '+00:00'))
        reminder_str = dt.strftime('%Y-%m-%d %H:%M')
        return (
            f'{icon} <b>یادآوری</b> {priority_emoji}\n'
            f'📋 {title}\n'
            f'⏰ تنظیم شده برای: {reminder_str}'
        )
    return f'{icon} <b>یادآوری</b> {priority_emoji}\n📋 {title}'


def process_due(now_ts: float, cache: dict) -> dict:
    if not RELAY_FILE.exists():
        return cache

    try:
        with open(RELAY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f'[WARN] Failed to read relay file: {e}', file=sys.stderr)
        return cache

    if not data or not isinstance(data, dict):
        return cache

    due_list = data.get('due', []) or []
    overdue_list = data.get('overdue', []) or []

    # Due reminders — send if reminderAt is now or past (within 60s window)
    for task in due_list:
        reminder_at = task.get('reminderAt')
        if not reminder_at:
            continue
        try:
            rem_ts = datetime.fromisoformat(reminder_at.replace('Z', '+00:00')).timestamp()
        except Exception:
            continue
        task_id = task.get('id')
        cache_key = f'reminder:{task_id}'
        if rem_ts <= now_ts + 60 and cache.get(cache_key) != reminder_at:
            msg = format_task_reminder(task)
            if send_telegram(msg):
                cache[cache_key] = reminder_at
                print(f'[INFO] Sent reminder for task {task_id}: {task.get("title")[:40]}')

    # Overdue — send once per day (cache key includes date)
    today_key = datetime.now().strftime('%Y-%m-%d')
    for task in overdue_list:
        task_id = task.get('id')
        cache_key = f'overdue:{task_id}:{today_key}'
        if not cache.get(cache_key):
            msg = format_task_reminder(task, is_overdue=True)
            if send_telegram(msg):
                cache[cache_key] = True
                print(f'[INFO] Sent overdue notice for task {task_id}: {task.get("title")[:40]}')

    return cache


def main():
    print('[INFO] Mz Planer → Telegram Reminder Bridge started')
    print(f'[INFO] Polling {RELAY_FILE} every {CHECK_INTERVAL}s')
    print(f'[INFO] Bot: @Mz08Hermes_bot, Chat: {CHAT_ID}')
    cache = load_cache()
    try:
        while True:
            now_ts = time.time()
            cache = process_due(now_ts, cache)
            save_cache(cache)
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        print('\n[INFO] Bridge stopped by user')
    except Exception as e:
        print(f'[ERROR] Bridge crashed: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()