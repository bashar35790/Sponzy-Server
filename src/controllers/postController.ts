import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get posts
    const posts = await prisma.post.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isVerified: true,
            role: true,
          },
        },
        media: true,
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

    // Check user subscriptions and PPV purchases to mask locked media
    let activeSubCreatorIds = new Set<string>();
    let purchasedPostIds = new Set<string>();
    let likedPostIds = new Set<string>();
    let bookmarkedPostIds = new Set<string>();

    if (currentUserId) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          subscriberId: currentUserId,
          status: 'ACTIVE',
        },
        select: { creatorId: true },
      });
      activeSubCreatorIds = new Set(subscriptions.map((s) => s.creatorId));

      const purchases = await prisma.purchase.findMany({
        where: {
          buyerId: currentUserId,
          postId: { not: null },
        },
        select: { postId: true },
      });
      purchasedPostIds = new Set(purchases.map((p) => p.postId as string));

      const likes = await prisma.postLike.findMany({
        where: {
          userId: currentUserId,
          postId: { in: posts.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map((l) => l.postId));

      const bookmarks = await prisma.bookmark.findMany({
        where: {
          userId: currentUserId,
          postId: { in: posts.map((p) => p.id) },
        },
        select: { postId: true },
      });
      bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));
    }

    const formattedPosts = posts.map((post) => {
      const isOwner = currentUserId === post.userId;
      const isSubscribed = activeSubCreatorIds.has(post.userId);
      const isPurchased = purchasedPostIds.has(post.id);

      let isLocked = false;
      if (!isOwner) {
        if (post.lockType === 'SUBSCRIBERS_ONLY' && !isSubscribed) {
          isLocked = true;
        } else if (post.lockType === 'PAY_PER_VIEW' && !isPurchased) {
          isLocked = true;
        }
      }

      return {
        id: post.id,
        user: post.user,
        description: isLocked ? null : post.description,
        lockType: post.lockType,
        price: post.price,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        isLocked,
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        media: isLocked
          ? post.media.map((m) => ({
              id: m.id,
              type: m.type,
              url: m.thumbnailUrl || m.url, // blurred or preview
              isBlurred: true,
            }))
          : post.media.map((m) => ({
              id: m.id,
              type: m.type,
              url: m.url,
              thumbnailUrl: m.thumbnailUrl,
              duration: m.duration,
              isBlurred: false,
            })),
      };
    });

    formattedPosts.sort((a, b) => {
      if (a.user?.username === 'elenaray' && b.user?.username !== 'elenaray') return -1;
      if (b.user?.username === 'elenaray' && a.user?.username !== 'elenaray') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.json({
      success: true,
      page,
      posts: formattedPosts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch feed', details: err.message });
  }
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { description, lockType, price, media } = req.body;

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        description: description || '',
        lockType: lockType || 'FREE',
        price: price ? parseFloat(price) : 0,
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
      include: {
        media: true,
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

    return res.status(201).json({ success: true, post });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create post', details: err.message });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: postId } = req.params;

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: req.user.id,
        },
      },
    });

    if (existingLike) {
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      return res.json({ success: true, liked: false });
    } else {
      await prisma.postLike.create({
        data: {
          postId,
          userId: req.user.id,
        },
      });

      // Notify post author
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            recipientId: post.userId,
            actorId: req.user.id,
            type: 'LIKE',
            targetId: postId,
          },
        });
      }

      return res.json({ success: true, liked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle like', details: err.message });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: postId } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const createdComment = await prisma.postComment.create({
      data: {
        postId,
        userId: req.user.id,
        comment: comment.trim(),
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

    return res.status(201).json({ success: true, comment: createdComment });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add comment', details: err.message });
  }
};

export const unlockPPV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.lockType !== 'PAY_PER_VIEW') {
      return res.status(400).json({ error: 'Post is not a Pay-Per-View item' });
    }

    // Check user wallet
    const buyer = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!buyer || buyer.walletBalance.lessThan(post.price)) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please add funds.' });
    }

    // Deduct buyer wallet, credit creator wallet minus commission
    const platformFeePercentage = 10; // 10%
    const feeAmount = post.price.mul(platformFeePercentage).div(100);
    const creatorEarnings = post.price.sub(feeAmount);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: buyer.id },
        data: { walletBalance: { decrement: post.price } },
      }),
      prisma.user.update({
        where: { id: post.userId },
        data: { walletBalance: { increment: creatorEarnings } },
      }),
      prisma.purchase.create({
        data: {
          buyerId: buyer.id,
          postId: post.id,
          amount: post.price,
        },
      }),
      prisma.transaction.create({
        data: {
          userId: buyer.id,
          type: 'PPV',
          amount: post.price,
          earningNet: creatorEarnings,
          platformFee: feeAmount,
          status: 'COMPLETED',
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: post.userId,
          actorId: buyer.id,
          type: 'PPV_PURCHASE',
          targetId: post.id,
        },
      }),
    ]);

    return res.json({ success: true, message: 'Post unlocked successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to unlock post', details: err.message });
  }
};
