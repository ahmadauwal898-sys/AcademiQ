import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db, logAuditEvent } from './db';

const JWT_SECRET = process.env.APP_SECRET || 'multischool-pro-secure-secret-key-2026';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'school_admin' | 'teacher' | 'bursar' | 'student_parent';
  school_id: string | null;
  school_name?: string | null;
  school_status?: string | null;
  is_payment_verified?: number;
  payment_verified_at?: string | null;
  is_impersonating?: boolean;
  impersonated_by_id?: string;
  impersonated_by_email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Generate secure signature for token
export function createToken(payload: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  const fullPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${fullPayload}`).digest('base64url');
  return `${header}.${fullPayload}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSignature) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      school_id: data.school_id,
      school_name: data.school_name,
      school_status: data.school_status,
      is_payment_verified: data.is_payment_verified != null ? Number(data.is_payment_verified) : 0,
      payment_verified_at: data.payment_verified_at || null,
      is_impersonating: data.is_impersonating,
      impersonated_by_id: data.impersonated_by_id,
      impersonated_by_email: data.impersonated_by_email
    };
  } catch (err) {
    return null;
  }
}

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  // 1. Support Super Admin Impersonation
  if (user.is_impersonating) {
    let superAdmin: any = null;
    if (user.impersonated_by_id) {
      superAdmin = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(user.impersonated_by_id) as any;
    }
    if (!superAdmin && user.impersonated_by_email) {
      superAdmin = db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE email = ?').get(user.impersonated_by_email) as any;
    }
    if (!superAdmin) {
      superAdmin = db.prepare("SELECT id, email, full_name, role, is_active FROM users WHERE role = 'super_admin' AND is_active = 1 LIMIT 1").get() as any;
    }

    if (!superAdmin || !superAdmin.is_active) {
      return res.status(401).json({ error: 'Super Admin impersonation session is invalid or expired.' });
    }

    // Verify target school exists
    const school = db.prepare('SELECT id, name, slug, status, logo_url FROM schools WHERE id = ?').get(user.school_id) as any;
    if (!school) {
      return res.status(404).json({ error: 'Target school not found.' });
    }

    req.user = {
      id: user.id || `usr_impersonated_${school.id}`,
      email: user.email || `admin@${school.slug}.edu`,
      full_name: user.full_name || `Administrator (${school.name})`,
      role: 'school_admin',
      school_id: school.id,
      school_name: school.name,
      school_status: school.status,
      is_impersonating: true,
      impersonated_by_id: superAdmin.id,
      impersonated_by_email: superAdmin.email
    };

    return next();
  }

  // 2. Regular user session: Refresh user and school status from database
  let dbUser = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.school_id,
           s.name as school_name, s.status as school_status,
           s.is_payment_verified, s.payment_verified_at
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    WHERE u.id = ?
  `).get(user.id) as any;

  if (!dbUser && user.email) {
    dbUser = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.school_id,
             s.name as school_name, s.status as school_status,
             s.is_payment_verified, s.payment_verified_at
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.email = ?
    `).get(user.email) as any;
  }

  if (!dbUser || !dbUser.is_active) {
    return res.status(401).json({ error: 'User account is deactivated or not found.' });
  }

  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    full_name: dbUser.full_name,
    role: dbUser.role,
    school_id: dbUser.school_id,
    school_name: dbUser.school_name,
    school_status: dbUser.school_status,
    is_payment_verified: dbUser.is_payment_verified != null ? Number(dbUser.is_payment_verified) : 0,
    payment_verified_at: dbUser.payment_verified_at || null,
    is_impersonating: false
  };

  next();
}

// Role-based authorization middleware
export function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAuditEvent('unauthorized_role_access_attempt', req.path, { required: allowedRoles, current: req.user.role }, req.user.school_id, req.user.id, req.user.email);
      return res.status(403).json({ error: `Permission denied. Required role: ${allowedRoles.join(' or ')}` });
    }

    next();
  };
}

// Tenant Isolation Enforcement Middleware
export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Super admins are allowed platform-wide administrative functions
  if (req.user.role === 'super_admin') {
    return next();
  }

  // For non-superadmin users, a valid school must be associated
  if (!req.user.school_id) {
    return res.status(403).json({ error: 'User is not associated with an active school tenant.' });
  }

  // Enforce that school must be approved for operational features
  if (req.user.school_status !== 'approved') {
    // If pending, allow only status check, user profile, payment verification, and notification endpoints
    const allowedPendingPaths = ['/api/school/status', '/api/auth/me', '/api/auth/verify-payment-code', '/api/notifications'];
    if (allowedPendingPaths.includes(req.path) || req.path.startsWith('/api/notifications')) {
      return next();
    }
    return res.status(403).json({
      error: `Access restricted. Your school application status is currently '${req.user.school_status}'. It must be approved by the platform administrator before accessing school operations.`,
      school_status: req.user.school_status
    });
  }

  // Check query parameters or body for foreign school_id tampering
  const requestedSchoolId = req.query.school_id || req.body?.school_id || req.params?.school_id;
  if (requestedSchoolId && requestedSchoolId !== req.user.school_id) {
    logAuditEvent('cross_tenant_violation_blocked', req.path, { requested_school: requestedSchoolId, user_school: req.user.school_id }, req.user.school_id, req.user.id, req.user.email);
    return res.status(403).json({ error: 'Security Exception: Cross-tenant data access is strictly forbidden.' });
  }

  next();
}
