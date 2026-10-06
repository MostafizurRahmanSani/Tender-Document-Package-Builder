import type { UploadedFile } from '../types'

// fileId -> ids of the other files with exactly the same content.
export function findDuplicates(files: UploadedFile[]): Map<string, string[]> {
  const byHash = new Map<string, string[]>()
  for (const f of files) {
    if (f.state !== 'ready') continue
    const ids = byHash.get(f.hash) ?? []
    ids.push(f.id)
    byHash.set(f.hash, ids)
  }
  const result = new Map<string, string[]>()
  for (const ids of byHash.values()) {
    if (ids.length < 2) continue
    for (const id of ids) result.set(id, ids.filter((x) => x !== id))
  }
  return result
}
