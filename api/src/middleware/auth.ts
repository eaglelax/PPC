import { Request, Response, NextFunction } from 'express';
import { authAdmin } from '../config/firebase';

export interface AuthRequest extends Request {
  uid?: string;
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await authAdmin.verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide.' });
  }
}
