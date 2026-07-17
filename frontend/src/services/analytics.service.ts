import { pilotApi } from './api/pilot.api';
import type {
  PilotEventRequest,
  WalletInteractionRequest,
} from '../types/api.types';

const SESSION_KEY = 'lumora_pilot_session_id';

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function route() {
  return `${window.location.pathname}${window.location.search}`;
}

function ignoreTrackingFailure(error: unknown) {
  if (import.meta.env.DEV) {
    console.debug('Pilot tracking skipped:', error);
  }
}

export const analyticsService = {
  trackEvent: (eventName: string, properties: Record<string, unknown> = {}) => {
    const body: PilotEventRequest = {
      eventName,
      route: route(),
      sessionId: getSessionId(),
      properties,
    };
    pilotApi.event(body).catch(ignoreTrackingFailure);
  },

  trackWalletInteraction: (
    interactionType: WalletInteractionRequest['interactionType'],
    input: Omit<WalletInteractionRequest, 'interactionType'> = {},
  ) => {
    pilotApi
      .walletInteraction({
        interactionType,
        route: route(),
        ...input,
      })
      .catch(ignoreTrackingFailure);
  },
};
