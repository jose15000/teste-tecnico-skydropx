import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottledHttp } from '../../../utils/http-throttle.util.js';
import type {
  PollQuotationOptions,
  SkydropxCreateQuotationPayload,
  SkydropxCreateShipmentPayload,
  SkydropxOAuthTokenResponse,
  SkydropxQuotationResponse,
  SkydropxShipmentResponse,
} from '../../../interfaces/skydropx.interface.js';

@Injectable()
export class SkydropxClient {
  private readonly logger = new Logger(SkydropxClient.name);
  private readonly http = new ThrottledHttp(550);
  private readonly baseUrl: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (config.get<string>('SKYDROPX_BASE_URL') || 'https://sb-pro.skydropx.com').replace(/\/$/, '');
  }

  createQuotation(payload: SkydropxCreateQuotationPayload): Promise<SkydropxQuotationResponse> {
    return this.request('/api/v1/quotations', { method: 'POST', body: JSON.stringify(payload) });
  }

  createShipment(payload: SkydropxCreateShipmentPayload): Promise<SkydropxShipmentResponse> {
    return this.request('/api/v1/shipments/', { method: 'POST', body: JSON.stringify(payload) });
  }

  getShipment(id: string): Promise<SkydropxShipmentResponse> {
    return this.request(`/api/v1/shipments/${id}`);
  }

  async pollShipmentUntilReady(id: string, opts?: PollQuotationOptions): Promise<SkydropxShipmentResponse> {
    const { timeoutMs = 30_000, intervalMs = 2_000 } = opts ?? {};
    const start = Date.now();
    let last: SkydropxShipmentResponse | null = null;
    while (Date.now() - start < timeoutMs) {
      last = await this.getShipment(id);
      const pkg = last.included?.find((i) => i.attributes?.label_url);
      if (pkg?.attributes?.label_url) return last;
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, Math.max(0, timeoutMs - (Date.now() - start)))));
    }
    return last ?? {};
  }

  async downloadPdf(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download label PDF (${res.status}): ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getQuotation(id: string): Promise<SkydropxQuotationResponse> {
    return this.request(`/api/v1/quotations/${id}`);
  }

  async pollQuotationUntilCompleted(id: string, opts?: PollQuotationOptions): Promise<SkydropxQuotationResponse> {
    const { timeoutMs = 45_000, intervalMs = 2_000 } = opts ?? {};
    const start = Date.now();
    let last: SkydropxQuotationResponse | null = null;
    while (Date.now() - start < timeoutMs) {
      last = await this.getQuotation(id);
      if (last.is_completed) return last;
      await new Promise((r) => setTimeout(r, Math.min(intervalMs, Math.max(0, timeoutMs - (Date.now() - start)))));
    }
    this.logger.warn(`Quotation ${id} timed out after ${timeoutMs}ms.`);
    return last ?? { id, is_completed: false, rates: [] };
  }

  private async request<T>(endpoint: string, init: RequestInit = {}, retry401 = true): Promise<T> {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${await this.getToken()}` };
    const res = await this.http.fetch(`${this.baseUrl}${endpoint}`, { ...init, headers });
    if (res.status === 401 && retry401) {
      this.tokenCache = null;
      return this.request<T>(endpoint, init, false);
    }
    if (!res.ok) throw new Error(`Skydropx API error ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) return this.tokenCache.token;
    const client_id = this.config.get<string>('SKYDROPX_CLIENT_ID');
    const client_secret = this.config.get<string>('SKYDROPX_SECRET');
    if (!client_id || !client_secret) throw new Error('Missing SKYDROPX_CLIENT_ID or SKYDROPX_SECRET.');

    const res = await this.http.fetch(`${this.baseUrl}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id, client_secret, grant_type: 'client_credentials' }),
    });
    if (!res.ok) throw new Error(`OAuth failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as SkydropxOAuthTokenResponse;
    this.tokenCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 7200) - 60) * 1000 };
    return data.access_token;
  }
}
