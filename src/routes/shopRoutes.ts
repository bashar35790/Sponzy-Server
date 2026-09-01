import { Router } from 'express';
import { getProducts, createProduct, purchaseProduct } from '../controllers/shopController';
import { authenticate } from '../middleware/auth';

const router = Router();

const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/products', optionalAuth, getProducts);
router.post('/products', authenticate, createProduct);
router.post('/products/:id/purchase', authenticate, purchaseProduct);

export default router;
