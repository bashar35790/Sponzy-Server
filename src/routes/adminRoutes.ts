import { Router } from 'express';
import { getDashboardStats, getVerificationRequests, updateVerificationStatus } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, requireAdmin, getDashboardStats);
router.get('/verifications', authenticate, requireAdmin, getVerificationRequests);
router.put('/verifications/:id', authenticate, requireAdmin, updateVerificationStatus);

export default router;
