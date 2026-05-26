const encoder = new TextEncoder()

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password, salt) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${password}:${salt}`))
  return toHex(digest)
}

export async function verifyPassword(password, salt, expectedHash) {
  return (await hashPassword(password, salt)) === expectedHash
}