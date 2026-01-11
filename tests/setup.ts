import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local file (PostgreSQL)
// Falls back to .env if .env.local doesn't exist
const envLocalPath = path.resolve(__dirname, '../.env.local')
const envPath = path.resolve(__dirname, '../.env')

try {
  dotenv.config({ path: envLocalPath })
} catch {
  dotenv.config({ path: envPath })
}

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Setup and teardown for all tests
beforeAll(() => {
  // Add any global setup here
})

afterAll(() => {
  // Add any global cleanup here
})
