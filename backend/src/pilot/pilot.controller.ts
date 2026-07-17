import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PilotService, type PilotUser } from './pilot.service';

interface PilotRequest extends Request {
  user: PilotUser;
}

function userAgentFrom(req: Request): string | undefined {
  const userAgent = req.headers['user-agent'] as string | string[] | undefined;
  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
}

@Controller('pilot')
export class PilotController {
  constructor(private pilotService: PilotService) {}

  @Post('events')
  async recordEvent(
    @Req() req: Request,
    @Body()
    body: {
      eventName: string;
      route?: string;
      sessionId?: string;
      walletAddress?: string;
      properties?: Record<string, unknown>;
    },
  ) {
    return this.pilotService.recordEvent(body, userAgentFrom(req));
  }

  @Post('wallet-interactions')
  @UseGuards(JwtAuthGuard)
  async recordWalletInteraction(
    @Req() req: PilotRequest,
    @Body()
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
  ) {
    return this.pilotService.recordWalletInteraction(
      req.user,
      body,
      userAgentFrom(req),
    );
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async submitFeedback(
    @Req() req: PilotRequest,
    @Body()
    body: {
      category?: string;
      rating: number;
      message: string;
      contactConsent?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.pilotService.submitFeedback(req.user, body);
  }

  @Get('feedback')
  @UseGuards(JwtAuthGuard)
  async listFeedback(@Req() req: PilotRequest) {
    return this.pilotService.listFeedback(req.user.id);
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async overview(@Req() req: PilotRequest) {
    return this.pilotService.getOverview(req.user.id);
  }
}
