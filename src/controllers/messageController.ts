import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
      },
      include: {
        user1: {
          select: { id: true, name: true, username: true, avatar: true, isVerified: true, lastSeen: true },
        },
        user2: {
          select: { id: true, name: true, username: true, avatar: true, isVerified: true, lastSeen: true },
        },
        messages: {
          include: { media: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const formatted = conversations.map((c) => {
      const partner = c.user1Id === req.user?.id ? c.user2 : c.user1;
      const lastMsg = c.messages[0] || null;
      return {
        id: c.id,
        partner,
        lastMessage: lastMsg?.body || (lastMsg?.media ? 'Sent an attachment' : 'Started conversation'),
        lastMessageAt: c.lastMessageAt,
        isRead: lastMsg ? (lastMsg.senderId === req.user?.id ? true : lastMsg.isRead) : true,
      };
    });

    return res.json({ success: true, conversations: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id)) {
      return res.status(403).json({ error: 'Conversation access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        media: true,
        purchases: {
          where: { buyerId: req.user.id },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    const formatted = messages.map((m) => {
      const isSender = m.senderId === req.user?.id;
      const isPaid = m.price.equals(0) || isSender || m.purchases.length > 0;

      return {
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        body: m.body,
        price: m.price,
        isLocked: !isPaid,
        media: !isPaid
          ? m.media.map((media) => ({ id: media.id, type: media.type, url: media.thumbnailUrl || media.url, isBlurred: true }))
          : m.media,
        createdAt: m.createdAt,
      };
    });

    return res.json({ success: true, messages: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { receiverId, body, price, media } = req.body;

    if (!receiverId) return res.status(400).json({ error: 'Receiver ID is required' });

    // Find or create conversation
    const [user1Id, user2Id] = [req.user.id, receiverId].sort();

    let conversation = await prisma.conversation.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { user1Id, user2Id },
      });
    }

    const messagePrice = price ? parseFloat(price) : 0;

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.user.id,
        receiverId,
        body: body || '',
        price: messagePrice,
        media: media && Array.isArray(media) && media.length > 0
          ? {
              create: media.map((item: any) => ({
                type: item.type || 'IMAGE',
                url: item.url,
                thumbnailUrl: item.thumbnailUrl,
              })),
            }
          : undefined,
      },
      include: { media: true },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return res.status(201).json({ success: true, message });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};
