CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  accent TEXT NOT NULL DEFAULT '#24786f',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id TEXT NOT NULL,
  member_id INTEGER,
  author TEXT NOT NULL,
  avatar TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  image TEXT,
  recognition TEXT,
  assistant TEXT,
  views INTEGER NOT NULL DEFAULT 1,
  likes INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  member_id INTEGER,
  author TEXT NOT NULL,
  avatar TEXT NOT NULL,
  body TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_thread_id ON replies (thread_id);

INSERT OR IGNORE INTO boards (id, name, description, accent) VALUES
  ('identify', '照片辨識', '上傳照片判斷寵物類型，再讓大家一起確認', '#24786f'),
  ('clinic', '健康照護', '症狀、就醫、用藥與照護經驗', '#315c96'),
  ('daily', '日常曬寵', '生活紀錄、用品心得、照片分享', '#d95738'),
  ('adoption', '領養送養', '認養條件、中途募集、送養資訊', '#7d6b1f'),
  ('training', '行為訓練', '社會化、分離焦慮、口令與習慣', '#774c9f'),
  ('lost', '走失協尋', '通報、目擊線索、地點追蹤', '#8b3e62');
