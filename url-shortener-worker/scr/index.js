import { Router } from 'itty-router';
import { handleRegister, handleLogin, handle2FASetup, handle2FAVerify, handleLogin2FA, logout } from './auth';
import { shorten, redirect, dashboard } from './links';
import { adminPanel, adminUsers, adminDeleteUser, adminResetPassword, adminLinks, adminDeleteLink } from './admin';
import { initDB } from './db';

const router = Router();

// Middleware kiểm tra xác thực
const withUser = async (request) => {
  const cookie = request.headers.get('Cookie') || '';
  const token = cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  if (token) {
    try {
      // Xác thực JWT đơn giản (dùng HMAC với SESSION_SECRET)
      const payload = JSON.parse(atob(token.split('.')[1]));
      request.user = payload;
    } catch (e) {}
  }
};

// Public routes
router.get('/', (req) => new Response(renderHome(req.user), { headers: { 'Content-Type': 'text/html' } }));
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/register', () => new Response(renderRegister()));
router.get('/login/2fa', () => new Response(render2FALogin()));
router.post('/login/2fa', handleLogin2FA);
router.get('/:shortCode', redirect);

// Auth required
router.get('/2fa/setup', withUser, handle2FASetup);
router.post('/2fa/verify-setup', withUser, handle2FAVerify);
router.get('/dashboard', withUser, dashboard);
router.get('/shorten', withUser, () => new Response(renderShorten()));
router.post('/shorten', withUser, shorten);
router.get('/logout', withUser, logout);

// Admin routes
router.get('/admin', withUser, adminPanel);
router.get('/admin/users', withUser, adminUsers);
router.post('/admin/users/:id/delete', withUser, adminDeleteUser);
router.post('/admin/users/:id/reset-password', withUser, adminResetPassword);
router.get('/admin/links', withUser, adminLinks);
router.post('/admin/links/:id/delete', withUser, adminDeleteLink);

// 404
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    // Khởi tạo DB nếu chưa có bảng
    await initDB(env.DB);
    return router.handle(request, env, ctx);
  }
};
