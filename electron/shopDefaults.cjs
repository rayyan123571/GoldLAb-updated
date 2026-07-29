// ─── Shop-identity defaults (the printed slip header) ────────────────────────
// The seven settings columns that drive the header printed above every receipt.
// These values ARE the current Chaudhary header, so a fresh install prints the
// real header immediately and an existing Chaudhary DB keeps printing exactly
// what it printed before.
//
// Used in two places, both in the main process:
//   • db.cjs         — seeds them into a new DB, backfills blank columns on an old one.
//   • rasterPrint.cjs — falls back to them when a caller sends no shop data (the
//                       printer TEST pages, which carry no settings).
// The renderer never needs this file: its shop values always come from the DB,
// through `rates`. A field the shopkeeper clears stays cleared — an empty value
// HIDES its line on the slip rather than reverting to the default here.
const SHOP_FIELDS = [
  'shop_name',
  'shop_tagline',
  'shop_owner',
  'shop_owner2',
  'shop_phone1',
  'shop_phone2',
  'shop_phone3',
  'shop_address'
]

const SHOP_DEFAULTS = {
  shop_name: 'چوہدری گولڈ لیبارٹری',
  shop_tagline: 'خالص سونے کی لین دین ۔ ہول سیل جیولری کا مرکز  (جیولری چوڑی میکر)',
  shop_owner: 'چوہدری ایم رمضان آرائیں',
  // Blank by DESIGN — the second owner is opt-in, and an empty value hides its
  // line. It must still be '' and not undefined: seedSettings() binds
  // SLIP_TEXT_DEFAULTS[f] positionally, and undefined is not a bindable value.
  shop_owner2: '',
  shop_phone1: '0300-7301839',
  shop_phone2: '0302-7330000',
  shop_phone3: '0302-3334440',
  shop_address: 'نزد موسیٰ پاک دربار صرافہ بازار ملتان'
}

// The لیب رسید terms/fee paragraph. Seeded into settings.slip_terms; editable in
// ڈیفالٹ سیٹنگز. Blank = the terms box disappears from the slip entirely.
const SLIP_TERMS_DEFAULT = 'سونا ٹیسٹ کرنے کی فیس 100 روپے اور خالص سونا یا رقم لینے کی صورت میں 40 روپے فی گرام مزدوری ہو گی۔ رزلٹ کے بعد سونا لینے یا رقم لینے کا اندر کا کارندہ پابند نہیں ہو گا۔ سونا صرف رتی کی صورت میں چیک کیا جاتا ہے۔ یہاں خالص سونے کا لین دین کیا جاتا ہے۔'

// The واٹس ایپ یاد دہانی message sent from the "لینا ہے" balance reports. Seeded
// into settings.whatsapp_reminder_text; editable in ڈیفالٹ سیٹنگز.
//   {رقم} → the outstanding amount, exactly as that report prints it on screen
//           (rupees on the رقم report, تولہ/ماشہ on the تیزابی one)
// {رقم} is the ONLY placeholder. The message never carries the customer's name —
// it addresses him as محترم. (A stray {نام} left in an edited template is stripped
// out before sending rather than filled in, so a name can never leak through.)
// Nothing is ever sent automatically: the button only OPENS the chat with this
// text filled in, and the shopkeeper presses Send.
const WA_REMINDER_DEFAULT = 'محترم، آپ کے ذمے {رقم} باقی ہیں۔ برائے مہربانی ادائیگی کر دیں۔ شکریہ'

// Every free-text settings column seeded from this file: the seven header fields,
// the terms paragraph, and the WhatsApp reminder template. db.cjs uses THIS for
// schema/seed/save; SHOP_FIELDS stays header-only.
const SLIP_TEXT_FIELDS = [...SHOP_FIELDS, 'slip_terms', 'whatsapp_reminder_text']
const SLIP_TEXT_DEFAULTS = {
  ...SHOP_DEFAULTS,
  slip_terms: SLIP_TERMS_DEFAULT,
  whatsapp_reminder_text: WA_REMINDER_DEFAULT
}

module.exports = { SHOP_FIELDS, SHOP_DEFAULTS, SLIP_TERMS_DEFAULT, WA_REMINDER_DEFAULT, SLIP_TEXT_FIELDS, SLIP_TEXT_DEFAULTS }
