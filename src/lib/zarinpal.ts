/**
 * Minimal ZarinPal (Iranian payment gateway) client for the request/verify
 * flow. No real merchant account exists yet, so this defaults to ZarinPal's
 * sandbox environment, which accepts any UUID-shaped merchant ID and always
 * simulates a successful payment — safe to exercise the whole flow without
 * real money or a registered business. Swap to production by setting
 * ZARINPAL_MERCHANT_ID (a real merchant ID) and ZARINPAL_SANDBOX=false.
 */

const isSandbox = process.env.ZARINPAL_SANDBOX !== 'false';
const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
const API_BASE = isSandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
const GATEWAY_BASE = isSandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com';

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

interface RequestResult {
  ok: boolean;
  authority?: string;
  redirectUrl?: string;
  error?: string;
}

/** amountToman: the order total in Toman (converted to Rial for the API, ZarinPal's native unit). */
export async function requestZarinPalPayment(
  amountToman: number,
  description: string,
  orderId: string
): Promise<RequestResult> {
  try {
    const res = await fetch(`${API_BASE}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Math.round(amountToman) * 10, // Toman -> Rial
        description,
        callback_url: `${getAppBaseUrl()}/api/payment/zarinpal/callback?orderId=${orderId}`,
      }),
    });
    const json = await res.json();

    if (json?.data?.code === 100 && json.data.authority) {
      return {
        ok: true,
        authority: json.data.authority,
        redirectUrl: `${GATEWAY_BASE}/pg/StartPay/${json.data.authority}`,
      };
    }
    return { ok: false, error: json?.errors?.message || 'خطا در اتصال به درگاه پرداخت' };
  } catch (error) {
    console.error('ZarinPal request error:', error);
    return { ok: false, error: 'خطا در اتصال به درگاه پرداخت' };
  }
}

interface VerifyResult {
  ok: boolean;
  refId?: string;
  error?: string;
}

export async function verifyZarinPalPayment(authority: string, amountToman: number): Promise<VerifyResult> {
  try {
    const res = await fetch(`${API_BASE}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Math.round(amountToman) * 10,
        authority,
      }),
    });
    const json = await res.json();

    // 100 = freshly verified, 101 = already verified before (still a success)
    if (json?.data?.code === 100 || json?.data?.code === 101) {
      return { ok: true, refId: String(json.data.ref_id) };
    }
    return { ok: false, error: json?.errors?.message || 'پرداخت تایید نشد' };
  } catch (error) {
    console.error('ZarinPal verify error:', error);
    return { ok: false, error: 'خطا در تایید پرداخت' };
  }
}
