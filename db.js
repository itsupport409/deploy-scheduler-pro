const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'scheduler.db');

let db = null;

const DEFAULT_LOCATIONS = [
  { id: '1', name: 'Downtown Service Center', calendarId: 'icecoldair_downtown@group.calendar.google.com' },
  { id: '2', name: 'Westside Rapid Repair', calendarId: 'icecoldair_westside@group.calendar.google.com' },
];

const DEFAULT_USERS = [
  { id: 'u0', name: 'A Butler', role: 'Administrator', email: 'abutler@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
  { id: 'u1', name: 'Scott S', role: 'General Manager', email: 'scotts@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
  { id: 'u2', name: 'Business Office', role: 'HR Business Office Manager', email: 'office@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveDb() {
  if (!db) return;
  ensureDataDir();
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function rowArrayToObjects(columns, rows) {
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function runQuery(database, sql) {
  const r = database.exec(sql);
  if (!r || r.length === 0) return [];
  return rowArrayToObjects(r[0].columns, r[0].values);
}

function initSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      avatar TEXT,
      eligible_location_ids TEXT
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS deleted_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      avatar TEXT,
      eligible_location_ids TEXT
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      calendar_id TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      title TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location_id TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS template_shifts (
      template_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      day_offset INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      title TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      type TEXT NOT NULL,
      details TEXT,
      target_date TEXT NOT NULL,
      end_date TEXT,
      in_time TEXT,
      out_time TEXT,
      time_block TEXT,
      pay_type TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      subject TEXT,
      content TEXT,
      sent_at TEXT NOT NULL,
      type TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(database) {
  const rows = runQuery(database, 'SELECT COUNT(*) AS n FROM users');
  if (rows[0] && rows[0].n > 0) return;

  for (const u of DEFAULT_USERS) {
    database.run(
      'INSERT INTO users (id, name, role, email, password, avatar, eligible_location_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, u.email, u.password || '', u.avatar || '', JSON.stringify(u.eligibleLocationIds || [])]
    );
  }
  for (const loc of DEFAULT_LOCATIONS) {
    database.run('INSERT INTO locations (id, name, calendar_id) VALUES (?, ?, ?)', [loc.id, loc.name, loc.calendarId]);
  }
}

function init() {
  if (db) return Promise.resolve();
  return initSqlJs().then(SQLite => {
    ensureDataDir();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQLite.Database(fileBuffer);
    } else {
      db = new SQLite.Database();
      initSchema(db);
      seedIfEmpty(db);
      saveDb();
    }
    const tables = runQuery(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (tables.length === 0) {
      initSchema(db);
      seedIfEmpty(db);
      saveDb();
    } else {
      const userCount = runQuery(db, 'SELECT COUNT(*) AS n FROM users')[0];
      if (userCount && userCount.n === 0) {
        seedIfEmpty(db);
        saveDb();
      }
    }
  });
}

function getDb() {
  return db;
}

function getState() {
  const database = getDb();

  const users = runQuery(database, 'SELECT * FROM users').map(row => ({
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    password: row.password,
    avatar: row.avatar || '',
    eligibleLocationIds: row.eligible_location_ids ? JSON.parse(row.eligible_location_ids) : [],
  }));

  const deletedUsers = runQuery(database, 'SELECT * FROM deleted_users').map(row => ({
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    password: row.password,
    avatar: row.avatar || '',
    eligibleLocationIds: row.eligible_location_ids ? JSON.parse(row.eligible_location_ids) : [],
  }));

  const locations = runQuery(database, 'SELECT * FROM locations').map(row => ({
    id: row.id,
    name: row.name,
    calendarId: row.calendar_id,
  }));

  const shifts = runQuery(database, 'SELECT * FROM shifts').map(row => ({
    id: row.id,
    userId: row.user_id,
    locationId: row.location_id,
    start: row.start,
    end: row.end,
    title: row.title,
    locked: Boolean(row.locked),
  }));

  const templateRows = runQuery(database, 'SELECT * FROM templates');
  const templateShiftsRows = runQuery(database, 'SELECT * FROM template_shifts');
  const templates = templateRows.map(t => ({
    id: t.id,
    name: t.name,
    locationId: t.location_id,
    shifts: templateShiftsRows
      .filter(ts => ts.template_id === t.id)
      .map(ts => ({
        userId: ts.user_id,
        dayOffset: ts.day_offset,
        startTime: ts.start_time,
        endTime: ts.end_time,
        title: ts.title,
      })),
  }));

  const requests = runQuery(database, 'SELECT * FROM requests').map(row => ({
    id: row.id,
    requesterId: row.requester_id,
    type: row.type,
    details: row.details || '',
    targetDate: row.target_date,
    endDate: row.end_date || undefined,
    inTime: row.in_time || undefined,
    outTime: row.out_time || undefined,
    timeBlock: row.time_block || undefined,
    payType: row.pay_type || undefined,
    status: row.status,
    createdAt: row.created_at,
  }));

  const notifications = runQuery(database, 'SELECT * FROM notifications').map(row => ({
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    subject: row.subject || '',
    content: row.content || '',
    sentAt: row.sent_at,
    type: row.type,
  }));

  return {
    users,
    deletedUsers,
    locations,
    shifts,
    templates,
    requests,
    notifications,
  };
}

function setState(payload) {
  const database = getDb();
  database.run('DELETE FROM users');
  database.run('DELETE FROM deleted_users');
  database.run('DELETE FROM locations');
  database.run('DELETE FROM shifts');
  database.run('DELETE FROM template_shifts');
  database.run('DELETE FROM templates');
  database.run('DELETE FROM requests');
  database.run('DELETE FROM notifications');

  for (const u of payload.users || []) {
    database.run(
      'INSERT INTO users (id, name, role, email, password, avatar, eligible_location_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, u.email, u.password || '', u.avatar || '', JSON.stringify(u.eligibleLocationIds || [])]
    );
  }
  for (const u of payload.deletedUsers || []) {
    database.run(
      'INSERT INTO deleted_users (id, name, role, email, password, avatar, eligible_location_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, u.email, u.password || '', u.avatar || '', JSON.stringify(u.eligibleLocationIds || [])]
    );
  }
  for (const loc of payload.locations || []) {
    database.run('INSERT INTO locations (id, name, calendar_id) VALUES (?, ?, ?)', [loc.id, loc.name, loc.calendarId]);
  }
  for (const s of payload.shifts || []) {
    database.run(
      'INSERT INTO shifts (id, user_id, location_id, start, end, title, locked) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.userId, s.locationId, s.start, s.end, s.title, s.locked ? 1 : 0]
    );
  }
  for (const t of payload.templates || []) {
    database.run('INSERT INTO templates (id, name, location_id) VALUES (?, ?, ?)', [t.id, t.name, t.locationId]);
    for (const ts of t.shifts || []) {
      database.run(
        'INSERT INTO template_shifts (template_id, user_id, day_offset, start_time, end_time, title) VALUES (?, ?, ?, ?, ?, ?)',
        [t.id, ts.userId, ts.dayOffset, ts.startTime, ts.endTime, ts.title]
      );
    }
  }
  for (const r of payload.requests || []) {
    database.run(
      'INSERT INTO requests (id, requester_id, type, details, target_date, end_date, in_time, out_time, time_block, pay_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [r.id, r.requesterId, r.type, r.details || '', r.targetDate, r.endDate || null, r.inTime || null, r.outTime || null, r.timeBlock || null, r.payType || null, r.status, r.createdAt]
    );
  }
  for (const n of payload.notifications || []) {
    database.run(
      'INSERT INTO notifications (id, user_id, user_name, user_email, subject, content, sent_at, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [n.id, n.userId || '', n.userName || '', n.userEmail || '', n.subject || '', n.content || '', n.sentAt, n.type]
    );
  }

  saveDb();
}

function getDbSize() {
  try {
    if (!fs.existsSync(DB_PATH)) return { sizeKb: 0, sizeLabel: '0 KB' };
    const stat = fs.statSync(DB_PATH);
    const kb = (stat.size / 1024).toFixed(2);
    return { sizeKb: parseFloat(kb), sizeLabel: `${kb} KB` };
  } catch {
    return { sizeKb: 0, sizeLabel: '0 KB' };
  }
}

function resetDatabase() {
  const database = getDb();
  database.run('DELETE FROM notifications');
  database.run('DELETE FROM requests');
  database.run('DELETE FROM template_shifts');
  database.run('DELETE FROM templates');
  database.run('DELETE FROM shifts');
  database.run('DELETE FROM locations');
  database.run('DELETE FROM deleted_users');
  database.run('DELETE FROM users');
  seedIfEmpty(database);
  saveDb();
}

module.exports = {
  init,
  getState,
  setState,
  getDbSize,
  resetDatabase,
  DEFAULT_USERS,
  DEFAULT_LOCATIONS,
};
