// src/db.js
export async function initDB(db) {
  // Tạo bảng nếu chưa có
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      twofa_secret TEXT,
      twofa_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Tạo tài khoản admin mặc định nếu chưa có
  const adminEmail = 'admin@example.com'; // lấy từ biến môi trường sau
  const adminPassword = 'Admin123!@#';   // nên dùng env
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(adminEmail).first();
  if (!existing) {
    const bcrypt = await import('bcryptjs');
    const hash = bcrypt.hashSync(adminPassword, 10);
    await db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').bind(adminEmail, hash, 'admin').run();
  }
}

// Các hàm helper query
export function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export function getUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export function createUser(db, email, passwordHash) {
  return db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').bind(email, passwordHash).run();
}

// ... thêm các hàm khác khi cần
