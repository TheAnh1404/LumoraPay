import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly freighterMessagePrefix = 'Stellar Signed Message:\n';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private normalizeWalletAddress(walletAddress: string) {
    const normalized = walletAddress?.trim();
    if (!normalized || !StellarSdk.StrKey.isValidEd25519PublicKey(normalized)) {
      throw new BadRequestException('Invalid Stellar wallet address');
    }
    return normalized;
  }

  private normalizeNetwork(network: 'TESTNET' | 'MAINNET') {
    if (network !== 'TESTNET' && network !== 'MAINNET') {
      throw new BadRequestException('Unsupported Stellar network');
    }
    return network;
  }

  private decodeSignatureCandidates(signature: string) {
    const candidates: Buffer[] = [];
    const seen = new Set<string>();

    const addCandidate = (candidate: Buffer) => {
      if (candidate.length !== 64) {
        return;
      }

      const key = candidate.toString('hex');
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(candidate);
      }
    };

    const addDecodedCandidate = (candidate: Buffer) => {
      addCandidate(candidate);

      try {
        const decorated = StellarSdk.xdr.DecoratedSignature.fromXDR(
          candidate,
          'raw',
        );
        addCandidate(Buffer.from(decorated.signature()));
      } catch {
        // Not a decorated Stellar signature XDR.
      }
    };

    const normalized = signature.trim();
    const withoutHexPrefix = normalized.startsWith('0x')
      ? normalized.slice(2)
      : normalized;

    if (
      withoutHexPrefix.length % 2 === 0 &&
      /^[0-9a-fA-F]+$/.test(withoutHexPrefix)
    ) {
      addDecodedCandidate(Buffer.from(withoutHexPrefix, 'hex'));
    }

    if (/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      addDecodedCandidate(Buffer.from(normalized, 'base64'));
    }

    if (/^[A-Za-z0-9_-]+={0,2}$/.test(normalized)) {
      const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      addDecodedCandidate(Buffer.from(padded, 'base64'));
    }

    if (/^\d+(,\d+)+$/.test(normalized)) {
      const bytes = normalized.split(',').map(Number);
      if (bytes.every((byte) => byte >= 0 && byte <= 255)) {
        addDecodedCandidate(Buffer.from(bytes));
      }
    }

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed: unknown = JSON.parse(normalized);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (value) =>
              Number.isInteger(value) &&
              Number(value) >= 0 &&
              Number(value) <= 255,
          )
        ) {
          addDecodedCandidate(Buffer.from(parsed as number[]));
        }
      } catch {
        // Ignore malformed array signatures and keep checking other encodings.
      }
    }

    return candidates;
  }

  private getSignatureDiagnostics(signature: string) {
    const normalized = signature.trim();
    const diagnostics: Record<string, number | boolean> = {
      characters: normalized.length,
      candidateCount: this.decodeSignatureCandidates(signature).length,
      looksHex: /^(0x)?[0-9a-fA-F]+$/.test(normalized),
      looksBase64: /^[A-Za-z0-9+/]+={0,2}$/.test(normalized),
      looksBase64Url: /^[A-Za-z0-9_-]+={0,2}$/.test(normalized),
    };

    const withoutHexPrefix = normalized.startsWith('0x')
      ? normalized.slice(2)
      : normalized;
    if (
      withoutHexPrefix.length % 2 === 0 &&
      /^[0-9a-fA-F]+$/.test(withoutHexPrefix)
    ) {
      diagnostics.hexBytes = Buffer.from(withoutHexPrefix, 'hex').length;
    }

    if (/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      diagnostics.base64Bytes = Buffer.from(normalized, 'base64').length;
    }

    if (/^[A-Za-z0-9_-]+={0,2}$/.test(normalized)) {
      const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      diagnostics.base64UrlBytes = Buffer.from(padded, 'base64').length;
    }

    return diagnostics;
  }

  private getMessageCandidates(message: string) {
    const rawMessage = Buffer.from(message, 'utf8');
    const legacyBase64Message = rawMessage.toString('base64');
    return [
      crypto
        .createHash('sha256')
        .update(`${this.freighterMessagePrefix}${message}`, 'utf8')
        .digest(),
      crypto
        .createHash('sha256')
        .update(`${this.freighterMessagePrefix}${legacyBase64Message}`, 'utf8')
        .digest(),
      rawMessage,
      Buffer.from(legacyBase64Message, 'utf8'),
    ];
  }

  private verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string,
  ) {
    const keypair = StellarSdk.Keypair.fromPublicKey(walletAddress);
    const signatures = this.decodeSignatureCandidates(signature);
    const messages = this.getMessageCandidates(message);

    return messages.some((messageCandidate) =>
      signatures.some((signatureCandidate) =>
        keypair.verify(messageCandidate, signatureCandidate),
      ),
    );
  }

  async generateChallenge(
    walletAddress: string,
    network: 'TESTNET' | 'MAINNET',
  ) {
    const normalizedWalletAddress = this.normalizeWalletAddress(walletAddress);
    const normalizedNetwork = this.normalizeNetwork(network);
    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const message = [
      'Lumora Pay wallet sign-in',
      `Wallet: ${normalizedWalletAddress}`,
      `Network: ${normalizedNetwork}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

    await this.prisma.authNonce.create({
      data: {
        walletAddress: normalizedWalletAddress,
        nonce,
        message,
        network: normalizedNetwork,
        expiresAt,
      },
    });

    return { nonce, message, network: normalizedNetwork };
  }

  async verifyChallenge(
    walletAddress: string,
    nonce: string,
    signature: string,
    signerAddress?: string,
  ) {
    const normalizedWalletAddress = this.normalizeWalletAddress(walletAddress);
    const normalizedSignerAddress = signerAddress?.trim();
    if (
      normalizedSignerAddress &&
      !StellarSdk.StrKey.isValidEd25519PublicKey(normalizedSignerAddress)
    ) {
      throw new BadRequestException('Invalid Stellar signer address');
    }

    if (!nonce?.trim()) {
      throw new BadRequestException('Challenge nonce is required');
    }

    if (!signature?.trim()) {
      throw new BadRequestException('Wallet signature is required');
    }

    const authNonce = await this.prisma.authNonce.findUnique({
      where: { nonce: nonce.trim() },
    });

    if (!authNonce) {
      throw new BadRequestException('Challenge nonce not found');
    }

    if (authNonce.walletAddress !== normalizedWalletAddress) {
      throw new BadRequestException('Wallet address mismatch');
    }

    if (
      normalizedSignerAddress &&
      normalizedSignerAddress !== normalizedWalletAddress
    ) {
      throw new BadRequestException('Wallet signer mismatch');
    }

    if (authNonce.expiresAt < new Date()) {
      throw new BadRequestException('Challenge expired');
    }

    if (authNonce.usedAt) {
      throw new BadRequestException('Challenge already used');
    }

    let isValid = false;
    try {
      isValid = this.verifyWalletSignature(
        normalizedWalletAddress,
        authNonce.message,
        signature,
      );
    } catch {
      throw new UnauthorizedException('Signature verification failed');
    }

    if (!isValid) {
      this.logger.warn(
        `Invalid wallet signature for ${normalizedWalletAddress.substring(0, 8)}... nonce=${nonce} diagnostics=${JSON.stringify(
          this.getSignatureDiagnostics(signature),
        )}`,
      );
      throw new UnauthorizedException('Invalid signature');
    }

    // Mark nonce as used
    await this.prisma.authNonce.update({
      where: { id: authNonce.id },
      data: { usedAt: new Date() },
    });

    // Create user if not exists
    let user = await this.prisma.user.findFirst({
      where: {
        wallets: {
          some: {
            publicKey: normalizedWalletAddress,
            network: authNonce.network,
          },
        },
      },
      include: {
        wallets: true,
      },
    });

    if (!user) {
      // Create user
      user = await this.prisma.user.create({
        data: {
          displayName: `User ${normalizedWalletAddress.substring(0, 6)}...${normalizedWalletAddress.substring(52)}`,
          status: 'ACTIVE',
        },
        include: {
          wallets: true,
        },
      });

      await this.prisma.wallet.create({
        data: {
          userId: user.id,
          publicKey: normalizedWalletAddress,
          network: authNonce.network,
          isPrimary: true,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const merchantMembership = await this.prisma.merchantMember.findFirst({
      where: { userId: user.id },
      include: {
        merchant: {
          include: { defaultWallet: true },
        },
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, walletAddress: normalizedWalletAddress };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });

    return {
      accessToken,
      user,
      merchant: merchantMembership?.merchant ?? null,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
      include: {
        merchant: {
          include: { defaultWallet: true },
        },
      },
    });

    return {
      user,
      wallets: user.wallets,
      merchant: membership?.merchant ?? null,
    };
  }
}
