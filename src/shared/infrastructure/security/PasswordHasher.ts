import * as bcrypt from 'bcrypt';

export class PasswordHasher {
  private static readonly SALT_ROUNDS = 12; // High salt rounds for enterprise security

  /**
   * Hashes a plaintext password utilizing bcrypt's salted hashing algorithm.
   */
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash securely.
   */
  public static async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
