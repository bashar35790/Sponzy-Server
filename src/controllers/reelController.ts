import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getReelsFeed = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reels = await prisma.reel.findMany({
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    let likedReelIds = new Set<string>();
    if (currentUserId) {
      const likes = await prisma.reelLike.findMany({
        where: {
          userId: currentUserId,
          reelId: { in: reels.map((r) => r.id) },
        },
        select: { reelId: true },
      });
      likedReelIds = new Set(likes.map((l) => l.reelId));
    }

    const formatted = reels.map((r) => ({
      id: r.id,
      user: r.user,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      caption: r.caption,
      audioTrack: r.audioTrack,
      likesCount: r._count.likes,
      commentsCount: r._count.comments,
      isLiked: likedReelIds.has(r.id),
      createdAt: r.createdAt,
    }));

    return res.json({ success: true, page, reels: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch reels', details: err.message });
  }
};

export const createReel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { videoUrl, thumbnailUrl, caption, audioTrack } = req.body;

    if (!videoUrl) return res.status(400).json({ error: 'Video URL is required' });

    const reel = await prisma.reel.create({
      data: {
        userId: req.user.id,
        videoUrl,
        thumbnailUrl,
        caption,
        audioTrack,
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
      },
    });

    return res.status(201).json({ success: true, reel });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create reel', details: err.message });
  }
};

export const toggleReelLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: reelId } = req.params;

    const existing = await prisma.reelLike.findUnique({
      where: {
        reelId_userId: {
          reelId,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      await prisma.reelLike.delete({ where: { id: existing.id } });
      return res.json({ success: true, liked: false });
    } else {
      await prisma.reelLike.create({
        data: {
          reelId,
          userId: req.user.id,
        },
      });
      return res.json({ success: true, liked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle reel like', details: err.message });
  }
};
