import * as jwt from 'jsonwebtoken';

export class JwtService {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
    if (!process.env.JWT_SECRET) {
      console.warn('[JwtService] WARNING: JWT_SECRET environment variable is not set. Using insecure fallback.');
    }
    return secret;
  }

  /**
   * Cryptographically signs a payload to generate an access token.
   * Hardcoded to 15m expiration per ADR-0018 specifications.
   */
  public static sign(payload: object): string {
    return jwt.sign(payload, this.getSecret(), { expiresIn: '15m' });
  }

  /**
   * Verifies the cryptographic signature of an access token and returns the decoded payload.
   */
  public static verify(token: string): any {
    try {
      return jwt.verify(token, this.getSecret());
    } catch (error) {
      throw new Error('Unauthorized: Invalid or expired token.');
    }
  }
}
