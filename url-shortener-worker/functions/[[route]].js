// functions/[[route]].js
import { Router } from 'itty-router';
import { handleRegister, handleLogin, handle2FASetup, handle2FAVerify, handleLogin2FA, logout } from '../src/auth';
import { shorten, redirect, dashboard } from '../src/links';
import { adminPanel, adminUsers, adminDeleteUser, adminResetPassword, adminLinks, adminDeleteLink } from '../src/admin';
import { initDB } from '../src/db';
import { renderHome, renderRegister, render2FALogin, renderShorten } from '../src/html';

const router = Router();

// ----- Middleware: xác thực người dùng qua cookie JWT -----
const withUser = async (request) => {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = cookieHeader.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      request.user = payload;
    } catch (e) {}
  }
};

// ----- Routes -----
router.get('/', (req) => new Response(renderHome(req.user), { headers: { 'Content-Type': 'text/html' } }));
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/register', () => new Response(renderRegister(), { headers: { 'Content-Type': 'text/html' } }));
router.get('/login/2fa', () => new Response(render2FALogin(), { headers: { 'Content-Type': 'text/html' } }));
router.post('/login/2fa', handleLogin2FA);
router.get('/2fa/setup', withUser, handle2FASetup);
router.post('/2fa/verify-setup', withUser, handle2FAVerify);
router.get('/dashboard', withUser, dashboard);
router.get('/shorten', withUser, (req) => new Response(renderShorten(), { headers: { 'Content-Type': 'text/html' } }));
router.post('/shorten', withUser, shorten);
router.get('/logout', withUser, logout);
router.get('/admin', withUser, adminPanel);
router.get('/admin/users', withUser, adminUsers);
router.post('/admin/users/:id/delete', withUser, adminDeleteUser);
router.post('/admin/users/:id/reset-password', withUser, adminResetPassword);
router.get('/admin/links', withUser, adminLinks);
router.post('/admin/links/:id/delete', withUser, adminDeleteLink);
router.get('/:shortCode', redirect);

router.all('*', () => new Response('Not Found', { status: 404 }));

// ----- Export cho Pages Functions -----
export async function onRequest(context) {
  const { request, env } = context;
  // Khởi tạo database nếu cần (tạo bảng)
  await initDB(env.DB);
  return router.handle(request, env);
                                                 }
