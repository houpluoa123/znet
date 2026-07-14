import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

function isAdmin(request) {
  return request.user && request.user.role === 'admin';
}

export async function adminPanel(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const userCount = (await env.DB.prepare('SELECT COUNT(*) AS cnt FROM users').first()).cnt;
  const linkCount = (await env.DB.prepare('SELECT COUNT(*) AS cnt FROM links').first()).cnt;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Admin</title></head>
<body>
  <h2>Admin Panel</h2>
  <p>Users: ${userCount} | Links: ${linkCount}</p>
  <p><a href="/admin/users">Quản lý Users</a> | <a href="/admin/links">Quản lý Links</a> | <a href="/">Home</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function adminUsers(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const users = await env.DB.prepare('SELECT id, email, role, twofa_enabled, created_at FROM users').all();
  const rows = users.results.map(u => `
    <tr>
      <td>${u.id}</td><td>${u.email}</td><td>${u.role}</td>
      <td>${u.twofa_enabled ? 'Có' : 'Không'}</td><td>${u.created_at}</td>
      <td>
        <form method="POST" action="/admin/users/${u.id}/delete" style="display:inline"><button>Xóa</button></form>
        <form method="POST" action="/admin/users/${u.id}/reset-password" style="display:inline"><button>Reset MK</button></form>
      </td>
    </tr>`).join('');
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Users</title></head>
<body>
  <h2>Danh sách người dùng</h2>
  <table border="1"><tr><th>ID</th><th>Email</th><th>Role</th><th>2FA</th><th>Ngày tạo</th><th>Hành động</th></tr>${rows}</table>
  <a href="/admin">⬅ Quay lại Admin</a>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function adminDeleteUser(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const url = new URL(request.url);
  const userId = url.pathname.split('/')[3];
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return Response.redirect('/admin/users', 302);
}

export async function adminResetPassword(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const url = new URL(request.url);
  const userId = url.pathname.split('/')[3];
  const newPassword = nanoid(12);
  const hash = bcrypt.hashSync(newPassword, 10);
  await env.DB.prepare('UPDATE users SET password = ?, twofa_secret = NULL, twofa_enabled = 0 WHERE id = ?').bind(hash, userId).run();
  return new Response(`Mật khẩu mới cho user ID ${userId}: <b>${newPassword}</b><br><a href="/admin/users">Quay lại</a>`, { headers: { 'Content-Type': 'text/html' } });
}

export async function adminLinks(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const links = await env.DB.prepare(`
    SELECT l.id, l.original_url, l.short_code, l.clicks, l.created_at, u.email
    FROM links l LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `).all();
  const rows = links.results.map(l => `
    <tr>
      <td>${l.id}</td><td>${l.original_url}</td><td>${l.short_code}</td>
      <td>${l.clicks}</td><td>${l.email || 'Khách'}</td><td>${l.created_at}</td>
      <td><form method="POST" action="/admin/links/${l.id}/delete"><button>Xóa</button></form></td>
    </tr>`).join('');
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Links</title></head>
<body>
  <h2>Quản lý tất cả link</h2>
  <table border="1"><tr><th>ID</th><th>URL</th><th>Mã</th><th>Clicks</th><th>Người tạo</th><th>Ngày</th><th></th></tr>${rows}</table>
  <a href="/admin">⬅ Quay lại Admin</a>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function adminDeleteLink(request, env) {
  if (!isAdmin(request)) return new Response('Forbidden', { status: 403 });
  const url = new URL(request.url);
  const linkId = url.pathname.split('/')[3];
  await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(linkId).run();
  return Response.redirect('/admin/links', 302);
    }
