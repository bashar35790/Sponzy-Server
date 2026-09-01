import { Router } from 'express';
import { getReelsFeed, createReel, toggleReelLike } from '../controllers/reelController';
import { authenticate } from '../middleware/auth';

const router = Router();

const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/feed', optionalAuth, getReelsFeed);
router.post('/', authenticate, createReel);
router.post('/:id/like', authenticate, toggleReelLike);

export default router;
