import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wallet/challenge')
  async challenge(
    @Body() body: { walletAddress: string; network?: 'TESTNET' | 'MAINNET' },
  ) {
    return this.authService.generateChallenge(
      body.walletAddress,
      body.network || 'TESTNET',
    );
  }

  @Post('wallet/verify')
  async verify(
    @Body()
    body: {
      walletAddress: string;
      nonce: string;
      signature: string;
      signerAddress?: string;
    },
  ) {
    return this.authService.verifyChallenge(
      body.walletAddress,
      body.nonce,
      body.signature,
      body.signerAddress,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { success: true };
  }
}
