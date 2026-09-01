import { Router } from 'express';
import { getProfileByUsername, exploreCreators, updateProfile } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

const optionalAuth = (req: any, res: any, next: any) => {
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/explore', optionalAuth, exploreCreators);
router.get('/:username', optionalAuth, getProfileByUsername);
router.put('/profile', authenticate, updateProfile);

export default router;
