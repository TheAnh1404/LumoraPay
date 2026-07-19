import { apiClient } from './api-client';
import type {
  PilotEvidenceDto,
  PilotEventRequest,
  PilotOverviewDto,
  ProductFeedbackRequest,
  WalletInteractionRequest,
} from '../../types/api.types';

export const pilotApi = {
  event: (body: PilotEventRequest) =>
    apiClient.post<{ id: string; accepted: boolean }>('/pilot/events', body, {
      auth: false,
      timeoutMs: 10000,
    }),
  walletInteraction: (body: WalletInteractionRequest) =>
    apiClient.post<{ id: string; recorded: boolean }>(
      '/pilot/wallet-interactions',
      body,
      { timeoutMs: 10000 },
    ),
  feedback: (body: ProductFeedbackRequest) =>
    apiClient.post<{ id: string; submitted: boolean }>('/pilot/feedback', body),
  overview: () => apiClient.get<PilotOverviewDto>('/pilot/overview'),
  evidence: () => apiClient.get<PilotEvidenceDto>('/pilot/evidence'),
};
