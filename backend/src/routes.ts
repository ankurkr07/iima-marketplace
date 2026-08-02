import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { usersRouter } from './modules/users/users.routes';
import { wishlistRouter } from './modules/wishlist/wishlist.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';
import { imagesRouter } from './modules/images/images.routes';
import { mailRouter } from './modules/mail/mail.routes';
import { adminRouter } from './modules/admin/admin.routes';

/**
 * The API surface. Versioned under /api/v1 so future breaking changes can
 * ship a /api/v2 alongside without disrupting existing clients.
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'iima-marketplace' }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/wishlist', wishlistRouter);
apiRouter.use('/uploads', uploadsRouter);
apiRouter.use('/images', imagesRouter);
apiRouter.use('/mail', mailRouter);
apiRouter.use('/admin', adminRouter);
