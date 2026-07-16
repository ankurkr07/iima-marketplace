import type { Request, Response } from 'express';
import { authService } from './auth.service';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.json(result);
  },

  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async google(req: Request, res: Response) {
    const result = await authService.google(req.body.credential);
    res.json(result);
  },

  async googleMock(req: Request, res: Response) {
    const result = await authService.googleMock(req.body.email);
    res.json(result);
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.json({ user });
  },

  async changePassword(req: Request, res: Response) {
    const result = await authService.changePassword(req.user!.id, req.body);
    res.json(result);
  },
};
