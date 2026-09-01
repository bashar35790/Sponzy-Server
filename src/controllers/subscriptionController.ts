import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const subscribeToCreator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { creatorId, planId } = req.body;

    if (req.user.id === creatorId) {
      return res.status(400).json({ error: 'You cannot subscribe to yourself.' });
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { plans: true },
    });

    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    // Check if already subscribed
    const existingSub = await prisma.subscription.findFirst({
      where: {
        subscriberId: req.user.id,
        creatorId,
        status: 'ACTIVE',
      },
    });

    if (existingSub) {
      return res.status(400).json({ error: 'You are already actively subscribed to this creator.' });
    }

    // Determine price (Free, custom Plan, or default creatorMonthlyPrice)
    let price = creator.creatorMonthlyPrice;
    let plan = null;
    if (planId) {
      plan = creator.plans.find((p) => p.id === planId);
      if (plan) price = plan.price;
    }

    if (creator.freeSubscription || price.equals(0)) {
      // Free subscription
      const sub = await prisma.subscription.create({
        data: {
          subscriberId: req.user.id,
          creatorId,
          planId: plan?.id,
          status: 'ACTIVE',
          endsAt: null, // continuous free sub
        },
      });

      await prisma.notification.create({
        data: {
          recipientId: creatorId,
          actorId: req.user.id,
          type: 'SUBSCRIBE',
        },
      });

      return res.json({ success: true, message: 'Subscribed successfully (Free)!', subscription: sub });
    }

    // Paid subscription via Wallet balance
    const subscriber = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!subscriber || subscriber.walletBalance.lessThan(price)) {
      return res.status(400).json({ error: 'Insufficient wallet funds. Please add funds to your wallet.' });
    }

    const platformFeePercentage = 10;
    const fee = price.mul(platformFeePercentage).div(100);
    const creatorEarning = price.sub(fee);
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1);

    const [subscription] = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          subscriberId: req.user.id,
          creatorId,
          planId: plan?.id,
          status: 'ACTIVE',
          endsAt,
        },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { decrement: price } },
      }),
      prisma.user.update({
        where: { id: creatorId },
        data: { walletBalance: { increment: creatorEarning } },
      }),
      prisma.transaction.create({
        data: {
          userId: req.user.id,
          type: 'SUBSCRIPTION',
          amount: price,
          earningNet: creatorEarning,
          platformFee: fee,
          status: 'COMPLETED',
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: creatorId,
          actorId: req.user.id,
          type: 'SUBSCRIBE',
        },
      }),
    ]);

    return res.json({ success: true, message: 'Subscribed successfully!', subscription });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process subscription', details: err.message });
  }
};

export const sendTip = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { creatorId, amount, message } = req.body;

    const tipAmount = parseFloat(amount);
    if (!tipAmount || tipAmount <= 0) {
      return res.status(400).json({ error: 'Please specify a valid tip amount.' });
    }

    const sender = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!sender || sender.walletBalance.lessThan(tipAmount)) {
      return res.status(400).json({ error: 'Insufficient balance to send tip.' });
    }

    const fee = tipAmount * 0.05; // 5% fee on tips
    const netEarning = tipAmount - fee;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: sender.id },
        data: { walletBalance: { decrement: tipAmount } },
      }),
      prisma.user.update({
        where: { id: creatorId },
        data: { walletBalance: { increment: netEarning } },
      }),
      prisma.transaction.create({
        data: {
          userId: sender.id,
          type: 'TIP',
          amount: tipAmount,
          earningNet: netEarning,
          platformFee: fee,
          status: 'COMPLETED',
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: creatorId,
          actorId: sender.id,
          type: 'TIP',
        },
      }),
    ]);

    return res.json({ success: true, message: `Successfully tipped $${tipAmount.toFixed(2)}!` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send tip', details: err.message });
  }
};

export const getMySubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const subscriptions = await prisma.subscription.findMany({
      where: {
        subscriberId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isVerified: true,
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, subscriptions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch subscriptions', details: err.message });
  }
};
