import { LogEntry } from './logs.types';

export const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: '2026-01-26T12:05:00Z', level: 'error', service: 'api-gateway', message: 'Unhandled exception in request handler', stack: 'Error: Timeout\n    at RequestHandler.process (api.ts:45)\n    at async Router.handle (router.ts:12)', metadata: { requestId: 'req_123', userId: 'usr_456' } },
  { id: '2', timestamp: '2026-01-26T12:04:55Z', level: 'warning', service: 'ai-provider', message: 'Rate limit approaching for OpenAI', metadata: { provider: 'openai', limit: 1000, current: 950 } },
  { id: '3', timestamp: '2026-01-26T12:04:50Z', level: 'info', service: 'auth-service', message: 'User logged in successfully', metadata: { userId: 'usr_789', ip: '192.168.1.10' } },
  { id: '4', timestamp: '2026-01-26T12:04:45Z', level: 'success', service: 'billing', message: 'Invoice paid successfully', metadata: { invoiceId: 'inv_101', amount: 99 } },
  { id: '5', timestamp: '2026-01-26T12:04:40Z', level: 'debug', service: 'cache-layer', message: 'Cache miss for key: user_profile_123', metadata: { key: 'user_profile_123', ttl: 3600 } },
];