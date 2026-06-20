export interface SadadFormParams {
  merchant_id: string;
  ORDER_ID: string;
  WEBSITE: string;
  TXN_AMOUNT: string;
  CUST_ID: string;
  EMAIL: string;
  MOBILE_NO: string;
  CALLBACK_URL: string;
  txnDate: string;
  VERSION: string;
  SADAD_WEBCHECKOUT_PAGE_LANGUAGE: string;
  signature: string;
}

export interface SadadProduct {
  order_id: string;
  amount: string;
  quantity: string;
}

export interface SadadPaymentMetadata {
  checkoutUrl: string;
  formParams: SadadFormParams;
  products: SadadProduct[];
}

export interface VendurePayment {
  id: string;
  state: "Created" | "Authorized" | "Settled" | "Declined" | "Cancelled" | "Error";
  method: string;
  metadata: SadadPaymentMetadata | Record<string, unknown>;
  errorMessage?: string;
}
