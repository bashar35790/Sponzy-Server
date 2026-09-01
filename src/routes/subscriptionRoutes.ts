import { Router } from 'express';
import { subscribeToCreator, sendTip, getMySubscriptions } from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/subscribe', authenticate, subscribeToCreator);
router.post('/tip', authenticate, sendTip);
router.get('/my-subscriptions', authenticate, getMySubscriptions);

export default router;
