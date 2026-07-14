export function renderHome(user) {
  if (user) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>URL Shortener</title></head>
<body>
  <h2>Xin chào ${user.email} (${user.role})</h2>
  <a href="/shorten">➕ Rút gọn link</a> | 
  <a href="/dashboard">📊 Dashboard</a> |
  ${user.role === 'admin' ? '<a href="/admin">⚙️ Admin</a> | ' : ''}
  <a href="/logout">Đăng xuất</a>
</body>
</html>`;
  }
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>URL Shortener</title></head>
<body>
  <h2>Đăng nhập</h2>
  <form method="POST" action="/login">
    <input name="email" placeholder="Email" required><br>
    <input name="password" type="password" placeholder="Mật khẩu" required><br>
    <button type="submit">Đăng nhập</button>
  </form>
  <p>Chưa có tài khoản? <a href="/register">Đăng ký</a></p>
</body>
</html>`;
}

export function renderRegister() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Đăng ký</title></head>
<body>
  <h2>Đăng ký</h2>
  <form method="POST" action="/register">
    <input name="email" placeholder="Email" required><br>
    <input name="password" type="password" placeholder="Mật khẩu" required><br>
    <button type="submit">Đăng ký</button>
  </form>
  <p>Đã có tài khoản? <a href="/">Đăng nhập</a></p>
</body>
</html>`;
}

export function render2FALogin() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Nhập mã 2FA</title></head>
<body>
  <h2>Nhập mã xác thực hai yếu tố</h2>
  <form method="POST" action="/login/2fa">
    <input name="token" placeholder="Mã 6 số" required>
    <button type="submit">Xác nhận</button>
  </form>
</body>
</html>`;
}

export function renderShorten() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Rút gọn URL</title></head>
<body>
  <h2>Rút gọn URL</h2>
  <form method="POST" action="/shorten">
    <input name="url" placeholder="https://..." size="50" required><br>
    <button type="submit">Rút gọn</button>
  </form>
  <a href="/">🏠 Home</a>
</body>
</html>`;
}
