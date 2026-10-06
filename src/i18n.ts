import type { Lang } from './types'

// Every visible string lives here, in both languages. Components only call t(key).
const en = {
  app_name: 'Tender Package Builder',
  app_tag: 'Check, order and combine tender documents',
  lang_label: 'Language',
  privacy: 'Files never leave your computer',

  // Start screen
  start_title: 'Build a complete, checked tender package',
  start_lead: 'Open the tender’s requirements file, add your PDF documents, and download one correctly ordered package with a cover page and page numbers.',
  step1: 'Open requirements.json',
  step1_hint: 'The tender details and the list of required documents',
  step2: 'Add PDFs and match them',
  step2_hint: 'Each document gets one file. We check dates and duplicates',
  step3: 'Download the package',
  step3_hint: 'Cover page, correct order, page numbers on every page',
  open_requirements: 'Open requirements.json',
  drop_requirements: 'or drop the file here',

  // Requirement errors
  err_json: 'This file is not valid JSON. Please choose the tender’s requirements.json file.',
  err_tender_field: 'The tender details are incomplete: “{field}” is missing.',
  err_deadline: 'The submission deadline must be a real date in YYYY-MM-DD format.',
  err_no_requirements: 'The file does not list any required documents.',
  err_requirement: 'Document no. {index} has a missing or wrong “{field}”.',
  err_duplicate_id: 'Two documents share the same ID “{id}”.',

  // Tender header
  tender_id: 'Tender ID',
  procuring_entity: 'Procuring entity',
  bidder: 'Bidder',
  deadline: 'Submission deadline',
  change_tender: 'Open another tender',

  // Requirements list
  required_docs: 'Required documents',
  required_docs_hint: 'Match one file to each document. The package follows this order.',
  mandatory: 'Required',
  optional: 'Optional',
  needs_expiry: 'Has expiry date',
  choose_file: 'Choose a file…',
  no_files_yet: 'Add PDFs first',
  remove_match: 'Remove match',
  expiry_date: 'Expiry date',
  pages: '{n} pages',
  page_one: '1 page',
  undo: 'Undo',
  auto_match: 'Auto-match by name',
  auto_matched: 'Matched {n} files by name. Please check each one.',
  auto_matched_none: 'No more files could be matched by name.',
  in_use_by: 'used for {doc}',
  same_as: 'same content as {name}',

  // Status
  st_missing: 'Missing',
  st_expiry_needed: 'Expiry date needed',
  st_expired: 'Expired',
  st_not_provided: 'Not provided',
  st_ok: 'OK',
  why_missing: 'A file is required for this document.',
  why_expiry_needed: 'Enter the expiry date shown on the document.',
  why_expired: 'Expired on {date}. It must be valid until {deadline}.',
  why_not_provided: 'Optional. It will be left out of the package.',
  why_ok_expiry: 'Valid until {date}.',
  why_ok: 'Ready.',

  // Files panel
  your_files: 'Your files',
  files_hint: 'PDF only · up to 30 files · 50 MB in total',
  add_pdfs: 'Add PDF files',
  drop_pdfs: 'or drop them here',
  usage: '{count} of 30 files · {size} of 50 MB',
  reading: 'Reading…',
  remove_file: 'Remove file',
  duplicate: 'Duplicate',
  matched_to: 'Matched: {doc}',
  not_matched: 'Not matched',
  match_to: 'Match to…',
  file_encrypted: 'Password-protected. Remove the password and add it again.',
  file_damaged: 'Damaged or unreadable PDF.',
  empty_files: 'No files yet. Add the PDF documents for this tender.',
  dismiss: 'Dismiss',
  n_not_pdf: '“{name}” was not added: it is not a PDF file.',
  n_too_many: '“{name}” was not added: the limit is 30 files.',
  n_too_big: '“{name}” was not added: the total would be more than 50 MB.',
  n_encrypted: '“{name}” is password-protected and cannot be used.',
  n_damaged: '“{name}” is damaged and cannot be read.',

  // Generate bar
  ready_count: '{ok} of {total} required documents ready',
  all_ready: 'Everything is ready. You can create the package.',
  blocked_title: 'Fix these before creating the package:',
  more_blockers: '+{n} more',
  generate: 'Create package',
  generating: 'Creating…',
  with_index: 'Add index page',
  index_short: 'Index',
  export_csv: 'Export checklist (CSV)',
  done: 'Package downloaded · {pages} pages',
  download_again: 'Download again',
  gen_failed: 'The package could not be created. A file may be damaged. Remove it and try again.',
} as const

export type Key = keyof typeof en

const bn: Record<Key, string> = {
  app_name: 'টেন্ডার প্যাকেজ বিল্ডার',
  app_tag: 'টেন্ডারের কাগজপত্র যাচাই, সাজানো ও একত্র করুন',
  lang_label: 'ভাষা',
  privacy: 'ফাইল আপনার কম্পিউটারের বাইরে যায় না',

  start_title: 'সম্পূর্ণ ও যাচাই করা টেন্ডার প্যাকেজ তৈরি করুন',
  start_lead: 'টেন্ডারের রিকোয়ারমেন্টস ফাইল খুলুন, আপনার পিডিএফ কাগজপত্র যোগ করুন, তারপর কভার পেজ ও পৃষ্ঠা নম্বরসহ সঠিক ক্রমে সাজানো একটি প্যাকেজ ডাউনলোড করুন।',
  step1: 'requirements.json খুলুন',
  step1_hint: 'টেন্ডারের তথ্য ও প্রয়োজনীয় কাগজের তালিকা',
  step2: 'পিডিএফ যোগ করে মিলিয়ে নিন',
  step2_hint: 'প্রতিটি কাগজের জন্য একটি ফাইল। তারিখ ও ডুপ্লিকেট আমরা যাচাই করি',
  step3: 'প্যাকেজ ডাউনলোড করুন',
  step3_hint: 'কভার পেজ, সঠিক ক্রম, প্রতিটি পাতায় পৃষ্ঠা নম্বর',
  open_requirements: 'requirements.json খুলুন',
  drop_requirements: 'অথবা ফাইলটি এখানে ছেড়ে দিন',

  err_json: 'এটি সঠিক JSON ফাইল নয়। টেন্ডারের requirements.json ফাইলটি বেছে নিন।',
  err_tender_field: 'টেন্ডারের তথ্য অসম্পূর্ণ: “{field}” নেই।',
  err_deadline: 'জমার শেষ তারিখ YYYY-MM-DD ফরম্যাটে একটি সঠিক তারিখ হতে হবে।',
  err_no_requirements: 'ফাইলে কোনো প্রয়োজনীয় কাগজের তালিকা নেই।',
  err_requirement: '{index} নম্বর কাগজে “{field}” নেই বা ভুল।',
  err_duplicate_id: 'দুটি কাগজের আইডি একই: “{id}”।',

  tender_id: 'টেন্ডার আইডি',
  procuring_entity: 'ক্রয়কারী প্রতিষ্ঠান',
  bidder: 'দরদাতা',
  deadline: 'জমার শেষ তারিখ',
  change_tender: 'অন্য টেন্ডার খুলুন',

  required_docs: 'প্রয়োজনীয় কাগজপত্র',
  required_docs_hint: 'প্রতিটি কাগজের সাথে একটি ফাইল মেলান। প্যাকেজ এই ক্রমেই সাজানো হবে।',
  mandatory: 'বাধ্যতামূলক',
  optional: 'ঐচ্ছিক',
  needs_expiry: 'মেয়াদ আছে',
  choose_file: 'ফাইল বেছে নিন…',
  no_files_yet: 'আগে পিডিএফ যোগ করুন',
  remove_match: 'মিল সরান',
  expiry_date: 'মেয়াদ শেষের তারিখ',
  pages: '{n} পৃষ্ঠা',
  page_one: '১ পৃষ্ঠা',
  undo: 'আগের অবস্থায় ফিরুন',
  auto_match: 'নাম দেখে মেলান',
  auto_matched: 'নাম দেখে {n}টি ফাইল মেলানো হয়েছে। প্রতিটি যাচাই করে নিন।',
  auto_matched_none: 'নাম দেখে আর কোনো ফাইল মেলানো গেল না।',
  in_use_by: '{doc}-এর জন্য ব্যবহৃত',
  same_as: '{name}-এর সাথে হুবহু এক',

  st_missing: 'অনুপস্থিত',
  st_expiry_needed: 'মেয়াদের তারিখ দিন',
  st_expired: 'মেয়াদোত্তীর্ণ',
  st_not_provided: 'দেওয়া হয়নি',
  st_ok: 'ঠিক আছে',
  why_missing: 'এই কাগজের জন্য একটি ফাইল দরকার।',
  why_expiry_needed: 'কাগজে লেখা মেয়াদ শেষের তারিখটি দিন।',
  why_expired: '{date} তারিখে মেয়াদ শেষ হয়েছে। {deadline} পর্যন্ত বৈধ থাকতে হবে।',
  why_not_provided: 'ঐচ্ছিক। প্যাকেজে রাখা হবে না।',
  why_ok_expiry: '{date} পর্যন্ত বৈধ।',
  why_ok: 'প্রস্তুত।',

  your_files: 'আপনার ফাইল',
  files_hint: 'শুধু পিডিএফ · সর্বোচ্চ ৩০টি ফাইল · মোট ৫০ MB',
  add_pdfs: 'পিডিএফ ফাইল যোগ করুন',
  drop_pdfs: 'অথবা এখানে ছেড়ে দিন',
  usage: '৩০টির মধ্যে {count}টি ফাইল · ৫০ MB-এর মধ্যে {size}',
  reading: 'পড়া হচ্ছে…',
  remove_file: 'ফাইল সরান',
  duplicate: 'ডুপ্লিকেট',
  matched_to: 'মেলানো: {doc}',
  not_matched: 'মেলানো হয়নি',
  match_to: 'কোন কাগজ…',
  file_encrypted: 'পাসওয়ার্ড দেওয়া। পাসওয়ার্ড সরিয়ে আবার যোগ করুন।',
  file_damaged: 'পিডিএফটি নষ্ট বা পড়া যাচ্ছে না।',
  empty_files: 'এখনো কোনো ফাইল নেই। এই টেন্ডারের পিডিএফ কাগজপত্র যোগ করুন।',
  dismiss: 'বন্ধ করুন',
  n_not_pdf: '“{name}” যোগ হয়নি: এটি পিডিএফ ফাইল নয়।',
  n_too_many: '“{name}” যোগ হয়নি: সর্বোচ্চ ৩০টি ফাইল দেওয়া যায়।',
  n_too_big: '“{name}” যোগ হয়নি: মোট আকার ৫০ MB ছাড়িয়ে যাবে।',
  n_encrypted: '“{name}” পাসওয়ার্ড দেওয়া, তাই ব্যবহার করা যাবে না।',
  n_damaged: '“{name}” নষ্ট, তাই পড়া যাচ্ছে না।',

  ready_count: '{total}টির মধ্যে {ok}টি বাধ্যতামূলক কাগজ প্রস্তুত',
  all_ready: 'সব প্রস্তুত। এখন প্যাকেজ তৈরি করতে পারেন।',
  blocked_title: 'প্যাকেজ তৈরির আগে এগুলো ঠিক করুন:',
  more_blockers: 'আরও {n}টি',
  generate: 'প্যাকেজ তৈরি করুন',
  generating: 'তৈরি হচ্ছে…',
  with_index: 'সূচিপত্র পাতা যোগ করুন',
  index_short: 'সূচিপত্র',
  export_csv: 'চেকলিস্ট এক্সপোর্ট (CSV)',
  done: 'প্যাকেজ ডাউনলোড হয়েছে · {pages} পৃষ্ঠা',
  download_again: 'আবার ডাউনলোড',
  gen_failed: 'প্যাকেজ তৈরি করা যায়নি। কোনো ফাইল নষ্ট হতে পারে। সেটি সরিয়ে আবার চেষ্টা করুন।',
}

const dict: Record<Lang, Record<Key, string>> = { en, bn }

export type Vars = Record<string, string | number>

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  let s = dict[lang][key] ?? en[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(formatNumber(lang, v))
  return s
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

// Numbers inside messages use Bangla digits in Bangla mode.
export function formatNumber(lang: Lang, v: string | number): string {
  const s = String(v)
  return lang === 'bn' && typeof v === 'number' ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s
}

export function toBnDigits(s: string): string {
  return s.replace(/\d/g, (d) => BN_DIGITS[Number(d)])
}
