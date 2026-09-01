import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Try decoding with custom JWT secret
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sponzy_secret_key') as any;
      if (decoded && decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, username: true, role: true, status: true },
        });

        if (!user || user.status === 'SUSPENDED') {
          return res.status(403).json({ error: 'User is suspended or not found' });
        }

        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        };
        return next();
      }
    } catch {
      // If local JWT fails, fallback to Supabase Auth token verification
    }

    // 2. Try validating against Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseId: data.user.id }, { email: data.user.email || '' }],
      },
      select: { id: true, email: true, username: true, role: true, status: true },
    });

    if (!dbUser || dbUser.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'User is suspended or not found' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
    };

    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Auth Error', details: err.message });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
