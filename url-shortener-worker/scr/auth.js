import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import * as jose from 'jose';
import { createUser, getUserByEmail, getUserById } from './db';

function getSecret(env) {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

async function signJWT(payload, env) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret(env));
}

function setCookie(response, name, value, maxAge = 604800) {
  response.headers.append('Set-Cookie', `${name}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
}

export async function handleRegister(request, env) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  if (!email || !password) return new Response('Thiếu thông tin', { status: 400 });
  try {
    const hash = bcrypt.hashSync(password, 10);
    await createUser(env.DB, email, hash);
    return new Response(null, {
      status: 302,
      headers: { Location: '/?registered=1' }
    });
  } catch (e) {
    return new Response('Email đã tồn tại', { status: 400 });
  }
}

export async function handleLogin(request, env) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const user = await getUserByEmail(env.DB, email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return new Response('Sai email hoặc mật khẩu', { status: 401 });
  }
  if (user.twofa_enabled) {
    const tempToken = await new jose.SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(getSecret(env));
    const response = new Response(null, { status: 302, headers: { Location: '/login/2fa' } });
    setCookie(response, 'temp', tempToken, 300);
    return response;
  }
  const token = await signJWT({ id: user.id, email: user.email, role: user.role }, env);
  const response = new Response(null, { status: 302, headers: { Location: '/' } });
  setCookie(response, 'token', token);
  return response;
}

export async function handle2FASetup(request, env) {
  const user = request.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const dbUser = await getUserById(env.DB, user.id);
  if (!dbUser) return new Response('User not found', { status: 404 });
  let secret = dbUser.twofa_secret;
  if (!secret) {
    const generated = speakeasy.generateSecret({ length: 20, name: `URLShortener (${dbUser.email})` });
    secret = generated.base32;
    await env.DB.prepare('UPDATE users SET twofa_secret = ? WHERE id = ?').bind(secret, dbUser.id).run();
  }
  const otpauth_url = speakeasy.otpauthURL({ secret: secret, label: dbUser.email, issuer: 'URLShortener' });
  // Tạo QR code dạng SVG (hoạt động trên Workers)
  let qrSvg = '';
  try {
    qrSvg = await new Promise((resolve, reject) => {
      QRCode.toString(otpauth_url, { type: 'svg' }, (err, svg) => {
        if (err) reject(err);
        else resolve(svg);
      });
    });
  } catch (err) {
    return new Response('Lỗi tạo QR code', { status: 500 });
  }
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Thiết lập 2FA</title></head>
<body>
  <h2>Quét mã QR bằng Google Authenticator</h2>
  <div>${qrSvg}</div>
  <form method="POST" action="/2fa/verify-setup">
    <input name="token" placeholder="Mã 6 số" required>
    <button type="submit">Xác nhận & bật 2FA</button>
  </form>
  <p><a href="/">Quay lại</a></p>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function handle2FAVerify(request, env) {
  const user = request.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const formData = await request.formData();
  const token = formData.get('token');
  const dbUser = await getUserById(env.DB, user.id);
  if (!dbUser || !dbUser.twofa_secret) return new Response('Yêu cầu tạo secret trước', { status: 400 });
  const verified = speakeasy.totp.verify({
    secret: dbUser.twofa_secret,
    encoding: 'base32',
    token: token,
    window: 1
  });
  if (!verified) return new Response('Mã không đúng', { status: 400 });
  await env.DB.prepare('UPDATE users SET twofa_enabled = 1 WHERE id = ?').bind(user.id).run();
  return new Response(null, { status: 302, headers: { Location: '/?2fa=on' } });
}

export async function handleLogin2FA(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const tempToken = cookieHeader.split('; ').find(r => r.startsWith('temp='))?.split('=')[1];
  if (!tempToken) return new Response('Yêu cầu đăng nhập lại', { status: 401 });
  let payload;
  try {
    const { payload: p } = await jose.jwtVerify(tempToken, getSecret(env));
    payload = p;
  } catch (e) {
    return new Response('Token hết hạn', { status: 401 });
  }
  const formData = await request.formData();
  const token = formData.get('token');
  const user = await getUserById(env.DB, payload.userId);
  if (!user || !user.twofa_secret) return new Response('Người dùng không tồn tại', { status: 400 });
  const verified = speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: 'base32',
    token: token,
    window: 1
  });
  if (!verified) return new Response('Mã 2FA không đúng', { status: 401 });
  const mainToken = await signJWT({ id: user.id, email: user.email, role: user.role }, env);
  const response = new Response(null, { status: 302, headers: { Location: '/' } });
  setCookie(response, 'token', mainToken);
  response.headers.append('Set-Cookie', `temp=; HttpOnly; Path=/; Max-Age=0`);
  return response;
}

export async function logout(request, env) {
  const response = new Response(null, { status: 302, headers: { Location: '/' } });
  response.headers.append('Set-Cookie', `token=; HttpOnly; Path=/; Max-Age=0`);
  return response;
}
