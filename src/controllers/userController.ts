import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getProfileByUsername = async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        cover: true,
        bio: true,
        profession: true,
        website: true,
        role: true,
        isVerified: true,
        creatorMonthlyPrice: true,
        freeSubscription: true,
        hideLastSeen: true,
        hideSubscribersCount: true,
        lastSeen: true,
        createdAt: true,
        plans: {
          where: { isActive: true },
        },
        _count: {
          select: {
            posts: { where: { status: 'ACTIVE' } },
            subscriptionsReceived: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    let isSubscribed = false;
    let isSelf = false;

    if (currentUserId) {
      isSelf = currentUserId === user.id;
      if (!isSelf) {
        const sub = await prisma.subscription.findFirst({
          where: {
            subscriberId: currentUserId,
            creatorId: user.id,
            status: 'ACTIVE',
          },
        });
        isSubscribed = !!sub;
      }
    }

    return res.json({
      success: true,
      profile: {
        ...user,
        subscribersCount: user.hideSubscribersCount && !isSelf ? null : user._count.subscriptionsReceived,
        postsCount: user._count.posts,
        isSubscribed,
        isSelf,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
};

export const exploreCreators = async (req: AuthRequest, res: Response) => {
  try {
    const creators = await prisma.user.findMany({
      where: {
        role: { in: ['CREATOR', 'ADMIN'] },
        status: 'ACTIVE',
        NOT: { hideProfile: true },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        cover: true,
        bio: true,
        profession: true,
        isVerified: true,
        creatorMonthlyPrice: true,
        _count: {
          select: {
            posts: true,
            subscriptionsReceived: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });

    return res.json({ success: true, creators });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch creators', details: err.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      bio,
      profession,
      website,
      avatar,
      cover,
      creatorMonthlyPrice,
      freeSubscription,
      darkMode,
      hideSubscribersCount,
      hideLastSeen,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        bio: bio !== undefined ? bio : undefined,
        profession: profession !== undefined ? profession : undefined,
        website: website !== undefined ? website : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        cover: cover !== undefined ? cover : undefined,
        creatorMonthlyPrice: creatorMonthlyPrice !== undefined ? parseFloat(creatorMonthlyPrice) : undefined,
        freeSubscription: freeSubscription !== undefined ? Boolean(freeSubscription) : undefined,
        darkMode: darkMode !== undefined ? Boolean(darkMode) : undefined,
        hideSubscribersCount: hideSubscribersCount !== undefined ? Boolean(hideSubscribersCount) : undefined,
        hideLastSeen: hideLastSeen !== undefined ? Boolean(hideLastSeen) : undefined,
      },
    });

    return res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
};
