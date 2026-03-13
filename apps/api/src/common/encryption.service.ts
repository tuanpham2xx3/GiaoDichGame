import { Injectable } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';

  /**
   * Encrypt game account info using AES-256-CBC
   * Returns format: "iv:encryptedData:key" (all in hex)
   */
  encryptGameInfo(info: Record<string, unknown>): string {
    const key = randomBytes(32); // 256-bit key
    const iv = randomBytes(16); // 128-bit IV

    const cipher = createCipheriv(this.algorithm, key, iv);
    const dataString = JSON.stringify(info);

    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV:encryptedData:key (all hex encoded)
    return `${iv.toString('hex')}:${encrypted}:${key.toString('hex')}`;
  }

  /**
   * Decrypt game account info
   * Input format: "iv:encryptedData:key" (all in hex)
   */
  decryptGameInfo(encryptedData: string): Record<string, unknown> {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, encrypted, keyHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(keyHex, 'hex');

    const decipher = createDecipheriv(this.algorithm, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
