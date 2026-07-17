import { BadRequestException } from '@nestjs/common';
import { PilotService } from './pilot.service';
import { PrismaService } from '../prisma/prisma.service';

const walletAddress =
  'GCBQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7A';

function createPrismaMock() {
  return {
    merchantMember: {
      findFirst: jest.fn().mockResolvedValue({ merchantId: 'merchant-id' }),
    },
    productEvent: {
      create: jest.fn().mockResolvedValue({ id: 'event-id' }),
      count: jest.fn().mockResolvedValue(3),
    },
    walletInteraction: {
      create: jest.fn().mockResolvedValue({ id: 'interaction-id' }),
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([{ walletAddress }]),
    },
    productFeedback: {
      create: jest.fn().mockResolvedValue({ id: 'feedback-id' }),
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      count: jest.fn().mockResolvedValue(10),
    },
    wallet: {
      count: jest.fn().mockResolvedValue(10),
    },
  };
}

describe('PilotService', () => {
  it('records public product events with user agent metadata', async () => {
    const prisma = createPrismaMock();
    const service = new PilotService(prisma as unknown as PrismaService);

    await expect(
      service.recordEvent(
        {
          eventName: 'page_view',
          route: '/app/settings',
          sessionId: 'session-id',
          properties: { source: 'route' },
        },
        'Test Agent',
      ),
    ).resolves.toEqual({ id: 'event-id', accepted: true });

    expect(prisma.productEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: 'page_view',
        route: '/app/settings',
        sessionId: 'session-id',
        properties: expect.objectContaining({
          source: 'route',
          userAgent: 'Test Agent',
        }),
      }),
    });
  });

  it('records wallet interaction proof for a wallet owned by the user', async () => {
    const prisma = createPrismaMock();
    const service = new PilotService(prisma as unknown as PrismaService);

    await expect(
      service.recordWalletInteraction(
        {
          id: 'user-id',
          wallets: [{ publicKey: walletAddress, isPrimary: true }],
        },
        {
          interactionType: 'PAYMENT_CONFIRMED',
          network: 'PUBLIC',
          transactionHash: 'hash-id',
        },
        'Test Agent',
      ),
    ).resolves.toEqual({ id: 'interaction-id', recorded: true });

    expect(prisma.walletInteraction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-id',
        merchantId: 'merchant-id',
        walletAddress,
        network: 'MAINNET',
        interactionType: 'PAYMENT_CONFIRMED',
        transactionHash: 'hash-id',
        metadata: expect.objectContaining({ userAgent: 'Test Agent' }),
      }),
    });
  });

  it('rejects feedback with an invalid rating', async () => {
    const prisma = createPrismaMock();
    const service = new PilotService(prisma as unknown as PrismaService);

    await expect(
      service.submitFeedback(
        {
          id: 'user-id',
          wallets: [{ publicKey: walletAddress, isPrimary: true }],
        },
        {
          rating: 6,
          message: 'This should fail validation',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.productFeedback.create).not.toHaveBeenCalled();
  });
});
