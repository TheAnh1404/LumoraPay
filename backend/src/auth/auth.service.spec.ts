import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

const mockWalletAddress =
  'GCBQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7A';
const mockOtherWalletAddress =
  'GDFQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7B';
const mockSignature = Buffer.alloc(64, 7);
const mockMessage = [
  'Lumora Pay wallet sign-in',
  `Wallet: ${mockWalletAddress}`,
  'Network: TESTNET',
  'Nonce: abc123',
  'Issued At: 2026-07-17T00:00:00.000Z',
].join('\n');
const mockFreighterSignedPayload = crypto
  .createHash('sha256')
  .update(`Stellar Signed Message:\n${mockMessage}`, 'utf8')
  .digest('hex');
const mockLegacyBase64SignedPayload = Buffer.from(
  Buffer.from(mockMessage, 'utf8').toString('base64'),
  'utf8',
).toString('hex');
const mockLegacyFreighterSignedPayload = crypto
  .createHash('sha256')
  .update(
    `Stellar Signed Message:\n${Buffer.from(mockMessage, 'utf8').toString('base64')}`,
    'utf8',
  )
  .digest('hex');

jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromPublicKey: jest.fn(() => ({
      verify: jest.fn(
        (data: Buffer, signature: Buffer) =>
          [
            mockFreighterSignedPayload,
            mockLegacyFreighterSignedPayload,
            mockLegacyBase64SignedPayload,
          ].includes(data.toString('hex')) && signature.equals(mockSignature),
      ),
    })),
  },
  StrKey: {
    isValidEd25519PublicKey: jest.fn(
      (publicKey: string) => publicKey.startsWith('G') && publicKey.length > 50,
    ),
  },
  xdr: {
    DecoratedSignature: {
      fromXDR: jest.fn((candidate: Buffer) => {
        if (!candidate.toString('utf8').startsWith('decorated:')) {
          throw new Error('Not a decorated signature');
        }
        return { signature: () => mockSignature };
      }),
    },
  },
}));

describe('AuthService wallet signature verification', () => {
  const nonce = 'abc123';

  function createService(walletAddress: string) {
    const user = {
      id: 'user-id',
      displayName: 'Test User',
      status: 'ACTIVE',
      wallets: [],
    };
    const prisma = {
      authNonce: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'nonce-id',
          walletAddress,
          nonce,
          message: mockMessage,
          network: 'TESTNET',
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(user),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(user),
        findUnique: jest.fn(),
      },
      wallet: {
        create: jest.fn(),
      },
      merchantMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const jwt = {
      sign: jest.fn().mockReturnValue('access-token'),
    } as unknown as JwtService;

    return new AuthService(prisma, jwt);
  }

  it('accepts a Freighter signed message signature', async () => {
    const service = createService(mockWalletAddress);
    const signature = mockSignature.toString('hex');

    await expect(
      service.verifyChallenge(
        mockWalletAddress,
        nonce,
        signature,
        mockWalletAddress,
      ),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
  });

  it('accepts a decorated Stellar signature XDR from Freighter', async () => {
    const service = createService(mockWalletAddress);
    const signature = Buffer.from(
      `decorated:${mockSignature.toString('hex')}`,
      'utf8',
    ).toString('base64');

    await expect(
      service.verifyChallenge(
        mockWalletAddress,
        nonce,
        signature,
        mockWalletAddress,
      ),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
  });

  it('rejects when Freighter signs with a different account', async () => {
    const service = createService(mockWalletAddress);
    const signature = mockSignature.toString('hex');

    await expect(
      service.verifyChallenge(
        mockWalletAddress,
        nonce,
        signature,
        mockOtherWalletAddress,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
