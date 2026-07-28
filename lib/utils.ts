import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number, decimals = 2): string {
  return '£' + (n || 0).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function fmtNum(n: number): string {
  return (n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function fmtPct(n: number): string {
  return (n || 0).toFixed(1) + '%'
}

export function marginColor(m: number): string {
  if (m >= 20) return 'text-emerald-600'
  if (m >= 0)  return 'text-amber-600'
  return 'text-rose-500'
}

export function marginBg(m: number): string {
  if (m >= 20) return 'bg-emerald-50 text-emerald-700'
  if (m >= 0)  return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-600'
}

export const COUNTRY_NAMES: Record<string, string> = {
  GB:'United Kingdom',US:'United States',DE:'Germany',FR:'France',IT:'Italy',
  ES:'Spain',NL:'Netherlands',BE:'Belgium',AT:'Austria',PL:'Poland',
  SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',PT:'Portugal',
  IE:'Ireland',CH:'Switzerland',AU:'Australia',CA:'Canada',JP:'Japan',
  CN:'China',IN:'India',BR:'Brazil',MX:'Mexico',ZA:'South Africa',
  SG:'Singapore',HK:'Hong Kong',AE:'United Arab Emirates',SA:'Saudi Arabia',
  TR:'Turkey',RU:'Russia',KR:'South Korea',NZ:'New Zealand',TH:'Thailand',
  MY:'Malaysia',ID:'Indonesia',PH:'Philippines',VN:'Vietnam',TW:'Taiwan',
  GR:'Greece',CZ:'Czech Republic',HU:'Hungary',RO:'Romania',BG:'Bulgaria',
  HR:'Croatia',SK:'Slovakia',SI:'Slovenia',EE:'Estonia',LV:'Latvia',
  LT:'Lithuania',LU:'Luxembourg',MT:'Malta',CY:'Cyprus',IS:'Iceland',
  AR:'Argentina',CL:'Chile',CO:'Colombia',PE:'Peru',IL:'Israel',
  EG:'Egypt',MA:'Morocco',NG:'Nigeria',KE:'Kenya',GH:'Ghana',
  PK:'Pakistan',BD:'Bangladesh',LK:'Sri Lanka',UA:'Ukraine',RS:'Serbia',
}

export function countryName(code: string): string {
  if (!code) return ''
  return COUNTRY_NAMES[code.toUpperCase()] || code
}

export const STATUS_COLORS: Record<string, string> = {
  'Completed':                          'bg-emerald-50 text-emerald-700',
  'Dispatched':                         'bg-blue-50 text-blue-700',
  'In Progress':                        'bg-indigo-50 text-indigo-700',
  'Label Created':                      'bg-slate-100 text-slate-600',
  'Refunded':                           'bg-rose-50 text-rose-600',
  'Partial Refund':                     'bg-orange-50 text-orange-700',
  'Refunded - Awaiting Supplier Refund':'bg-amber-50 text-amber-700',
  'Cancelled':                          'bg-gray-100 text-gray-500',
}

export const REFUND_STATUSES = new Set([
  'Refunded', 'Partial Refund', 'Refunded - Awaiting Supplier Refund',
])
