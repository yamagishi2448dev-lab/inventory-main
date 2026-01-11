import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSession, getSession, deleteSession, generateToken } from '@/lib/auth/session'

describe('Auth API Integration Tests', () => {
  let testUserId: string
  const testUsername = 'testuser_auth'
  const testPassword = 'testpassword123'

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await hashPassword(testPassword)
    const user = await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Clean up all test data
    await prisma.session.deleteMany({
      where: {
        userId: testUserId,
      },
    })

    await prisma.user.deleteMany({
      where: {
        username: { contains: 'testuser_auth' },
      },
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up sessions before each test
    await prisma.session.deleteMany({
      where: {
        userId: testUserId,
      },
    })
  })

  describe('User Authentication', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hashPassword(password)

      expect(hashed).not.toBe(password)
      expect(hashed).toContain('$2')

      const isValid = await verifyPassword(password, hashed)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'correctPassword'
      const wrongPassword = 'wrongPassword'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hashed)
      expect(isValid).toBe(false)
    })

    it('should authenticate user with correct credentials', async () => {
      const user = await prisma.user.findUnique({
        where: { username: testUsername },
      })

      expect(user).toBeDefined()

      const isValid = await verifyPassword(testPassword, user!.passwordHash)
      expect(isValid).toBe(true)
    })

    it('should reject authentication with incorrect password', async () => {
      const user = await prisma.user.findUnique({
        where: { username: testUsername },
      })

      expect(user).toBeDefined()

      const isValid = await verifyPassword('wrongpassword', user!.passwordHash)
      expect(isValid).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create a session', async () => {
      const token = await createSession(testUserId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(20)

      const session = await prisma.session.findFirst({
        where: { userId: testUserId },
      })

      expect(session).toBeDefined()
      expect(session?.userId).toBe(testUserId)
    })

    it('should retrieve a session by token', async () => {
      const token = await createSession(testUserId)
      const session = await getSession(token)

      expect(session).toBeDefined()
      expect(session?.userId).toBe(testUserId)
      expect(session?.user).toBeDefined()
      expect(session?.user.username).toBe(testUsername)
    })

    it('should return null for invalid token', async () => {
      const session = await getSession('invalid-token-12345')

      expect(session).toBeNull()
    })

    it('should delete a session', async () => {
      const token = await createSession(testUserId)

      const sessionBefore = await getSession(token)
      expect(sessionBefore).toBeDefined()

      await deleteSession(token)

      const sessionAfter = await getSession(token)
      expect(sessionAfter).toBeNull()
    })

    it('should handle expired sessions', async () => {
      // Create a session
      const token = generateToken()
      const hashedToken = await hashPassword(token)

      // Create session with past expiry date
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: hashedToken,
          expiresAt: expiredDate,
        },
      })

      const session = await getSession(token)

      // Session should be null because it's expired
      expect(session).toBeNull()
    })

    it('should generate unique tokens', async () => {
      const token1 = generateToken()
      const token2 = generateToken()

      expect(token1).not.toBe(token2)
      expect(token1.length).toBeGreaterThan(20)
      expect(token2.length).toBeGreaterThan(20)
    })
  })

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const hashedPassword = await hashPassword('newuserpassword')
      const user = await prisma.user.create({
        data: {
          username: 'testuser_auth_new',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      })

      expect(user).toBeDefined()
      expect(user.username).toBe('testuser_auth_new')
      expect(user.role).toBe('USER')

      // Clean up
      await prisma.user.delete({
        where: { id: user.id },
      })
    })

    it('should not create user with duplicate username', async () => {
      const hashedPassword = await hashPassword('password')

      await expect(
        prisma.user.create({
          data: {
            username: testUsername, // Already exists
            passwordHash: hashedPassword,
            role: 'USER',
          },
        })
      ).rejects.toThrow()
    })

    it('should retrieve user by username', async () => {
      const user = await prisma.user.findUnique({
        where: { username: testUsername },
      })

      expect(user).toBeDefined()
      expect(user?.username).toBe(testUsername)
    })

    it('should update user password', async () => {
      const newPassword = 'newSecurePassword123'
      const newHashedPassword = await hashPassword(newPassword)

      const updated = await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordHash: newHashedPassword,
        },
      })

      const isValid = await verifyPassword(newPassword, updated.passwordHash)
      expect(isValid).toBe(true)

      // Restore original password for other tests
      const originalHashedPassword = await hashPassword(testPassword)
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          passwordHash: originalHashedPassword,
        },
      })
    })

    it('should delete user and cascade delete sessions', async () => {
      // Create a temporary user
      const hashedPassword = await hashPassword('temppassword')
      const tempUser = await prisma.user.create({
        data: {
          username: 'testuser_auth_temp',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      })

      // Create a session for the temporary user
      await createSession(tempUser.id)

      // Verify session exists
      const sessionsBefore = await prisma.session.findMany({
        where: { userId: tempUser.id },
      })
      expect(sessionsBefore.length).toBeGreaterThan(0)

      // Delete user (should cascade delete sessions)
      await prisma.user.delete({
        where: { id: tempUser.id },
      })

      // Verify sessions are deleted
      const sessionsAfter = await prisma.session.findMany({
        where: { userId: tempUser.id },
      })
      expect(sessionsAfter).toHaveLength(0)
    })
  })

  describe('User Roles', () => {
    it('should create admin user', async () => {
      const hashedPassword = await hashPassword('adminpassword')
      const admin = await prisma.user.create({
        data: {
          username: 'testuser_auth_admin',
          passwordHash: hashedPassword,
          role: 'ADMIN',
        },
      })

      expect(admin.role).toBe('ADMIN')

      // Clean up
      await prisma.user.delete({
        where: { id: admin.id },
      })
    })

    it('should create regular user', async () => {
      const hashedPassword = await hashPassword('userpassword')
      const user = await prisma.user.create({
        data: {
          username: 'testuser_auth_regular',
          passwordHash: hashedPassword,
          role: 'USER',
        },
      })

      expect(user.role).toBe('USER')

      // Clean up
      await prisma.user.delete({
        where: { id: user.id },
      })
    })

    it('should filter users by role', async () => {
      const admins = await prisma.user.findMany({
        where: {
          username: { contains: 'testuser_auth' },
          role: 'ADMIN',
        },
      })

      expect(admins.length).toBeGreaterThanOrEqual(1)
      expect(admins.every((u) => u.role === 'ADMIN')).toBe(true)
    })
  })

  describe('Multiple Sessions', () => {
    it('should allow multiple active sessions for one user', async () => {
      const token1 = await createSession(testUserId)
      const token2 = await createSession(testUserId)

      const session1 = await getSession(token1)
      const session2 = await getSession(token2)

      expect(session1).toBeDefined()
      expect(session2).toBeDefined()
      expect(session1?.id).not.toBe(session2?.id)

      const allSessions = await prisma.session.findMany({
        where: { userId: testUserId },
      })

      expect(allSessions.length).toBeGreaterThanOrEqual(2)
    })

    it('should delete only specified session', async () => {
      const token1 = await createSession(testUserId)
      const token2 = await createSession(testUserId)

      await deleteSession(token1)

      const session1 = await getSession(token1)
      const session2 = await getSession(token2)

      expect(session1).toBeNull()
      expect(session2).toBeDefined()
    })

    it('should delete all sessions for a user on logout', async () => {
      await createSession(testUserId)
      await createSession(testUserId)
      await createSession(testUserId)

      const sessionsBefore = await prisma.session.findMany({
        where: { userId: testUserId },
      })
      expect(sessionsBefore.length).toBe(3)

      // Delete all sessions
      await prisma.session.deleteMany({
        where: { userId: testUserId },
      })

      const sessionsAfter = await prisma.session.findMany({
        where: { userId: testUserId },
      })
      expect(sessionsAfter).toHaveLength(0)
    })
  })

  describe('Session Expiry', () => {
    it('should set correct expiry date on session creation', async () => {
      const token = await createSession(testUserId)

      const session = await prisma.session.findFirst({
        where: { userId: testUserId },
      })

      expect(session).toBeDefined()

      const now = new Date()
      const expiresAt = session!.expiresAt

      // Session should expire in the future (7 days)
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())

      // Should be approximately 7 days from now (with 1 minute tolerance)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const timeDiff = Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime())
      expect(timeDiff).toBeLessThan(60 * 1000) // Less than 1 minute difference
    })

    it('should cleanup expired sessions', async () => {
      // Create an expired session manually
      const token = generateToken()
      const hashedToken = await hashPassword(token)

      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1)

      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: hashedToken,
          expiresAt: expiredDate,
        },
      })

      // Clean up expired sessions
      await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })

      // Verify expired session is deleted
      const sessions = await prisma.session.findMany({
        where: { userId: testUserId },
      })

      expect(sessions).toHaveLength(0)
    })
  })
})
