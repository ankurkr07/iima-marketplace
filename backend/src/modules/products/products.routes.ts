import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { productsController } from './products.controller';
import {
  createProductSchema,
  idParam,
  listProductsQuery,
  slugParam,
  trackSchema,
  updateProductSchema,
  updateStatusSchema,
} from './products.schema';

export const productsRouter = Router();

productsRouter.get('/', validate({ query: listProductsQuery }), asyncHandler(productsController.list));
productsRouter.get(
  '/:slug',
  validate({ params: slugParam }),
  asyncHandler(productsController.getBySlug),
);

// Public engagement tracking (contact-channel clicks) — no auth required.
productsRouter.post(
  '/:id/track',
  validate({ params: idParam, body: trackSchema }),
  asyncHandler(productsController.track),
);

productsRouter.post(
  '/',
  requireAuth,
  validate({ body: createProductSchema }),
  asyncHandler(productsController.create),
);
productsRouter.patch(
  '/:id',
  requireAuth,
  validate({ params: idParam, body: updateProductSchema }),
  asyncHandler(productsController.update),
);
productsRouter.patch(
  '/:id/status',
  requireAuth,
  validate({ params: idParam, body: updateStatusSchema }),
  asyncHandler(productsController.setStatus),
);
productsRouter.delete(
  '/:id',
  requireAuth,
  validate({ params: idParam }),
  asyncHandler(productsController.remove),
);
