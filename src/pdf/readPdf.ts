import { EncryptedPDFError, PDFDocument } from 'pdf-lib'
import type { FileError } from '../types'

// Opens a PDF only to count its pages. Password-protected or broken files
// return an error instead of throwing, so the app never crashes on bad input.
export async function readPdf(bytes: ArrayBuffer): Promise<{ pages: number } | { error: FileError }> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false })
    const pages = doc.getPageCount()
    if (pages < 1) return { error: 'damaged' }
    return { pages }
  } catch (e) {
    if (e instanceof EncryptedPDFError || /encrypt/i.test(String((e as Error)?.message))) return { error: 'encrypted' }
    return { error: 'damaged' }
  }
}
