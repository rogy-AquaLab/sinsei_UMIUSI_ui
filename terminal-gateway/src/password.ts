import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const HASH_PREFIX = 'scrypt'
const KEY_LENGTH = 64

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return [
    HASH_PREFIX,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

export const verifyPasswordHash = async (
  password: string,
  encodedHash: string,
) => {
  const [prefix, encodedSalt, encodedKey] = encodedHash.split('$')
  if (prefix !== HASH_PREFIX || !encodedSalt || !encodedKey) return false

  let salt: Buffer
  let expectedKey: Buffer
  try {
    salt = Buffer.from(encodedSalt, 'base64url')
    expectedKey = Buffer.from(encodedKey, 'base64url')
  } catch {
    return false
  }

  if (expectedKey.length === 0) return false
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer
  return (
    actualKey.length === expectedKey.length &&
    timingSafeEqual(actualKey, expectedKey)
  )
}
