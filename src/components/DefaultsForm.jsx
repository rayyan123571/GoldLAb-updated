import React, { useEffect, useRef, useState } from 'react'
import { useApp, WA_REMINDER_DEFAULT } from '../state/store.jsx'
import { buildSlipHeader, buildSlipTerms, SHOP_FIELDS, SLIP_DESIGN_W } from '../logic/slipHeader.js'
import { fillReminder } from './UdharForm.jsx' // the report's own message builder — preview = the real thing
import { THEME_FIELDS, THEME_PRESETS, applyTheme, presetSwatches, activePresetId } from '../logic/theme.js'
// The ٹوٹل pin gate, reused (scope="dev") to guard the پرچی ہیڈر section.
import PinGate from './PinGate.jsx'

const INPUT =
  'w-full bg-white border border-slate-300 rounded-lg text-[14px] leading-relaxed ' +
  'px-3 py-2 text-start tabular-nums cursor-text shadow-sm transition-all ' +
  'hover:border-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:shadow'

// Hard character caps for the printed header. The slip is only 576 dots wide, so
// a long line does not wrap — it OVERFLOWS the header box and gets clipped on
// paper. These caps are sized to what fits each line at its font size, and the
// real Chaudhary values sit comfortably inside them (the longest, the tagline, is
// ~63 of its 70). The <input maxLength> makes overflow impossible to type; the
// live preview below shows the true printed width either way.
const SHOP_MAX = {
  shop_name: 26,
  shop_tagline: 70,
  shop_owner: 30,
  shop_owner2: 30,
  shop_phone1: 15,
  shop_phone2: 15,
  shop_phone3: 15,
  shop_address: 46
}

const SHOP_LABEL = {
  shop_name: 'دکان کا نام',
  shop_tagline: 'تعارف',
  shop_owner: 'مالک کا نام',
  shop_owner2: 'مالک کا نام 2',
  shop_phone1: 'فون 1',
  shop_phone2: 'فون 2',
  shop_phone3: 'فون 3',
  shop_address: 'پتہ'
}

const IS_PHONE = (f) => f === 'shop_phone1' || f === 'shop_phone2' || f === 'shop_phone3'

// The settings categories, in the order the shopkeeper needs them: the rate is
// touched daily, the backup folder once. Text only — this project has no icon set
// and one is not worth adding for six labels.
//
// This list is PRESENTATION ONLY. Every field still lives in the one `form` object
// at the component root and still saves through the same commit() → persist() →
// saveRates() path, so switching category cannot lose a half-typed value: nothing
// unmounts a field's state, only its markup.
// ── Icons ─────────────────────────────────────────────────────────────────────
// Hand-drawn inline SVG, NOT an icon library and NOT emoji. Emoji were tried first
// and are the wrong tool here: Windows renders them in its own font, so they came
// out small, washed-out and inconsistent with the rest of the UI. These take their
// colour from the tile they sit in (`currentColor`), so they are crisp and properly
// coloured on every machine, and they add nothing to the bundle.
const Icon = ({ d, children, ...rest }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
)
const ICONS = {
  rates: () => (<Icon><circle cx="12" cy="12" r="8" /><path d="M12 7.5v9M14.5 9.8c0-1-1.1-1.6-2.5-1.6s-2.5.6-2.5 1.6 1 1.4 2.5 1.7 2.6.8 2.6 1.9-1.2 1.7-2.6 1.7-2.6-.6-2.6-1.7" /></Icon>),
  print: () => (<Icon><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M7 14h10v6H7z" /><circle cx="17.5" cy="11.5" r=".9" fill="currentColor" stroke="none" /></Icon>),
  parchi: () => (<Icon><path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><path d="M9 8h6M9 12h6" /></Icon>),
  whatsapp: () => (<Icon><path d="M20.5 11.7a8.4 8.4 0 0 1-12.3 7.5L4 20.5l1.4-4.1a8.4 8.4 0 1 1 15.1-4.7z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" /></Icon>),
  reports: () => (<Icon><path d="M4 20h16" /><rect x="6" y="11" width="3.2" height="6" rx="1" /><rect x="11" y="7" width="3.2" height="10" rx="1" /><rect x="16" y="13" width="3.2" height="4" rx="1" /></Icon>),
  // Artist's palette — the تھیم / رنگ section. Without this entry ICONS['theme']
  // is undefined and <Glyph /> throws React error #130, crashing the dialog.
  theme: () => (<Icon><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2-1 2-1.8 0-.6-.4-1-.4-1.6 0-.7.6-1.1 1.3-1.1H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.7 16.7 3.5 12 3.5z" /><circle cx="8" cy="10.5" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="15.5" cy="10.5" r=".9" fill="currentColor" stroke="none" /></Icon>),
  backup: () => (<Icon><ellipse cx="12" cy="6.5" rx="7" ry="2.8" /><path d="M5 6.5v11c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-11" /><path d="M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8" /></Icon>),
  shop: () => (<Icon><path d="M4 9.5 5.5 5h13L20 9.5" /><path d="M4 9.5h16v10H4z" /><path d="M9.5 19.5v-5h5v5" /></Icon>),
  terms: () => (<Icon><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></Icon>),
  test: () => (<Icon><path d="M9.5 3.5v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-4.5-8.5v-6" /><path d="M8.5 3.5h7M8 14h8" /></Icon>),
  gear: () => (<Icon width="17" height="17"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" /></Icon>)
}

// Named aliases so the markup reads as <ShopIcon /> rather than ICONS.shop().
const RatesIcon = ICONS.rates
const PrintIcon = ICONS.print
const ReportsIcon = ICONS.reports
const BackupIcon = ICONS.backup
const ShopIcon = ICONS.shop
const TermsIcon = ICONS.terms
const WhatsappIcon = ICONS.whatsapp
const TestIcon = ICONS.test
const GearIcon = ICONS.gear

// Each category gets its own colour so the rail reads at a glance. `tile` is the
// ACTIVE (filled) look, `soft` the resting one — both hand-picked to stay legible
// on the tinted rail rather than generated, so nothing washes out.
const SECTIONS = [
  { id: 'rates', label: 'ریٹ اور چارجز', hint: 'روزانہ کا ریٹ اور مزدوری', tile: 'from-amber-400 to-amber-500 text-white shadow-amber-500/30', soft: 'bg-amber-50 text-amber-600 border-amber-200', text: 'text-amber-700', ring: 'border-r-amber-500' },
  { id: 'print', label: 'پرنٹ اور پرنٹر', hint: 'سلپ، پرنٹ سائز، ٹیسٹ', tile: 'from-sky-500 to-sky-600 text-white shadow-sky-500/30', soft: 'bg-sky-50 text-sky-600 border-sky-200', text: 'text-sky-700', ring: 'border-r-sky-500' },
  { id: 'parchi', label: 'پرچی', hint: 'ہیڈر اور شرائط', tile: 'from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30', soft: 'bg-indigo-50 text-indigo-600 border-indigo-200', text: 'text-indigo-700', ring: 'border-r-indigo-500' },
  { id: 'whatsapp', label: 'واٹس ایپ', hint: 'یاد دہانی کا پیغام', tile: 'from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30', soft: 'bg-emerald-50 text-emerald-600 border-emerald-200', text: 'text-emerald-700', ring: 'border-r-emerald-500' },
  { id: 'reports', label: 'رپورٹس', hint: 'خودکار رپورٹ فولڈر', tile: 'from-violet-500 to-violet-600 text-white shadow-violet-500/30', soft: 'bg-violet-50 text-violet-600 border-violet-200', text: 'text-violet-700', ring: 'border-r-violet-500' },
  { id: 'theme', label: 'تھیم / رنگ', hint: 'مین اسکرین کے سرمئی رنگ', tile: 'from-slate-500 to-slate-600 text-white shadow-slate-500/30', soft: 'bg-slate-50 text-slate-600 border-slate-200', text: 'text-slate-700', ring: 'border-r-slate-500' },
  { id: 'backup', label: 'بیک اپ', hint: 'ڈیٹا کی نقل', tile: 'from-rose-500 to-rose-600 text-white shadow-rose-500/30', soft: 'bg-rose-50 text-rose-600 border-rose-200', text: 'text-rose-700', ring: 'border-r-rose-500' }
]
const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]))

// A card heading: the section's own coloured icon chip + the existing Urdu title.
function CardHead({ icon, tone, children }) {
  return (
    <div className="urdu font-bold text-[14px] text-slate-800 flex items-center gap-2.5 pb-2.5 mb-0.5 border-b border-slate-100">
      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${tone}`}>{icon}</span>
      {children}
    </div>
  )
}

// ── Shared button / card skins ────────────────────────────────────────────────
// One place for the dialog's look, so every button in it reads as part of the same
// set instead of each block inventing its own grey box. Purely visual: no button's
// handler, label or disabled rule changes.
// Hover has to be UNMISTAKEABLE — the shopkeeper works on a cheap screen and often
// with a touchpad, so every button lifts, deepens and gains a ring on hover rather
// than shifting one shade of grey. focus-visible gets the same ring for keyboard use.
const BTN_BASE = 'urdu text-[12px] font-bold rounded-lg px-3.5 py-2 border shadow-sm transition-all duration-150 ' +
  'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm'
const BTN_PRIMARY = `${BTN_BASE} text-white bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700/40 hover:from-emerald-400 hover:to-emerald-600 focus-visible:ring-emerald-400`
const BTN_DARK = `${BTN_BASE} text-white bg-gradient-to-b from-slate-600 to-slate-700 border-slate-800/40 hover:from-slate-500 hover:to-slate-700 focus-visible:ring-slate-400`
const BTN_SOFT = `${BTN_BASE} text-slate-700 bg-gradient-to-b from-white to-slate-100 border-slate-300 hover:from-white hover:to-blue-50 hover:border-blue-400 hover:text-blue-700 focus-visible:ring-blue-400`
const BTN_QUIET = `${BTN_BASE} text-rose-700 bg-gradient-to-b from-rose-50 to-rose-100 border-rose-200 hover:from-rose-100 hover:to-rose-200 hover:border-rose-400 focus-visible:ring-rose-400`
// White panel each settings group sits on, so a section reads as tidy blocks
// rather than one undivided wall of fields.
const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-4'
const CARD_TITLE = 'urdu font-bold text-[14px] text-slate-800 flex items-center gap-2 pb-2.5 mb-0.5 border-b border-slate-100'

// "22 جولائی، 6:30 شام" — the last manual-backup time, in the shopkeeper's own
// wording. Returns '' for a missing/unparseable stamp so the caller shows the
// "never backed up" line instead of a broken date.
const UR_MONTHS = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر']
function urduDateTime(iso) {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const h24 = d.getHours()
    const h = h24 % 12 || 12
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${d.getDate()} ${UR_MONTHS[d.getMonth()]}، ${h}:${m} ${h24 < 12 ? 'صبح' : 'شام'}`
  } catch {
    return ''
  }
}

// Row helper at module scope so inputs never remount on keystroke (keeps focus).
function Row({ label, children, alignTop }) {
  return (
    <div className={`grid grid-cols-[140px_1fr] gap-3 ${alignTop ? 'items-start' : 'items-center'}`}>
      <label className={`urdu font-bold text-[13px] text-gray-700 text-right ${alignTop ? 'pt-2' : ''}`}>{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ڈیفالٹ سیٹنگز — rate / charges / parchi / slip-print settings, saved to the
// settings table via the store's saveRates (which also refreshes the live UI).
export default function DefaultsForm({ open, onClose }) {
  const { rates, saveRates, hasApi, exportReportsToDrive } = useApp()
  const [form, setForm] = useState({
    rate_tezabi_tola: '', fc_per_gram: '', parchi_charges: '', slip_count: '1', raw_print_mode: 'auto', print_scale: 1.15,
    shop_name: '', shop_tagline: '', shop_owner: '', shop_phone1: '', shop_phone2: '', shop_phone3: '', shop_address: '',
    slip_terms: '',
    // واٹس ایپ یاد دہانی template used by the "لینا ہے" balance reports.
    whatsapp_reminder_text: '',
    // Synced (Google Drive Desktop) reports folder — blank = auto-export OFF.
    reports_dir: ''
  })
  // Which category is on screen. Presentation only — it hides markup, never state,
  // so a half-typed field is exactly as the shopkeeper left it when he comes back.
  // Opens on the first section (ریٹ اور چارجز) every time the dialog opens.
  const [section, setSection] = useState(SECTIONS[0].id)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [testBusy, setTestBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState('') // reports-folder test status
  // Manual بیک اپ folder — lives in the main process's own config (NOT the
  // settings table, NOT backup-config.json), so it is read/written separately
  // from `form` and never goes through commit()/saveRates().
  const [backupInfo, setBackupInfo] = useState({ folder: '', lastBackupAt: null })
  // ── پرچی ہیڈر lock ──────────────────────────────────────────────────────────
  // The shop identity printed on every slip. A shopkeeper who can edit it can
  // print slips in someone ELSE'S name, so it takes the DEVELOPER pin (a fixed
  // digest in electron/pinGate.cjs) — NOT the shopkeeper's own ٹوٹل pin, which he
  // sets and may change whenever he likes.
  //
  // Plain React state, never written to the DB, the settings or localStorage:
  // closing the dialog re-locks, and so does restarting the app.
  const [headerUnlocked, setHeaderUnlocked] = useState(false)
  const [headerGate, setHeaderGate] = useState(false) // pin dialog open?
  const savedTimer = useRef(null)
  const saveTimer = useRef(null)
  const previewRef = useRef(null)
  const termsPreviewRef = useRef(null)
  const waRef = useRef(null) // یاد دہانی textarea — chips insert at its caret

  // Load current values from the DB (fall back to the store's rates) on open.
  useEffect(() => {
    if (!open) return
    setSaved(false)
    setSection(SECTIONS[0].id) // every open starts on ریٹ اور چارجز
    // AUTO-LOCK. Every open starts locked, whatever happened last time. This —
    // not the تالا لگائیں button — is what the protection rests on: a remote
    // session can drop and a person can simply forget to press the button.
    setHeaderUnlocked(false)
    setHeaderGate(false)
    let cancelled = false
    const seed = (r) => {
      const src = r || rates || {}
      if (cancelled) return
      const shop = {}
      for (const f of SHOP_FIELDS) shop[f] = src[f] != null ? String(src[f]) : ''
      setForm({
        rate_tezabi_tola: src.rate_tezabi_tola ?? '',
        fc_per_gram: src.fc_per_gram ?? '',
        parchi_charges: src.parchi_charges ?? '',
        slip_count: src.slip_count != null ? String(src.slip_count) : '1',
        raw_print_mode: src.raw_print_mode === 'force' ? 'force' : 'auto',
        print_scale: src.print_scale != null ? Number(src.print_scale) : 1.15,
        ...shop,
        slip_terms: src.slip_terms != null ? String(src.slip_terms) : '',
        // A DB older than the column reads null — show the default so the box is
        // never blank and the shopkeeper sees exactly what will be sent.
        whatsapp_reminder_text: src.whatsapp_reminder_text != null && String(src.whatsapp_reminder_text) !== ''
          ? String(src.whatsapp_reminder_text)
          : WA_REMINDER_DEFAULT,
        reports_dir: src.reports_dir != null ? String(src.reports_dir) : '',
        // Theme colours: '' when unset (means "use the hex default"), else '#rrggbb'.
        ...Object.fromEntries(THEME_FIELDS.map((f) => [f.key, src[f.key] != null ? String(src[f.key]) : '']))
      })
    }
    if (hasApi) window.api.getRates().then(seed)
    else seed(rates)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Current manual-backup folder + last-backup time, refreshed each time the
  // dialog opens. Advisory only: a failure here just leaves the section blank.
  useEffect(() => {
    if (!open || !hasApi || !window.api.manualBackupStatus) return
    let cancelled = false
    window.api.manualBackupStatus()
      .then((s) => {
        if (cancelled || !s || !s.ok) return
        setBackupInfo({ folder: s.folder || '', lastBackupAt: s.lastBackupAt || null })
      })
      .catch(() => { /* leave the section empty rather than break the dialog */ })
    return () => { cancelled = true }
  }, [open, hasApi])

  // ── Live print preview ──────────────────────────────────────────────────────
  // Re-drawn on EVERY keystroke from the CURRENT (unsaved) form values, using the
  // very same buildSlipHeader() the printer path calls — so what the shopkeeper
  // sees here is, by construction, what comes out of the printer. Clearing a
  // field drops its line here exactly as it drops it on paper.
  useEffect(() => {
    const box = previewRef.current
    if (!open || !box) return
    box.innerHTML = ''
    try { box.appendChild(buildSlipHeader(form)) } catch { /* preview only — never break the form */ }
    // `section` is a dependency because this preview writes into a DOM node that
    // only exists while its own section is on screen. Leaving the section unmounts
    // that node, so the effect must run again when the section comes BACK — with
    // [open, form] alone it would not (form is unchanged), and the box would stay
    // blank until the next keystroke.
  }, [open, form, section])

  // ── Live terms preview ────────────────────────────────────────────────────────
  // Same construction as the header preview, drawn with the SAME buildSlipTerms()
  // the printer path uses. A blank field returns null → the box vanishes here just
  // as it vanishes from the printed لیب رسید.
  useEffect(() => {
    const box = termsPreviewRef.current
    if (!open || !box) return
    box.innerHTML = ''
    try {
      const node = buildSlipTerms(form.slip_terms)
      if (node) box.appendChild(node)
    } catch { /* preview only — never break the form */ }
    // `section` for the same reason as the header preview above.
  }, [open, form, section])

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  if (!open) return null

  // Persist the given form snapshot to the DB + store, and flash the saved tick.
  const persist = async (next) => {
    // Shop fields go through as TEXT, trimmed — including '' when the shopkeeper
    // clears one, which is what removes that line from the printed header.
    const shop = {}
    for (const f of SHOP_FIELDS) shop[f] = String(next[f] ?? '').trim()
    await saveRates({
      rate_tezabi_tola: Number(next.rate_tezabi_tola) || 0,
      fc_per_gram: Number(next.fc_per_gram) || 0,
      parchi_charges: Number(next.parchi_charges) || 0,
      slip_count: Math.max(1, parseInt(next.slip_count, 10) || 1),
      raw_print_mode: next.raw_print_mode === 'force' ? 'force' : 'auto',
      print_scale: Number(next.print_scale) || 1.15,
      ...shop,
      slip_terms: String(next.slip_terms ?? '').trim(),
      whatsapp_reminder_text: String(next.whatsapp_reminder_text ?? '').trim(),
      // Synced reports folder ('' → auto-export off). Trimmed so a stray space
      // never turns the feature on with an unusable path.
      reports_dir: String(next.reports_dir ?? '').trim(),
      // Theme colours: '#rrggbb' saves the colour, '' resets that tone to its hex
      // default (db.cjs stores it; the renderer treats '' like unset).
      ...Object.fromEntries(THEME_FIELDS.map((f) => [f.key, String(next[f.key] ?? '')]))
    })
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 1200)
  }

  // Auto-save: update the field, then debounce a write ~500ms after typing stops.
  const commit = (next) => {
    setForm(next)
    // Live theme preview: paint the #root variables from the CURRENT (unsaved)
    // form on every change, so the screen updates instantly (no restart). If the
    // dialog is closed without saving, App's effect re-applies the saved theme.
    applyTheme(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(next), 500)
  }

  // Theme helpers: a picker changed / a preset chosen / reset all to defaults.
  const setThemeColor = (key, value) => commit({ ...form, [key]: value })
  const applyPreset = (preset) => commit({ ...form, ...preset.values })
  const resetTheme = () => commit({ ...form, ...Object.fromEntries(THEME_FIELDS.map((f) => [f.key, ''])) })

  // Accept digits and a single decimal point only.
  const numField = (field) => (e) => {
    const v = e.target.value.replace(/[^\d.]/g, '')
    commit({ ...form, [field]: v })
  }
  // Slip print: integer only.
  const onSlip = (e) => {
    const v = e.target.value.replace(/[^\d]/g, '')
    commit({ ...form, slip_count: v })
  }

  // Shop header fields. maxLength on the input is the real guard (typing past the
  // cap is simply refused); the slice here is belt-and-braces for a PASTE, which
  // some browsers let through. Phones additionally accept only digits, spaces and
  // dashes, so a stray letter can never reach the printed header.
  const shopField = (field) => (e) => {
    let v = e.target.value
    if (IS_PHONE(field)) v = v.replace(/[^\d\s-]/g, '')
    commit({ ...form, [field]: v.slice(0, SHOP_MAX[field]) })
  }

  // لیب رسید terms paragraph. Same commit()/debounce as the header fields; the
  // slice mirrors the textarea's maxLength (belt-and-braces for a paste).
  const termsField = (e) => commit({ ...form, slip_terms: e.target.value.slice(0, 400) })

  // ── واٹس ایپ یاد دہانی template ────────────────────────────────────────────────
  // Same commit()/debounce path as every other field here.
  const waField = (e) => commit({ ...form, whatsapp_reminder_text: e.target.value.slice(0, 400) })
  // Insert a placeholder AT THE CURSOR (or over the selection), then put the caret
  // just after it — typing a template shouldn't mean retyping the braces by hand.
  const insertPlaceholder = (token) => {
    const el = waRef.current
    const cur = String(form.whatsapp_reminder_text ?? '')
    const start = el ? el.selectionStart : cur.length
    const end = el ? el.selectionEnd : cur.length
    const next = (cur.slice(0, start) + token + cur.slice(end)).slice(0, 400)
    commit({ ...form, whatsapp_reminder_text: next })
    // The textarea is controlled, so the caret has to be restored after React
    // re-renders with the new value.
    requestAnimationFrame(() => {
      if (!waRef.current) return
      const pos = Math.min(start + token.length, 400)
      waRef.current.focus()
      waRef.current.setSelectionRange(pos, pos)
    })
  }
  // Live preview — the SAME fillReminder() the report sends with, so this is not an
  // approximation of the message: it IS the message. Shown for both reports so it is
  // obvious one template serves rupees and تولہ alike.
  const waPreview = (amount) => fillReminder(form.whatsapp_reminder_text, amount)

  // Direct-thermal test pages (کیلیبریشن / ورسٹ کیس) — print via the raw
  // ESC/POS raster path to the DEFAULT printer so the paper itself proves the
  // geometry: full border, mm ticks, 10mm reference square, edge texts.
  const runTest = async (kind, label) => {
    if (!hasApi || !window.api.rasterTestPrint || testBusy) return
    setTestBusy(true)
    setTestMsg(`${label} پرنٹ ہو رہا ہے…`)
    try {
      const res = await window.api.rasterTestPrint(kind)
      setTestMsg(res && res.ok
        ? `${label} پرنٹ ہو گیا ✓${res.printer ? ` (${res.printer})` : ''}`
        : `ناکام: ${res && res.reason ? res.reason : 'نامعلوم مسئلہ'}`)
    } catch (e) {
      setTestMsg(`ناکام: ${e && e.message ? e.message : e}`)
    } finally {
      setTestBusy(false)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setTestMsg(''), 6000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 pt-[40px]"
      onClick={onClose}
    >
      {/* FIXED size — height as well as width — so switching category never resizes
          the dialog or shifts the category list under the cursor.
          Measured in CANVAS pixels, not vh/vw: the whole app renders inside
          FitScreen's fixed 1460×820 design canvas, which is then scaled to whatever
          monitor the shop has. A vh value would be read against the REAL viewport
          and land at a different canvas size on every screen — on a 1080p monitor
          78vh would come out ~811 canvas px and, with the top gap, hang off the
          bottom of the 820-px canvas. 40 + 620 = 660 of 820 always fits, and 720 of
          1460 leaves the overlay visible either side on every machine.
          The card itself never scrolls; only the content pane inside it does. */}
      <div
        dir="rtl"
        className="relative bg-gray-50 border border-gray-300 rounded-lg shadow-2xl w-[720px] h-[620px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar — the dark band gives the dialog a header the eye lands on
            first, and makes the white content pane below read as "the work area". */}
        <div className="flex items-center justify-between bg-gradient-to-l from-slate-800 via-slate-800 to-slate-700 border-b border-slate-900/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-400/40 shadow text-white flex items-center justify-center"><GearIcon /></span>
            <div className="flex flex-col leading-tight">
              <h2 className="urdu font-bold text-[16px] text-white">ڈیفالٹ سیٹنگز</h2>
              <span className="urdu text-[11px] text-slate-300">تبدیلی خود بخود محفوظ ہوتی ہے</span>
            </div>
            {/* subtle auto-save indicator — no button, just feedback */}
            <span className={`urdu flex items-center gap-1 text-[11.5px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2.5 py-1 transition-opacity duration-300 ${saved ? 'opacity-100' : 'opacity-0'}`}>
              محفوظ ہو گیا ✓
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="بند کریں"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Two panes. RTL, so the category list sits on the RIGHT (first child) and
            the settings on the left. The card height is FIXED and only the content
            pane scrolls, so switching category never resizes or jumps the dialog.
            Sized to fit a 1366×768 shop laptop with room to spare. */}
        <div className="flex-1 min-h-0 flex">
          {/* Category list — most-used first (rates every day, backup rarely). The
              active row is a white card lifted off the tinted rail with a blue edge:
              the same "selected tab" language the report screens already use. */}
          <nav className="w-[190px] shrink-0 bg-gradient-to-b from-slate-800 to-slate-900 overflow-y-auto py-3 px-2.5 flex flex-col gap-1.5">
            {SECTIONS.map((s) => {
              const active = section === s.id
              const Glyph = ICONS[s.id]
              return (
                <button
                  key={s.id}
                  type="button"
                  data-section={s.id}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setSection(s.id)}
                  title={s.hint}
                  className={`group w-full text-right rounded-xl px-2.5 py-2 flex items-center gap-2.5 border transition-all duration-150 focus:outline-none ${
                    active
                      ? `bg-white shadow-lg border-white/60 border-r-[3px] ${s.ring}`
                      : 'border-transparent text-slate-300 hover:bg-white/10 hover:border-white/15 hover:translate-x-[-2px]'
                  }`}
                >
                  {/* Colour tile: filled when active, tinted-but-still-coloured on
                      hover, so the eye finds the row it is on immediately. */}
                  <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                    active
                      ? `bg-gradient-to-b ${s.tile} border-transparent shadow-md`
                      : 'bg-white/10 border-white/15 text-slate-300 group-hover:bg-white group-hover:border-transparent group-hover:text-slate-800 group-hover:shadow'
                  }`}>
                    <Glyph />
                  </span>
                  <span className="flex flex-col min-w-0 leading-tight">
                    <span className={`urdu text-[12.5px] truncate transition-colors ${active ? `font-bold ${s.text}` : 'font-medium text-slate-200 group-hover:text-white'}`}>
                      {s.label}
                    </span>
                    <span className={`urdu text-[9.5px] truncate transition-colors ${active ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {s.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Content pane — the ONLY scrolling area. */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
          {section === 'rates' && (
            <div className={CARD}>
              <CardHead icon={<RatesIcon />} tone="bg-amber-50 text-amber-600 border-amber-200">ریٹ اور چارجز</CardHead>
          <Row label="ریٹ">
            <input dir="ltr" className={INPUT} value={form.rate_tezabi_tola} onChange={numField('rate_tezabi_tola')} inputMode="decimal" placeholder="0" />
          </Row>

          <Row label="چارجز فی گرام">
            <input dir="ltr" className={INPUT} value={form.fc_per_gram} onChange={numField('fc_per_gram')} inputMode="decimal" placeholder="0" />
          </Row>

          <Row label="چارج پرچی">
            <input dir="ltr" className={INPUT} value={form.parchi_charges} onChange={numField('parchi_charges')} inputMode="decimal" placeholder="0" />
          </Row>
            </div>
          )}

          {section === 'print' && (
            <div className="flex flex-col gap-4">
              <div className={CARD}>
              <CardHead icon={<PrintIcon />} tone="bg-sky-50 text-sky-600 border-sky-200">پرنٹ کی ترتیبات</CardHead>
          <Row label="سلپ پرنٹ">
            <input
              dir="ltr"
              className={`${INPUT} w-28`}
              value={form.slip_count}
              onChange={onSlip}
              inputMode="numeric"
              min={1}
              placeholder="1"
            />
          </Row>

          {/* تھرمل پرنٹر پر براہِ راست (raw ESC/POS) — when ON, every default
              printer is treated as thermal and uses the raw path (bypasses the
              name check). Leave OFF to auto-detect by printer name. */}
          <Row label="تھرمل پرنٹر پر براہِ راست پرنٹ">
            <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-blue-50 hover:border-blue-300">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-blue-600"
                checked={form.raw_print_mode === 'force'}
                onChange={(e) => commit({ ...form, raw_print_mode: e.target.checked ? 'force' : 'auto' })}
              />
              <span className="urdu text-[12px] text-gray-600">
                {form.raw_print_mode === 'force' ? 'ہر پرنٹر پر براہِ راست (فورس)' : 'خودکار (پرنٹر کے نام سے پہچان)'}
              </span>
            </label>
          </Row>

          {/* پرنٹ سائز — thermal render magnification 1.00–1.35 (bigger/longer slip). */}
          <Row label="پرنٹ سائز">
            <select
              className={`${INPUT} w-28`}
              value={Number(form.print_scale).toFixed(2)}
              onChange={(e) => commit({ ...form, print_scale: Number(e.target.value) })}
            >
              {['1.00', '1.05', '1.10', '1.15', '1.20', '1.25', '1.30', '1.35'].map((v) => (
                <option key={v} value={v}>{v}×</option>
              ))}
            </select>
          </Row>
              </div>

          {/* Direct-thermal printer test pages: calibration sheet (border, mm
              ticks, 10mm square, edge texts) + worst-case receipt. Paper-level
              proof that width/sharpness are correct on THIS shop's printer. */}
          <div className={CARD}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="urdu font-bold text-[13px] text-slate-800 flex items-center gap-2"><span className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center"><TestIcon /></span>پرنٹر ٹیسٹ (ڈائریکٹ تھرمل)</div>
                {testMsg
                  ? <div className="urdu text-[12px] text-emerald-600 break-all">{testMsg}</div>
                  : <div className="urdu text-[11px] text-gray-500">چوڑائی اور صفائی جانچنے کے لیے ٹیسٹ پرچی نکالیں</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={testBusy}
                  onClick={() => runTest('calibration', 'کیلیبریشن')}
                  className={BTN_DARK}
                >
                  کیلیبریشن
                </button>
                <button
                  type="button"
                  disabled={testBusy}
                  onClick={() => runTest('worstcase', 'ورسٹ کیس')}
                  className={BTN_DARK}
                >
                  ورسٹ کیس
                </button>
              </div>
            </div>
          </div>
            </div>
          )}

          {section === 'parchi' && (
            <div className="flex flex-col gap-4">
          {/* ── پرچی ہیڈر — the shop identity printed at the top of every slip.
              Each field is capped (SHOP_MAX) so a long line can never overflow
              the 576-dot header box and get clipped on paper. Empty a field and
              its line vanishes — from the preview and from the printout alike. */}
          <div className={CARD}>
            <CardHead icon={<ShopIcon />} tone="bg-indigo-50 text-indigo-600 border-indigo-200">پرچی ہیڈر (دکان کی معلومات)</CardHead>

            {/* PIN LOCK. Locked is the default and the resting state — see
                headerUnlocked. Viewing stays open (the fields and the preview are
                still readable); only EDITING is gated, because the risk is a slip
                printed under someone else's shop name. */}
            <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
              headerUnlocked ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
            }`}>
              <span className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"
                  stroke={headerUnlocked ? '#047857' : '#b45309'}>
                  <rect x="4" y="10" width="16" height="10" rx="2.5" />
                  {/* Locked = a closed shackle; unlocked = the same shackle swung open. */}
                  {headerUnlocked ? <path d="M8 10V7a4 4 0 0 1 7.5-2" /> : <path d="M8 10V7a4 4 0 0 1 8 0v3" />}
                </svg>
                <span className={`urdu text-[12px] font-bold ${headerUnlocked ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {headerUnlocked ? 'کھلا ہے — ڈبی بند کرتے ہی دوبارہ تالا لگ جائے گا' : 'یہ حصہ پن سے محفوظ ہے'}
                </span>
              </span>
              {headerUnlocked ? (
                <button type="button" onClick={() => setHeaderUnlocked(false)}
                  className="urdu shrink-0 text-[12px] font-bold text-gray-700 bg-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-300 transition-colors">
                  تالا لگائیں
                </button>
              ) : (
                <button type="button" onClick={() => setHeaderGate(true)}
                  className="urdu shrink-0 text-[12px] font-bold text-white bg-slate-800 rounded-md px-3 py-1.5 hover:bg-slate-900 active:bg-black transition-colors">
                  کھولیں
                </button>
              )}
            </div>

            {SHOP_FIELDS.map((f) => (
              <Row key={f} label={SHOP_LABEL[f]}>
                <input
                  dir={IS_PHONE(f) ? 'ltr' : 'rtl'}
                  className={`${INPUT} ${IS_PHONE(f) ? '' : 'urdu'} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  value={form[f]}
                  onChange={shopField(f)}
                  disabled={!headerUnlocked}
                  maxLength={SHOP_MAX[f]}
                  inputMode={IS_PHONE(f) ? 'tel' : 'text'}
                  placeholder={IS_PHONE(f) ? '0300-0000000' : ''}
                />
              </Row>
            ))}

            {/* Live preview — the SAME buildSlipHeader() the printer uses, drawn
                from the current (unsaved) values on every keystroke, at the slip's
                real design width. White paper, black ink, so it reads as the slip. */}
            <div className="flex flex-col gap-2">
              <div className="urdu font-bold text-[13px] text-gray-700">پرنٹ پیش منظر</div>
              <div className="flex justify-center">
                {/* The paper's edge (border + padding) is the OUTER box. The inner
                    box the header renders into is EXACTLY SLIP_DESIGN_W — padding
                    here would narrow it, and the preview would then wrap a long
                    line one word earlier than the printer actually does. */}
                <div className="border border-gray-300 rounded-sm shadow-sm p-2 bg-white">
                  <div
                    ref={previewRef}
                    dir="rtl"
                    style={{ width: SLIP_DESIGN_W, background: '#fff', color: '#000' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── پرچی کی شرائط — the لیب رسید terms/fee paragraph printed in a
              bordered box on lab receipts only. A paragraph, so a <textarea>.
              Clearing it removes the box from the slip (buildSlipTerms → null). */}
          <div className={CARD}>
            <CardHead icon={<TermsIcon />} tone="bg-indigo-50 text-indigo-600 border-indigo-200">پرچی کی شرائط (لیب رسید)</CardHead>

            <textarea
              dir="rtl"
              className={`${INPUT} urdu resize-none leading-loose`}
              rows={4}
              maxLength={400}
              value={form.slip_terms}
              onChange={termsField}
            />
            <div className="urdu text-[11px] text-gray-500">خالی چھوڑنے پر یہ باکس پرچی سے ہٹ جائے گا۔</div>

            {/* Live preview — same buildSlipTerms() the printer uses, redrawn on
                every keystroke at the slip's real design width. Empty when blank,
                matching the box vanishing from paper. */}
            <div className="flex flex-col gap-2">
              <div className="urdu font-bold text-[13px] text-gray-700">پرنٹ پیش منظر</div>
              <div className="flex justify-center">
                <div className="border border-gray-300 rounded-sm shadow-sm p-2 bg-white">
                  <div
                    ref={termsPreviewRef}
                    dir="rtl"
                    style={{ width: SLIP_DESIGN_W, background: '#fff', color: '#000' }}
                  />
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

          {section === 'whatsapp' && (
            <div className="flex flex-col gap-4">
          {/* ── واٹس ایپ یاد دہانی کا پیغام — the text the "تیزابی لینا ہے" / "رقم لینی
              ہے" reports pre-fill into a WhatsApp chat. Nothing is ever sent from
              here or from the report: the button only OPENS the chat, and the
              shopkeeper presses Send. One template serves both reports — the app
              substitutes the amount already formatted the way that report shows it
              (rupees / تولہ ماشہ رتی), which the two preview lines below make plain. */}
          <div className={CARD}>
            <CardHead icon={<WhatsappIcon />} tone="bg-emerald-50 text-emerald-600 border-emerald-200">واٹس ایپ یاد دہانی کا پیغام</CardHead>
            <div className="urdu text-[11px] text-gray-500 leading-5">
              یہ پیغام "لینا ہے" والی رپورٹ کے واٹس ایپ بٹن سے کھلتا ہے۔ بھیجنے کا بٹن آپ خود دبائیں گے۔
            </div>

            <textarea
              ref={waRef}
              dir="rtl"
              className={`${INPUT} urdu resize-none leading-loose`}
              rows={4}
              maxLength={400}
              value={form.whatsapp_reminder_text}
              onChange={waField}
            />

            {/* Placeholder chip — click inserts at the caret. {رقم} is the only one:
                the message greets the customer as محترم and never names him. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="urdu text-[11px] text-gray-500">شامل کریں:</span>
              {[
                { token: '{رقم}', hint: 'باقی رقم / تیزابی' }
              ].map((p) => (
                <button
                  key={p.token}
                  type="button"
                  onClick={() => insertPlaceholder(p.token)}
                  title={`${p.token} — ${p.hint}`}
                  className="urdu inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-800 bg-gradient-to-b from-blue-50 to-blue-100 border border-blue-300 shadow-sm rounded-full px-3 py-1.5 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 active:translate-y-px transition-all"
                >
                  <span dir="ltr" className="tabular-nums">{p.token}</span>
                  <span className="text-[10px] font-normal text-blue-600">{p.hint}</span>
                </button>
              ))}
            </div>

            {/* Live preview — both reports, updating as the shopkeeper types. */}
            <div className="flex flex-col gap-2">
              <div className="urdu font-bold text-[13px] text-gray-700">پیش منظر</div>
              <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="urdu text-[10px] text-emerald-700 mb-1">رقم لینی ہے</div>
                  <div dir="rtl" className="urdu text-[12.5px] text-gray-800 leading-6 whitespace-pre-wrap break-words">
                    {waPreview('2,00,000 روپے') || '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="urdu text-[10px] text-amber-700 mb-1">تیزابی لینا ہے</div>
                  <div dir="rtl" className="urdu text-[12.5px] text-gray-800 leading-6 whitespace-pre-wrap break-words">
                    {waPreview('5 تولہ 6 ماشہ') || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => commit({ ...form, whatsapp_reminder_text: WA_REMINDER_DEFAULT })}
                className={BTN_SOFT}
              >
                اصل پیغام بحال کریں
              </button>
            </div>
          </div>
            </div>
          )}

          {section === 'reports' && (
            <div className="flex flex-col gap-4">
          {/* ── رپورٹس فولڈر (Google Drive) — the synced folder auto-export writes
              each report's PDF into. BLANK = feature OFF (nothing is written, nothing
              deleted). Picked once here; the export then runs on app-open and after
              every transaction. Never touches the database. */}
          <div className={CARD}>
            <CardHead icon={<ReportsIcon />} tone="bg-violet-50 text-violet-600 border-violet-200">رپورٹس فولڈر (گوگل ڈرائیو)</CardHead>
            <div className="urdu text-[11px] text-gray-500 leading-5">
              گوگل ڈرائیو ڈیسک ٹاپ کا وہ فولڈر منتخب کریں جہاں رپورٹس کی PDF خودکار محفوظ ہوں۔
              خالی چھوڑ دیں تو یہ سہولت بند رہے گی۔
            </div>
            <Row label="فولڈر کا راستہ">
              <div className="flex items-center gap-2 w-full">
                <input
                  dir="ltr"
                  className={`${INPUT} flex-1`}
                  value={form.reports_dir}
                  onChange={(e) => commit({ ...form, reports_dir: e.target.value })}
                  placeholder="G:\\My Drive\\GoldLab Reports"
                />
                <button
                  type="button"
                  className={`${BTN_SOFT} whitespace-nowrap`}
                  onClick={async () => {
                    if (!hasApi || !window.api.pickFolder) return
                    try {
                      const r = await window.api.pickFolder()
                      if (r && r.ok && r.path) commit({ ...form, reports_dir: r.path })
                    } catch { /* cancelled — leave the path as-is */ }
                  }}
                >
                  فولڈر منتخب کریں…
                </button>
              </div>
            </Row>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!form.reports_dir}
                className={BTN_PRIMARY}
                onClick={async () => {
                  setReportMsg('')
                  if (!exportReportsToDrive) return
                  try { await exportReportsToDrive(); setReportMsg('رپورٹس فولڈر میں بھیج دی گئیں ✓') }
                  catch { setReportMsg('رپورٹس بھیجنے میں مسئلہ ہوا') }
                  setTimeout(() => setReportMsg(''), 3000)
                }}
              >
                ابھی رپورٹس بھیجیں (ٹیسٹ)
              </button>
              {form.reports_dir && (
                <button
                  type="button"
                  className={BTN_QUIET}
                  onClick={() => commit({ ...form, reports_dir: '' })}
                >
                  ہٹا دیں
                </button>
              )}
              {reportMsg && <span className="urdu text-[12px] text-gray-600">{reportMsg}</span>}
            </div>
          </div>
            </div>
          )}

          {section === 'theme' && (
            <div className="flex flex-col gap-4">
              <div className="urdu text-[11px] text-gray-500 leading-relaxed">
                مین اسکرین کے سرمئی رنگ یہاں سے بدلیں۔ رنگ منتخب کرتے ہی اسکرین پر
                فوراً نظر آئے گا (ری اسٹارٹ کی ضرورت نہیں)۔ چھپنے والی پرچی پر اِن کا
                کوئی اثر نہیں پڑتا۔ کچھ نہ بدلیں تو سب کچھ جوں کا توں رہے گا۔
              </div>

              {/* ── Ready-made themes: one click sets all five tones ─────────── */}
              {(() => {
                const activeId = activePresetId(form)
                return (
                  <div className="flex flex-col gap-2">
                    <div className="urdu font-bold text-[13px] text-gray-700">تیار تھیم — ایک کلک میں</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {THEME_PRESETS.map((p) => {
                        const swatches = presetSwatches(p)
                        const active = activeId === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPreset(p)}
                            className={`flex flex-col gap-1.5 rounded-lg border p-2 text-right transition-all ${
                              active
                                ? 'border-slate-500 ring-2 ring-slate-400 bg-slate-50'
                                : 'border-gray-300 bg-white hover:border-slate-400 hover:shadow-sm'
                            }`}
                          >
                            <span className="flex h-7 w-full overflow-hidden rounded-md border border-gray-300">
                              {swatches.map((c, i) => (
                                <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                              ))}
                            </span>
                            <span className="flex items-center justify-between">
                              <span className="urdu text-[12px] font-bold text-gray-700">{p.label}</span>
                              {active && <span className="urdu text-[10px] font-bold text-slate-600">منتخب ✓</span>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="urdu font-bold text-[13px] text-gray-700 mt-1">اپنی مرضی کے رنگ (باریک ایڈجسٹمنٹ)</div>
              <div className="flex flex-col gap-3">
                {THEME_FIELDS.map((f) => {
                  const val = form[f.key] || ''
                  const shown = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val) ? val : f.fallback
                  const isDefault = !val
                  return (
                    <div key={f.key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={shown}
                        onChange={(e) => setThemeColor(f.key, e.target.value)}
                        className="w-10 h-8 p-0 border border-gray-300 rounded cursor-pointer bg-white"
                        title={f.label}
                      />
                      <span className="urdu text-[13px] text-gray-700 flex-1">{f.label}</span>
                      <span dir="ltr" className="text-[11px] font-mono text-gray-500 w-20 text-center">{shown}</span>
                      <button
                        type="button"
                        disabled={isDefault}
                        onClick={() => setThemeColor(f.key, '')}
                        className="urdu text-[11px] font-bold text-gray-600 bg-gray-100 rounded px-2 py-1 hover:bg-gray-200 disabled:opacity-40"
                      >
                        ڈیفالٹ
                      </button>
                    </div>
                  )
                })}
              </div>
              <div>
                <button
                  type="button"
                  onClick={resetTheme}
                  className="urdu text-[13px] font-bold text-gray-700 bg-gray-200 rounded-md px-4 py-2 hover:bg-gray-300"
                >
                  ڈیفالٹ رنگوں پر واپس
                </button>
              </div>
            </div>
          )}

          {section === 'backup' && (
            <div className="flex flex-col gap-4">
          {/* ── بیک اپ فولڈر — where the bottom-bar بیک اپ button copies a dated
              snapshot of the database. Completely separate from the automatic
              backup, which keeps its own D: folder and its own config untouched.
              The path is READ-ONLY here on purpose: a hand-typed typo would fail
              only at click time, and the shopkeeper would believe backups were
              happening when they were not. The picker is the only way to set it. */}
          <div className={CARD}>
            <CardHead icon={<BackupIcon />} tone="bg-rose-50 text-rose-600 border-rose-200">بیک اپ فولڈر (گوگل ڈرائیو)</CardHead>
            <div className="urdu text-[11px] text-gray-500 leading-5">
              وہ فولڈر منتخب کریں جہاں نیچے والے "بیک اپ" بٹن سے ڈیٹا کی نقل محفوظ ہو۔
              گوگل ڈرائیو ڈیسک ٹاپ کا فولڈر منتخب کریں تو نقل خود بخود کلاؤڈ پر چلی جائے گی۔
            </div>
            <Row label="فولڈر کا راستہ">
              <div className="flex items-center gap-2 w-full">
                <input
                  dir="ltr"
                  readOnly
                  className={`${INPUT} flex-1 bg-gray-50 cursor-default`}
                  value={backupInfo.folder}
                  placeholder="کوئی فولڈر منتخب نہیں"
                />
                <button
                  type="button"
                  className={`${BTN_SOFT} whitespace-nowrap`}
                  onClick={async () => {
                    if (!hasApi || !window.api.manualBackupPickFolder) return
                    try {
                      const r = await window.api.manualBackupPickFolder()
                      if (r && r.ok && r.folder) setBackupInfo((s) => ({ ...s, folder: r.folder }))
                    } catch { /* cancelled — keep the current folder */ }
                  }}
                >
                  {backupInfo.folder ? 'فولڈر تبدیل کریں' : 'فولڈر منتخب کریں…'}
                </button>
              </div>
            </Row>
            <div className="urdu text-[12px] text-gray-600">
              {backupInfo.lastBackupAt && urduDateTime(backupInfo.lastBackupAt)
                ? `آخری بیک اپ: ${urduDateTime(backupInfo.lastBackupAt)}`
                : 'ابھی تک کوئی بیک اپ نہیں ہوا'}
            </div>
          </div>
            </div>
          )}
          </div>
        </div>

        {/* پرچی ہیڈر's pin dialog — the same gate UI as ٹوٹل, but asking for a
            DIFFERENT secret. scope="dev" verifies the developer pin held as a
            digest in electron/pinGate.cjs, NOT settings.pin_hash: the shopkeeper
            owns the ٹوٹل pin and may change it whenever he likes, and none of
            that touches this lock — which is the point, since he is the one this
            section is locked against.
            grantSession={false}: unlocking here must not also open ٹوٹل, and
            re-locking here must not close it.
            Rendered INSIDE this card (which stops click propagation) so a click
            in the pin dialog cannot reach the backdrop behind and shut Defaults. */}
        <PinGate
          open={headerGate}
          scope="dev"
          grantSession={false}
          enterSubtitle="دکان کی معلومات بدلنے کے لیے پن درج کریں"
          onUnlocked={() => { setHeaderUnlocked(true); setHeaderGate(false) }}
          onClose={() => setHeaderGate(false)}
        />
      </div>
    </div>
  )
}
