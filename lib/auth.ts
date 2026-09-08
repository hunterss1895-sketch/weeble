import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

const COOKIE = 'weeble_session';
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'weeble-dev-secret');

export type SessionUser = { id: string; email: string; name: string | null };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Secure cookies only when explicitly enabled or AUTH_URL is https (HTTP IP deploys must stay insecure). */
function cookieSecure() {
  if (process.env.AUTH_COOKIE_SECURE === 'true') return true;
  if (process.env.AUTH_COOKIE_SECURE === 'false') return false;
  const url = process.env.AUTH_URL || process.env.NEXTAUTH_URL || '';
  return url.startsWith('https://');
}

/** Sign a JWT (same token used for cookie and Bearer). */
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: (payload.name as string) || null,
    };
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await createToken(user);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Session from Authorization: Bearer <jwt> OR weeble_session cookie.
 * Pass req when available (API routes) so Bearer works for mobile clients.
 */
export async function getSession(req?: Request): Promise<SessionUser | null> {
  if (req) {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      if (token) {
        const user = await verifyToken(token);
        if (user) return user;
      }
    }
  }

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(req?: Request): Promise<SessionUser> {
  const user = await getSession(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || email.split('@')[0] },
  });
  return { id: user.id, email: user.email, name: user.name };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error('Invalid email or password');
  }
  return { id: user.id, email: user.email, name: user.name };
}
