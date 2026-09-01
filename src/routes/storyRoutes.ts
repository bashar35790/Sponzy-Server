import { Router } from 'express';
import { getStoriesFeed, createStory, viewStory } from '../controllers/storyController';
import { authenticate } from '../middleware/auth';

const router = Router();

const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/feed', optionalAuth, getStoriesFeed);
router.post('/', authenticate, createStory);
router.post('/:id/view', authenticate, viewStory);

export default router;
