import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ||
        'lumora-pay-dev-access-secret-change-in-production',
    });
  }

  async validate(payload: { sub: string; walletAddress: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        wallets: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
