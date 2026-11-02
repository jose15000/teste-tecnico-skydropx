export interface SkydropxOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at?: number;
}

export interface SkydropxAddressPayload {
  country_code: string;
  postal_code: string;
  area_level1: string;
  area_level2: string;
  area_level3: string;
  tax_id_number?: string | null;
}

export interface SkydropxParcelPayload {
  length: number;
  width: number;
  height: number;
  weight: number;
  package_protected?: boolean;
  declared_value?: number;
}

export interface SkydropxCreateQuotationPayload {
  quotation: {
    address_from: SkydropxAddressPayload;
    address_to: SkydropxAddressPayload;
    parcels: SkydropxParcelPayload[];
    requested_carriers?: string[];
  };
}

export interface SkydropxRateResponse {
  id: string;
  success: boolean;
  provider_name?: string;
  provider_display_name?: string;
  provider_service_name?: string;
  provider_service_code?: string;
  status?: string;
  currency_code?: string | null;
  amount?: string | number | null;
  total?: string | number | null;
  days?: number | null;
  error_messages?: string[] | null;
}

export interface SkydropxQuotationResponse {
  id: string;
  is_completed: boolean;
  rates?: SkydropxRateResponse[];
  quotation_scope?: {
    carriers_scoped_to: string;
    found_carriers?: string[];
    not_found_carriers?: string[];
  };
}

export interface PollQuotationOptions {
  timeoutMs?: number;
  intervalMs?: number;
}
