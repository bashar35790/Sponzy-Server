import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalCreators,
      totalPosts,
      totalSubscriptions,
      totalVolumeResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CREATOR' } }),
      prisma.post.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.aggregate({
        _sum: { amount: true, platformFee: true },
        where: { status: 'COMPLETED' },
      }),
    ]);

    const pendingVerifications = await prisma.verificationRequest.count({
      where: { status: 'PENDING' },
    });

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalCreators,
        totalPosts,
        activeSubscriptions: totalSubscriptions,
        pendingVerifications,
        totalGrossVolume: totalVolumeResult._sum.amount || 0,
        totalPlatformEarnings: totalVolumeResult._sum.platformFee || 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch admin stats', details: err.message });
  }
};

export const getVerificationRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.verificationRequest.findMany({
      include: {
        user: {
          select: { id: true, name: true, username: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, requests });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch verification requests', details: err.message });
  }
};

export const updateVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' | 'REJECTED'

    const request = await prisma.verificationRequest.update({
      where: { id },
      data: { status },
      include: { user: true },
    });

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: request.userId },
        data: { isVerified: true, role: 'CREATOR' },
      });
    }

    return res.json({ success: true, request });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update verification status', details: err.message });
  }
};
