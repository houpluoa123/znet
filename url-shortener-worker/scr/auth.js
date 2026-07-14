// src/auth.js
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createUser, getUserByEmail, getUserById } from './db';

// Hàm tạo token JWT đơn giản (HS256)
async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => btoa(JSON.stringify(obj));
  const unsignedToken = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsignedToken));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${sigB64}`;
}

function setTokenCookie(response, token) {
  response.headers.set('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800`);
}

export async function handleRegister(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return new Response('Thiếu thông tin', { status: 400 });
  try {
    const hash = bcrypt.hashSync(password, 10);
    await createUser(env.DB, email, hash);
    return new Response('Đăng ký thành công', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (e) {
    return new Response('Email đã tồn tại', { status: 400 });
  }
}

export async function handleLogin(request, env) {
  const { email, password } = await request.json();
  const user = await getUserByEmail(env.DB, email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return new Response('Sai email hoặc mật khẩu', { status: 401 });
  }
  if (user.twofa_enabled) {
    // Lưu user id tạm thời, yêu cầu nhập mã 2FA
    const tempToken = await signJWT({ userId: user.id }, env.SESSION_SECRET);
    const response = new Response('Mời nhập mã 2FA', { status: 200 });
    response.headers.set('Set-Cookie', `temp=${tempToken}; HttpOnly; Path=/; Max-Age=300`);
    return response;
  }
  // Tạo token chính thức
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = await signJWT(payload, env.SESSION_SECRET);
  const response = new Response('Đăng nhập thành công', { status: 200 });
  setTokenCookie(response, token);
  return response;
}

// ... Các hàm khác: handle2FASetup, handle2FAVerify, handleLogin2FA, logout
// Tôi sẽ gửi tiếp trong phần sau do giới hạn độ dài.
