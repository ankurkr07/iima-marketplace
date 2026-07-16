import type { Request, Response } from 'express';
import { productsService } from './products.service';

const isAdmin = (req: Request) => req.user?.role === 'ADMIN';

export const productsController = {
  async list(req: Request, res: Response) {
    const result = await productsService.list(req.query as never);
    res.json(result);
  },

  async getBySlug(req: Request, res: Response) {
    const result = await productsService.getBySlug(req.params.slug!, { incrementViews: true });
    res.json(result);
  },

  async create(req: Request, res: Response) {
    const product = await productsService.create(req.user!.id, req.body);
    res.status(201).json({ product });
  },

  async update(req: Request, res: Response) {
    const product = await productsService.update(req.user!.id, isAdmin(req), req.params.id!, req.body);
    res.json({ product });
  },

  async setStatus(req: Request, res: Response) {
    const product = await productsService.setStatus(
      req.user!.id,
      isAdmin(req),
      req.params.id!,
      req.body.status,
    );
    res.json({ product });
  },

  async track(req: Request, res: Response) {
    const result = await productsService.trackClick(req.params.id!, req.body.type);
    res.json(result);
  },

  async remove(req: Request, res: Response) {
    const result = await productsService.remove(req.user!.id, isAdmin(req), req.params.id!);
    res.json(result);
  },
};
