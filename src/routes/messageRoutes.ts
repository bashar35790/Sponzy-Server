import { Router } from 'express';
import { getConversations, getMessages, sendMessage } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/conversation/:conversationId', authenticate, getMessages);
router.post('/send', authenticate, sendMessage);

export default router;
