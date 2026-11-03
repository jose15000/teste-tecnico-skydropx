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

export interface SkydropxShipmentAddressPayload {
  street1: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  reference: string;
  country_code?: string;
  postal_code?: string;
  area_level1?: string;
  area_level2?: string;
  area_level3?: string;
}

export interface SkydropxShipmentProductPayload {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  product_type_code?: string;
  product_type_name?: string;
  country_code?: string;
}

export interface SkydropxShipmentPackagePayload {
  package_number?: string;
  package_type: string;
  consignment_note: string;
  package_protected?: boolean;
  declared_value?: number;
  products?: SkydropxShipmentProductPayload[];
}

export interface SkydropxCreateShipmentPayload {
  shipment: {
    rate_id: string;
    unique_shipment?: boolean;
    printing_format?: string;
    address_from?: SkydropxShipmentAddressPayload;
    address_to?: SkydropxShipmentAddressPayload;
    packages?: SkydropxShipmentPackagePayload[];
  };
}

export interface SkydropxShipmentPackageAttributes {
  id?: string;
  tracking_number?: string | number;
  label_url?: string | null;
  tracking_url_provider?: string;
  tracking_status?: string | null;
}

export interface SkydropxShipmentIncludedResource {
  id: string;
  type: string;
  attributes?: SkydropxShipmentPackageAttributes;
}

export interface SkydropxShipmentAttributes {
  id?: string;
  carrier_name?: string;
  workflow_status?: string;
  payment_status?: string;
  total?: string | number;
  master_tracking_number?: string | number;
  error_detail?: string | null;
}

export interface SkydropxShipmentResponse {
  data?: {
    id: string;
    type: string;
    attributes: SkydropxShipmentAttributes;
  };
  included?: SkydropxShipmentIncludedResource[];
}

