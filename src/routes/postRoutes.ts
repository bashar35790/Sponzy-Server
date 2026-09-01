import { Router } from 'express';
import { getFeed, createPost, toggleLike, addComment, unlockPPV } from '../controllers/postController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Optional auth for feed viewing (to check subscriber/PPV status)
const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/feed', optionalAuth, getFeed);
router.post('/', authenticate, createPost);
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/comment', authenticate, addComment);
router.post('/:id/unlock', authenticate, unlockPPV);

export default router;
