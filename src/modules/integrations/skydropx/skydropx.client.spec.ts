import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SkydropxClient } from './skydropx.client.js';

describe('SkydropxClient', () => {
  const originalFetch = globalThis.fetch;
  let client: SkydropxClient;
  let mockConfig: ConfigService;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'SKYDROPX_CLIENT_ID') return 'test_client_id';
        if (key === 'SKYDROPX_SECRET') return 'test_secret';
        if (key === 'SKYDROPX_BASE_URL') return 'https://test-api.skydropx.com';
        return null;
      }),
    } as unknown as ConfigService;

    client = new SkydropxClient(mockConfig);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should acquire OAuth2 token, cache it, and reuse it across requests', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('/api/v1/oauth/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'mock_token_abc',
            expires_in: 7200,
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'q-1', is_completed: true, rates: [] }),
      };
    });

    await client.getQuotation('q-1');
    await client.getQuotation('q-1');

    // OAuth fetch should only be called once because token was cached
    const oauthCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => String(c[0]).includes('/oauth/token'),
    );
    expect(oauthCalls).toHaveLength(1);
    expect(callCount).toBe(3); // 1 token + 2 quotations
  });

  it('should throw when credentials are missing', async () => {
    const unconfigured = new SkydropxClient({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(unconfigured.getQuotation('q-1')).rejects.toThrow(
      /Missing SKYDROPX_CLIENT_ID or SKYDROPX_SECRET/,
    );
  });

  it('should retry on HTTP 429 and succeed on retry', async () => {
    let attempts = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/oauth/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'token_123', expires_in: 7200 }),
        };
      }

      attempts++;
      if (attempts === 1) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '0.01' }),
          text: async () => 'Rate limit exceeded',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'q-retry', is_completed: true, rates: [] }),
      };
    });

    const res = await client.getQuotation('q-retry');
    expect(res.id).toBe('q-retry');
    expect(attempts).toBe(2);
  });

  it('should recover from 401 Unauthorized by clearing cache and retrying with new token', async () => {
    let tokenCalls = 0;
    let quoteCalls = 0;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/oauth/token')) {
        tokenCalls++;
        return {
          ok: true,
          json: async () => ({ access_token: `token_${tokenCalls}`, expires_in: 7200 }),
        };
      }

      quoteCalls++;
      if (quoteCalls === 1) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Unauthorized token expired',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'q-recovered', is_completed: true, rates: [] }),
      };
    });

    const res = await client.getQuotation('q-recovered');
    expect(res.id).toBe('q-recovered');
    expect(tokenCalls).toBe(2); // Initial + refreshed token
  });

  it('should poll quotation until completed', async () => {
    let pollCount = 0;
    vi.spyOn(client, 'getQuotation').mockImplementation(async () => {
      pollCount++;
      return {
        id: 'q-poll',
        is_completed: pollCount >= 2,
        rates: pollCount >= 2 ? [{ id: 'rate-1', success: true }] : [],
      };
    });

    const res = await client.pollQuotationUntilCompleted('q-poll', {
      timeoutMs: 1000,
      intervalMs: 10,
    });

    expect(res.is_completed).toBe(true);
    expect(pollCount).toBe(2);
  });

  it('should handle timeout gracefully without throwing', async () => {
    vi.spyOn(client, 'getQuotation').mockResolvedValue({
      id: 'q-timeout',
      is_completed: false,
      rates: [],
    });

    const res = await client.pollQuotationUntilCompleted('q-timeout', {
      timeoutMs: 30,
      intervalMs: 10,
    });

    expect(res.id).toBe('q-timeout');
    expect(res.is_completed).toBe(false);
  });
});
