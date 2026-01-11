import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('Password utilities', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'password123'
      const hashed = await hashPassword(password)

      expect(hashed).not.toBe(password)
      expect(hashed).toBeTruthy()
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should create different hashes for the same password', async () => {
      const password = 'password123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      // bcrypt uses random salts, so hashes should be different
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty passwords', async () => {
      const password = ''
      const hashed = await hashPassword(password)

      expect(hashed).toBeTruthy()
    })

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(100)
      const hashed = await hashPassword(password)

      expect(hashed).toBeTruthy()
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'password123'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(password, hashed)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'password123'
      const wrongPassword = 'wrongpassword'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hashed)

      expect(isValid).toBe(false)
    })

    it('should reject empty password against hashed password', async () => {
      const password = 'password123'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword('', hashed)

      expect(isValid).toBe(false)
    })

    it('should handle case-sensitive passwords', async () => {
      const password = 'Password123'
      const hashed = await hashPassword(password)

      const validUpper = await verifyPassword('Password123', hashed)
      const invalidLower = await verifyPassword('password123', hashed)

      expect(validUpper).toBe(true)
      expect(invalidLower).toBe(false)
    })
  })
})
