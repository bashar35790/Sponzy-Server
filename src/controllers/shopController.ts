import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { creatorId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        creatorId: creatorId ? String(creatorId) : undefined,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, products });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, description, price, isPhysical, fileUrl, previewUrl } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        creatorId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        isPhysical: Boolean(isPhysical),
        fileUrl,
        previewUrl,
      },
    });

    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
};

export const purchaseProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id: productId } = req.params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const buyer = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!buyer || buyer.walletBalance.lessThan(product.price)) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const fee = product.price.mul(10).div(100);
    const creatorNet = product.price.sub(fee);

    const [purchase] = await prisma.$transaction([
      prisma.purchase.create({
        data: {
          buyerId: buyer.id,
          productId: product.id,
          amount: product.price,
        },
      }),
      prisma.user.update({
        where: { id: buyer.id },
        data: { walletBalance: { decrement: product.price } },
      }),
      prisma.user.update({
        where: { id: product.creatorId },
        data: { walletBalance: { increment: creatorNet } },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: { salesCount: { increment: 1 } },
      }),
      prisma.transaction.create({
        data: {
          userId: buyer.id,
          type: 'PRODUCT_PURCHASE',
          amount: product.price,
          earningNet: creatorNet,
          platformFee: fee,
          status: 'COMPLETED',
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: product.creatorId,
          actorId: buyer.id,
          type: 'PRODUCT_PURCHASE',
          targetId: product.id,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Product purchased successfully!',
      purchase,
      downloadUrl: product.fileUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to purchase product', details: err.message });
  }
};
