import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  // ── ENC-001: Encrypt Game Info ─────────────────────────────────────────────

  describe('encryptGameInfo()', () => {
    it('ENC-001: should encrypt game info and return format iv:encrypted:key', () => {
      // Arrange
      const gameInfo = {
        username: 'testuser',
        password: 'testpass123',
      };

      // Act
      const result = service.encryptGameInfo(gameInfo);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Verify format: iv:encrypted:key
      const parts = result.split(':');
      expect(parts.length).toBe(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]?.length).toBe(32);
      // Key should be 64 hex chars (32 bytes)
      expect(parts[2]?.length).toBe(64);
    });

    // ── ENC-002: Decrypt Game Info ───────────────────────────────────────────

    it('ENC-002: should decrypt and return original data', () => {
      // Arrange
      const originalInfo = {
        username: 'gameplayer',
        password: 'secretpassword',
        extra: 'some extra data',
      };

      // Act
      const encrypted = service.encryptGameInfo(originalInfo);
      const decrypted = service.decryptGameInfo(encrypted);

      // Assert
      expect(decrypted).toEqual(originalInfo);
    });

    // ── ENC-003: Encrypt with empty/null input handling ────────────────────────

    it('ENC-003: should handle empty object input', () => {
      // Arrange
      const emptyInfo = {};

      // Act
      const result = service.encryptGameInfo(emptyInfo);
      const decrypted = service.decryptGameInfo(result);

      // Assert
      expect(decrypted).toEqual({});
    });

    // ── ENC-004: Decrypt with invalid data ────────────────────────────────────

    it('ENC-004: should throw error with invalid encrypted data', () => {
      // Arrange
      const invalidData = 'invalid-encrypted-data';

      // Act & Assert
      expect(() => service.decryptGameInfo(invalidData)).toThrow('Invalid encrypted data format');
    });

    // ── ENC-005: Per-order key uniqueness ───────────────────────────────────

    it('ENC-005: should generate different encrypted results for same input (unique keys)', () => {
      // Arrange
      const sameInfo = {
        username: 'sameuser',
        password: 'samepass',
      };

      // Act
      const encrypted1 = service.encryptGameInfo(sameInfo);
      const encrypted2 = service.encryptGameInfo(sameInfo);

      // Assert - encrypted results should be different because keys are different
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same original data
      const decrypted1 = service.decryptGameInfo(encrypted1);
      const decrypted2 = service.decryptGameInfo(encrypted2);

      expect(decrypted1).toEqual(sameInfo);
      expect(decrypted2).toEqual(sameInfo);
    });

    // Additional: Verify encryption strength
    it('should encrypt special characters correctly', () => {
      // Arrange
      const specialCharsInfo = {
        username: 'user@domain.com',
        password: 'p@$$w0rd!#$%',
        note: 'Special chars: <>"\'&',
      };

      // Act
      const encrypted = service.encryptGameInfo(specialCharsInfo);
      const decrypted = service.decryptGameInfo(encrypted);

      // Assert
      expect(decrypted).toEqual(specialCharsInfo);
    });

    it('should handle unicode characters', () => {
      // Arrange
      const unicodeInfo = {
        username: 'người_dùng',
        password: 'mật_khẩu_unicode',
        gameName: 'Game Việt Nam',
      };

      // Act
      const encrypted = service.encryptGameInfo(unicodeInfo);
      const decrypted = service.decryptGameInfo(encrypted);

      // Assert
      expect(decrypted).toEqual(unicodeInfo);
    });

    it('should handle long strings', () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const longInfo = {
        username: longString,
        password: longString,
      };

      // Act
      const encrypted = service.encryptGameInfo(longInfo);
      const decrypted = service.decryptGameInfo(encrypted);

      // Assert
      expect(decrypted).toEqual(longInfo);
    });

    it('should throw error when encrypted data is truncated', () => {
      // Arrange - create valid encrypted data then truncate it
      const validEncrypted = service.encryptGameInfo({ test: 'data' });
      const truncatedParts = validEncrypted.split(':');
      const truncated = `${truncatedParts[0]}:${truncatedParts[1]?.substring(0, 10)}`; // Missing key part

      // Act & Assert
      expect(() => service.decryptGameInfo(truncated)).toThrow();
    });
  });
});
