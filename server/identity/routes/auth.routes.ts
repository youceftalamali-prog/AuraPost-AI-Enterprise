import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { RegisterSchema } from '../validators/Register.validator';
import { LoginSchema } from '../validators/Login.validator';
import { AppError } from '../../core/errors/AppError';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from '../http/authCookies';

const router = Router();
const authService = new AuthService();

const getClientContext = (req: any) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const platform = req.headers['sec-ch-ua-platform'] || undefined;

  return {
    ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress),
    userAgent,
    platform: platform ? String(platform).replaceAll('"', '') : undefined,
  };
};

router.post('/register', async (req, res) => {
  try {
    const validated = RegisterSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validated.error.flatten().fieldErrors,
      });
    }

    const result = await authService.register(validated.data);
    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
        createdAt: result.user.createdAt,
      },
    });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const validated = LoginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: 'Validation failed', details: validated.error.flatten().fieldErrors });
    }
    const context = getClientContext(req);
    const result = await authService.login(validated.data, context);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.status(200).json({ message: 'Login successful', user: { id: result.user.id, firstName: result.user.firstName, lastName: result.user.lastName, email: result.user.email, role: result.user.role, status: result.user.status, createdAt: result.user.createdAt } });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required.' });
    const context = getClientContext(req);
    const result = await authService.refresh(refreshToken, context);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error: any) {
    clearAuthCookies(res);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  clearAuthCookies(res);
  try {
    if (refreshToken) await authService.logout(refreshToken);
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error: any) {
    if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 404)) return res.status(200).json({ message: 'Logout successful' });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
