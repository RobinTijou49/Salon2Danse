// Étend le type Request d'Express pour porter l'utilisateur authentifié.
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { sub: string; role: string; [key: string]: unknown };
    }
  }
}
