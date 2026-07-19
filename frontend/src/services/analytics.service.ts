import { pilotApi } from './api/pilot.api';
import type {
  PilotEventRequest,
  WalletInteractionRequest,
} from '../types/api.types';

const SESSION_KEY = 'lumora_pilot_session_id';
let memorySessionId: string | null = null;

function makeSessionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id = makeSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    memorySessionId ||= makeSessionId();
    return memorySessionId;
  }
}

function route() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return `${window.location.pathname}${window.location.search}`;
}

function ignoreTrackingFailure(error: unknown) {
  if (import.meta.env.DEV) {
    console.debug('Pilot tracking skipped:', error);
  }
}

export const analyticsService = {
  trackEvent: (eventName: string, properties: Record<string, unknown> = {}) => {
    try {
      const body: PilotEventRequest = {
        eventName,
        route: route(),
        sessionId: getSessionId(),
        properties,
      };
      pilotApi.event(body).catch(ignoreTrackingFailure);
    } catch (error) {
      ignoreTrackingFailure(error);
    }
  },

  trackWalletInteraction: (
    interactionType: WalletInteractionRequest['interactionType'],
    input: Omit<WalletInteractionRequest, 'interactionType'> = {},
  ) => {
    try {
      pilotApi
        .walletInteraction({
          interactionType,
          route: route(),
          ...input,
        })
        .catch(ignoreTrackingFailure);
    } catch (error) {
      ignoreTrackingFailure(error);
    }
  },
};
