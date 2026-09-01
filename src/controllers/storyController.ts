import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getStoriesFeed = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isVerified: true,
          },
        },
        views: currentUserId
          ? {
              where: { userId: currentUserId },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group stories by creator
    const grouped = new Map<string, any>();
    stories.forEach((story) => {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, {
          user: story.user,
          hasUnseen: currentUserId ? (story.views?.length === 0) : true,
          stories: [],
        });
      }
      grouped.get(story.userId).stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        type: story.type,
        caption: story.caption,
        backgroundColor: story.backgroundColor,
        fontFamily: story.fontFamily,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
        isSeen: currentUserId ? (story.views?.length > 0) : false,
      });
    });

    return res.json({ success: true, storiesTray: Array.from(grouped.values()) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch stories', details: err.message });
  }
};

export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { mediaUrl, type, caption, backgroundColor, fontFamily } = req.body;

    if (!mediaUrl) return res.status(400).json({ error: 'Media URL is required' });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour story lifetime

    const story = await prisma.story.create({
      data: {
        userId: req.user.id,
        mediaUrl,
        type: type || 'IMAGE',
        caption,
        backgroundColor,
        fontFamily,
        expiresAt,
      },
    });

    return res.status(201).json({ success: true, story });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create story', details: err.message });
  }
};

export const viewStory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: storyId } = req.params;

    await prisma.storyView.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId: req.user.id,
        },
      },
      create: {
        storyId,
        userId: req.user.id,
      },
      update: {},
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record story view', details: err.message });
  }
};
