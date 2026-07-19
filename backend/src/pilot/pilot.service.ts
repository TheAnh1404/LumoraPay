import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WALLET_INTERACTION_TYPES = new Set([
  'CONNECT',
  'RESTORE',
  'DISCONNECT',
  'NETWORK_CHECK',
  'BALANCE_CHECK',
  'FAUCET_REQUEST',
  'PAYMENT_XDR_SIGNED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_CONFIRMED',
  'REFUND_XDR_SIGNED',
  'SOROBAN_XDR_SIGNED',
  'ESCROW_ACTION_SUBMITTED',
]);

const FEEDBACK_CATEGORIES = new Set([
  'GENERAL',
  'UX',
  'BUG',
  'PAYMENT',
  'WALLET',
  'ESCROW',
  'DOCUMENTATION',
]);

export interface PilotUser {
  id: string;
  wallets?: Array<{
    publicKey: string;
    isPrimary?: boolean | null;
  }>;
}

@Injectable()
export class PilotService {
  constructor(private prisma: PrismaService) {}

  private async getMerchantId(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
      select: { merchantId: true },
    });
    return membership?.merchantId || null;
  }

  private normalizeWalletNetwork(network?: string) {
    const normalized = (network || 'TESTNET').toUpperCase();
    if (normalized === 'MAINNET' || normalized === 'PUBLIC') {
      return 'MAINNET';
    }
    return 'TESTNET';
  }

  private normalizeInteractionType(type?: string) {
    const normalized = (type || 'CONNECT').trim().toUpperCase();
    if (!WALLET_INTERACTION_TYPES.has(normalized)) {
      throw new BadRequestException('Unsupported wallet interaction type');
    }
    return normalized;
  }

  private normalizeFeedbackCategory(category?: string) {
    const normalized = (category || 'GENERAL').trim().toUpperCase();
    if (!FEEDBACK_CATEGORIES.has(normalized)) {
      throw new BadRequestException('Unsupported feedback category');
    }
    return normalized;
  }

  private toJsonObject(
    value?: Record<string, unknown>,
    extra?: Record<string, unknown>,
  ): Prisma.InputJsonObject {
    return {
      ...(value || {}),
      ...(extra || {}),
    } as Prisma.InputJsonObject;
  }

  async recordEvent(
    body: {
      eventName: string;
      route?: string;
      sessionId?: string;
      walletAddress?: string;
      properties?: Record<string, unknown>;
    },
    userAgent?: string,
  ) {
    const eventName = String(body.eventName || '').trim();
    if (!eventName || eventName.length > 120) {
      throw new BadRequestException('eventName is required');
    }

    const event = await this.prisma.productEvent.create({
      data: {
        eventName,
        route: body.route || null,
        sessionId: body.sessionId || null,
        walletAddress: body.walletAddress || null,
        properties: this.toJsonObject(body.properties, {
          userAgent: userAgent || null,
        }),
      },
    });

    return { id: event.id, accepted: true };
  }

  async recordWalletInteraction(
    user: PilotUser,
    body: {
      interactionType: string;
      walletAddress?: string;
      network?: string;
      route?: string;
      entityType?: string;
      entityId?: string;
      transactionHash?: string;
      metadata?: Record<string, unknown>;
    },
    userAgent?: string,
  ) {
    const walletAddress =
      body.walletAddress ||
      user.wallets?.find((wallet) => wallet.isPrimary)?.publicKey ||
      user.wallets?.[0]?.publicKey;

    if (!walletAddress) {
      throw new BadRequestException('A verified wallet is required');
    }

    const belongsToUser = (user.wallets || []).some(
      (wallet) => wallet.publicKey === walletAddress,
    );
    if (!belongsToUser) {
      throw new BadRequestException(
        'Wallet does not belong to the current user',
      );
    }

    const merchantId = await this.getMerchantId(user.id);
    const interaction = await this.prisma.walletInteraction.create({
      data: {
        userId: user.id,
        merchantId,
        walletAddress,
        network: this.normalizeWalletNetwork(body.network),
        interactionType: this.normalizeInteractionType(
          body.interactionType,
        ) as any,
        route: body.route || null,
        entityType: body.entityType || null,
        entityId: body.entityId || null,
        transactionHash: body.transactionHash || null,
        metadata: this.toJsonObject(body.metadata, {
          userAgent: userAgent || null,
        }),
      },
    });

    return { id: interaction.id, recorded: true };
  }

  async submitFeedback(
    user: PilotUser,
    body: {
      category?: string;
      rating: number;
      message: string;
      contactConsent?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('rating must be an integer from 1 to 5');
    }

    const message = String(body.message || '').trim();
    if (message.length < 10) {
      throw new BadRequestException(
        'feedback message must be at least 10 characters',
      );
    }

    const merchantId = await this.getMerchantId(user.id);
    const walletAddress =
      user.wallets?.find((wallet) => wallet.isPrimary)?.publicKey ||
      user.wallets?.[0]?.publicKey ||
      null;

    const feedback = await this.prisma.productFeedback.create({
      data: {
        userId: user.id,
        merchantId,
        walletAddress,
        category: this.normalizeFeedbackCategory(body.category) as any,
        rating,
        message,
        contactConsent: Boolean(body.contactConsent),
        metadata: this.toJsonObject(body.metadata),
      },
    });

    return { id: feedback.id, submitted: true };
  }

  async listFeedback(userId: string) {
    const merchantId = await this.getMerchantId(userId);
    return this.prisma.productFeedback.findMany({
      where: merchantId ? { merchantId } : { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getEvidence(userId: string) {
    const merchantId = await this.getMerchantId(userId);
    const scope = merchantId ? { merchantId } : { userId };
    const [overview, walletInteractions, feedback] = await Promise.all([
      this.getOverview(userId),
      this.prisma.walletInteraction.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          walletAddress: true,
          network: true,
          interactionType: true,
          route: true,
          entityType: true,
          entityId: true,
          transactionHash: true,
          createdAt: true,
        },
      }),
      this.prisma.productFeedback.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          walletAddress: true,
          category: true,
          rating: true,
          message: true,
          contactConsent: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      scope: merchantId ? 'merchant' : 'user',
      merchantId,
      overview,
      walletInteractions,
      feedback,
    };
  }

  async getOverview(userId: string) {
    const merchantId = await this.getMerchantId(userId);
    const [
      totalUsers,
      verifiedWallets,
      walletInteractions,
      feedbackResponses,
      productEvents,
      merchantWalletInteractions,
      merchantFeedbackResponses,
      recentFeedback,
      recentWalletInteractions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.wallet.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      this.prisma.walletInteraction.count(),
      this.prisma.productFeedback.count(),
      this.prisma.productEvent.count(),
      this.prisma.walletInteraction.count({
        where: merchantId ? { merchantId } : { userId },
      }),
      this.prisma.productFeedback.count({
        where: merchantId ? { merchantId } : { userId },
      }),
      this.prisma.productFeedback.findMany({
        where: merchantId ? { merchantId } : { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.walletInteraction.findMany({
        where: merchantId ? { merchantId } : { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const interactedWallets = await this.prisma.walletInteraction.findMany({
      distinct: ['walletAddress'],
      select: { walletAddress: true },
    });

    return {
      level4Targets: {
        minimumRealUsers: 10,
        minimumMeaningfulCommits: 15,
        smartContractsDeployed: Boolean(
          process.env.INVOICE_REGISTRY_CONTRACT_ID &&
          process.env.PAYMENT_ESCROW_CONTRACT_ID,
        ),
      },
      totals: {
        users: totalUsers,
        verifiedWallets,
        uniqueInteractedWallets: interactedWallets.length,
        walletInteractions,
        feedbackResponses,
        productEvents,
      },
      currentMerchant: {
        merchantId,
        walletInteractions: merchantWalletInteractions,
        feedbackResponses: merchantFeedbackResponses,
      },
      readiness: {
        usersOnboarded: verifiedWallets >= 10,
        walletProofCaptured: interactedWallets.length >= 10,
        feedbackCollected: feedbackResponses > 0,
        contractsConfigured: Boolean(
          process.env.INVOICE_REGISTRY_CONTRACT_ID &&
          process.env.PAYMENT_ESCROW_CONTRACT_ID,
        ),
      },
      recentFeedback,
      recentWalletInteractions,
    };
  }
}
