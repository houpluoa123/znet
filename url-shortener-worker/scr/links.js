import { nanoid } from 'nanoid';

export async function shorten(request, env) {
  const formData = await request.formData();
  let url = formData.get('url');
  if (!url) return new Response('Thiếu URL', { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  let shortCode;
  let attempts = 0;
  do {
    shortCode = nanoid(7);
    const exists = await env.DB.prepare('SELECT id FROM links WHERE short_code = ?').bind(shortCode).first();
    if (!exists) break;
    attempts++;
    if (attempts > 10) return new Response('Không thể tạo mã duy nhất', { status: 500 });
  } while (true);
  const userId = request.user?.id || null;
  await env.DB.prepare('INSERT INTO links (original_url, short_code, user_id) VALUES (?, ?, ?)').bind(url, shortCode, userId).run();
  const shortUrl = `${new URL(request.url).origin}/${shortCode}`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Kết quả</title></head>
<body>
  <p>✅ Link rút gọn: <a href="${shortUrl}">${shortUrl}</a></p>
  <p><a href="/shorten">Rút gọn tiếp</a> | <a href="/">Home</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function redirect(request, env) {
  const url = new URL(request.url);
  const shortCode = url.pathname.slice(1);
  const knownRoutes = ['register', 'login', 'logout', 'shorten', 'dashboard', 'admin', '2fa'];
  if (knownRoutes.includes(shortCode) || shortCode === '') return;
  const link = await env.DB.prepare('SELECT * FROM links WHERE short_code = ?').bind(shortCode).first();
  if (!link) return new Response('Link không tồn tại', { status: 404 });
  await env.DB.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?').bind(link.id).run();
  return Response.redirect(link.original_url, 302);
}

export async function dashboard(request, env) {
  const user = request.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const links = await env.DB.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  const list = links.results.map(l => `
    <tr>
      <td>${l.original_url}</td>
      <td><a href="/${l.short_code}">${l.short_code}</a></td>
      <td>${l.clicks}</td>
      <td>${l.created_at}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Dashboard</title></head>
<body>
  <h2>Dashboard của bạn</h2>
  <table border="1"><tr><th>URL gốc</th><th>Mã</th><th>Lượt click</th><th>Ngày tạo</th></tr>${list}</table>
  <p><a href="/shorten">Rút gọn link mới</a> | <a href="/">Home</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
