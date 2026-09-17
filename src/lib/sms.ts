/**
 * Minimal SMS provider abstraction for delivering OTP codes to customers.
 *
 * No real Iranian SMS gateway (Kavenegar/ippanel/...) credentials exist yet,
 * so the default provider just logs the code to the server console. Swap in
 * a real provider by implementing SmsProvider and wiring it up in
 * getSmsProvider() once SMS_PROVIDER_API_KEY (or similar) is configured.
 */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
  /**
   * Sends an arbitrary free-text message (welcome messages, marketing
   * campaigns, ...). Separate from sendOtp because a real gateway may use a
   * different template/route for transactional vs. marketing traffic.
   */
  sendText(phone: string, message: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    // Dev-mode fallback: no real SMS gateway is configured, so the code is
    // only logged server-side. It is also returned to the client by the
    // requestOtp action, but ONLY outside production (see customerAuth.ts).
    console.log(`[sms:dev] OTP for ${phone}: ${code}`);
  }

  async sendText(phone: string, message: string): Promise<void> {
    // Same dev-mode fallback as sendOtp: no real gateway configured yet, so
    // welcome/campaign messages are only logged server-side for now.
    console.log(`[sms:dev] Text for ${phone}: ${message}`);
  }
}

export function getSmsProvider(): SmsProvider {
  // TODO: once a real provider is chosen, branch on an env var here, e.g.
  //   if (process.env.KAVENEGAR_API_KEY) return new KavenegarSmsProvider(...);
  return new ConsoleSmsProvider();
}
