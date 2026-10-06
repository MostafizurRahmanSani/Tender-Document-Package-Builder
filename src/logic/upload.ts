export const MAX_FILES = 30
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024

// A real PDF always starts with "%PDF-". We check the bytes, not just the name.
export function hasPdfSignature(head: Uint8Array): boolean {
  const sig = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
  return sig.every((b, i) => head[i] === b)
}

// Returns why a file cannot be added, or null if it fits within the limits.
export function limitProblem(currentCount: number, currentBytes: number, size: number): 'too_many' | 'too_big' | null {
  if (currentCount + 1 > MAX_FILES) return 'too_many'
  if (currentBytes + size > MAX_TOTAL_BYTES) return 'too_big'
  return null
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
