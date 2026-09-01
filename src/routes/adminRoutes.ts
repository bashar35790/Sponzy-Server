import { Router } from 'express';
import {
  getDashboardStats,
  getVerificationRequests,
  updateVerificationStatus,
  getUsers,
  updateUserRole,
  getTransactions,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, requireAdmin, getDashboardStats);
router.get('/verifications', authenticate, requireAdmin, getVerificationRequests);
router.put('/verifications/:id', authenticate, requireAdmin, updateVerificationStatus);
router.get('/users', authenticate, requireAdmin, getUsers);
router.put('/users/:id', authenticate, requireAdmin, updateUserRole);
router.get('/transactions', authenticate, requireAdmin, getTransactions);

export default router;
