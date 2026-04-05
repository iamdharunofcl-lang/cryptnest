import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  const secret = process.env.NEXTAUTH_SECRET || 'cryptnest-super-secret-2026'
  return crypto.scryptSync(secret, 'cryptnest-salt-v1', 32)
}

export function encryptBuffer(buffer) {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Layout: [iv(16)] [authTag(16)] [encrypted data]
  return Buffer.concat([iv, authTag, encrypted])
}

export function decryptBuffer(encryptedBuffer) {
  const key = getKey()
  const iv = encryptedBuffer.subarray(0, 16)
  const authTag = encryptedBuffer.subarray(16, 32)
  const data = encryptedBuffer.subarray(32)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(data), decipher.final()])
}
