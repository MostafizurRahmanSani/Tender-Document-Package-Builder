export type Lang = 'en' | 'bn'

export interface Tender {
  tender_id: string
  title: string
  procuring_entity: string
  bidder: string
  submission_deadline: string // YYYY-MM-DD
  // Optional Bangla versions. Shown in Bangla mode when present, otherwise the English text is used.
  title_bn?: string
  procuring_entity_bn?: string
  bidder_bn?: string
}

export interface Requirement {
  id: string
  order: number
  title_en: string
  title_bn: string
  mandatory: boolean
  has_expiry: boolean
}

export type FileError = 'encrypted' | 'damaged'

export interface UploadedFile {
  id: string
  name: string
  size: number
  pages: number
  hash: string // SHA-256 of the file bytes, hex
  bytes: ArrayBuffer | null
  state: 'reading' | 'ready' | 'error'
  error?: FileError
}

export type Status = 'missing' | 'expiry_needed' | 'expired' | 'not_provided' | 'ok'

// requirementId -> fileId, and requirementId -> YYYY-MM-DD
export interface MatchState {
  matches: Record<string, string>
  expiry: Record<string, string>
}

export type NoticeKind = 'not_pdf' | 'too_many' | 'too_big' | 'encrypted' | 'damaged'

export interface Notice {
  id: string
  kind: NoticeKind
  name: string
}

// Seal or signature: one PNG that can be placed on chosen pages of the package.
export interface SealImage {
  name: string
  bytes: ArrayBuffer
  width: number
  height: number
  url: string // object URL for the on-screen preview only
}
