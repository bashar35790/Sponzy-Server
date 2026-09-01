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

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          avatar: true,
          isVerified: true,
          walletBalance: true,
          profession: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              subscriptionsReceived: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isVerified, walletBalance } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(typeof isVerified === 'boolean' && { isVerified }),
        ...(typeof walletBalance === 'number' && { walletBalance }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isVerified: true,
        walletBalance: true,
      },
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    return res.json({ success: true, transactions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
};
