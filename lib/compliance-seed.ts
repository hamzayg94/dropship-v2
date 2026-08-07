// Pre-populated compliance obligations for THE LIFESTYLE TRADING COMPANY LTD (17097033)
// Incorporated 17 March 2026 · Year-end 31 March 2027

export interface ObligationSeed {
  id: string
  title: string
  description: string
  category: 'tax' | 'legal' | 'accounting' | 'internal'
  frequency: 'annual' | 'monthly' | 'one-time'
  period: string
  due_date: string
  submit_to: string
  submit_url: string
  sort_order: number
  subtasks: { label: string; detail: string }[]
}

export const OBLIGATIONS: ObligationSeed[] = [
  {
    id: 'corp-tax-register',
    title: 'Register for Corporation Tax',
    description: 'All UK limited companies must register with HMRC for Corporation Tax within 3 months of starting to trade. This is a one-time obligation.',
    category: 'tax',
    frequency: 'one-time',
    period: 'once',
    due_date: '2026-06-17',
    submit_to: 'HMRC (Government Gateway)',
    submit_url: 'https://www.gov.uk/limited-company-formation/set-up-hmrc-payroll-corporation-tax',
    sort_order: 1,
    subtasks: [
      {
        label: 'Log into HMRC Government Gateway (company account)',
        detail: 'Go to https://www.gov.uk/log-in-register-hmrc-online-services and sign in using your COMPANY\'s Government Gateway ID and password — not your personal one.',
      },
      {
        label: 'Register the company for Corporation Tax',
        detail: 'Select "Register a company for Corporation Tax". You\'ll need: company number (17097033), incorporation date (17 March 2026), and the date the company started trading.',
      },
      {
        label: 'Note your Corporation Tax Unique Taxpayer Reference (UTR)',
        detail: 'HMRC will post your 10-digit UTR to your registered office address (71-75 Shelton Street) within 14 days. Keep it safe — you\'ll need it for every tax filing.',
      },
      {
        label: 'Set up your HMRC Online account for the company',
        detail: 'Once you have the UTR, activate Corporation Tax in your Government Gateway account. This lets you file returns and see what you owe online.',
      },
    ],
  },
  {
    id: 'self-assessment-2025-26',
    title: 'Self Assessment Tax Return 2025–26',
    description: 'Personal Self Assessment covering your sole trader eBay income in February 2026 (before incorporation) plus any director salary or dividends from THE LIFESTYLE TRADING COMPANY LTD between March–April 2026.',
    category: 'tax',
    frequency: 'annual',
    period: '2025-26',
    due_date: '2027-01-31',
    submit_to: 'HMRC Online (Self Assessment)',
    submit_url: 'https://www.gov.uk/self-assessment-tax-returns',
    sort_order: 2,
    subtasks: [
      {
        label: 'Register for Self Assessment with HMRC',
        detail: 'If you haven\'t filed Self Assessment before, register at https://www.gov.uk/register-for-self-assessment. You\'ll need your National Insurance number. Do this well before January — it can take 2–3 weeks to receive your UTR.',
      },
      {
        label: 'Gather sole trader eBay income for February 2026',
        detail: 'Pull your eBay payout figures for February 2026 only — this was your period as a sole trader before incorporating on 17 March 2026. Use your app\'s P&L filtered to February 2026.',
      },
      {
        label: 'Gather sole trader business expenses for February 2026',
        detail: 'Collect all allowable expenses for February 2026: supplier costs, eBay Final Value Fees, Promoted Listing Ad Fees, postage labels, eBay Shop Subscription (pro-rated if applicable). These reduce your taxable income.',
      },
      {
        label: 'Note any director salary or dividends taken (Mar–Apr 2026)',
        detail: 'Check if you paid yourself any salary or dividends from THE LIFESTYLE TRADING COMPANY LTD between 17 March 2026 and 5 April 2026 (end of 2025-26 tax year). Include these on the return.',
      },
      {
        label: 'Log into HMRC Government Gateway (personal account)',
        detail: 'Use your PERSONAL Government Gateway login — separate from the company\'s. Go to https://www.gov.uk/log-in-file-self-assessment-tax-return',
      },
      {
        label: 'Complete the SA100 main return form',
        detail: 'The SA100 is the main Self Assessment form. Enter your name, address, and National Insurance number. Tick boxes for: Self Employment, and Employment (if you took a director\'s salary).',
      },
      {
        label: 'Complete SA103 supplement for sole trader income',
        detail: 'SA103 covers your February 2026 sole trader eBay income and expenses. Enter gross income, then deduct all allowable expenses. The difference is your taxable self-employment profit.',
      },
      {
        label: 'Complete SA102 for director employment income (if applicable)',
        detail: 'If you paid yourself a director\'s salary from the company in March–April 2026, complete SA102. Enter the gross salary and any PAYE tax deducted (shown on your P60 or payslip).',
      },
      {
        label: 'Review the tax calculation',
        detail: 'HMRC calculates your tax automatically based on what you enter. Check the figure looks right. For a sole trader with one month of modest eBay income, the tax should be relatively small. If it looks very high, double-check your expenses are entered correctly.',
      },
      {
        label: 'Submit the return online by 31 January 2027',
        detail: 'Submit via HMRC Online. You\'ll receive an online submission reference — save this. The deadline is 31 January 2027. Filing late incurs an automatic £100 penalty.',
      },
      {
        label: 'Pay any tax owed by 31 January 2027',
        detail: 'Pay via HMRC Online or bank transfer. Use your Self Assessment payment reference (same as your UTR). Interest applies from 1 February 2027 on unpaid amounts. If you can\'t pay in full, contact HMRC to set up a Time to Pay arrangement.',
      },
    ],
  },
  {
    id: 'confirmation-statement-2027',
    title: 'Confirmation Statement 2026–27',
    description: 'Annual confirmation to Companies House that your company\'s details are correct. First statement date: 16 March 2027. Must be filed by 30 March 2027.',
    category: 'legal',
    frequency: 'annual',
    period: '2026-27',
    due_date: '2027-03-30',
    submit_to: 'Companies House (WebFiling)',
    submit_url: 'https://www.gov.uk/file-a-confirmation-statement-with-companies-house',
    sort_order: 3,
    subtasks: [
      {
        label: 'Log into Companies House WebFiling',
        detail: 'Go to https://ewf.companieshouse.gov.uk and sign in. You\'ll need: company number (17097033) and your Companies House authentication code (posted to your registered office when you incorporated).',
      },
      {
        label: 'Confirm registered office address is correct',
        detail: 'Current registered address: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ. If this has changed (e.g. you moved to a different registered address provider), update it before filing.',
      },
      {
        label: 'Confirm directors and PSC (Person with Significant Control)',
        detail: 'Check all directors are correctly listed. The PSC section should show whoever owns or controls more than 25% of the company. This is usually you as the sole director/shareholder.',
      },
      {
        label: 'Confirm SIC code and business activity',
        detail: 'Your SIC code is 47910 (Retail sale via mail order houses or via Internet). This still accurately describes your eBay dropshipping business. No change needed.',
      },
      {
        label: 'Confirm share capital and shareholder details',
        detail: 'Confirm the number of shares issued and who holds them hasn\'t changed. If you\'re the sole shareholder, this should be unchanged from incorporation.',
      },
      {
        label: 'Submit the confirmation statement and pay the fee',
        detail: 'Submit via Companies House WebFiling. The annual filing fee is £34 (paid online by card at the time of filing). Filing is straightforward — the online form walks you through each section.',
      },
      {
        label: 'Download and save the filing confirmation',
        detail: 'Download the acceptance email or PDF from Companies House. Keep it with your company records. Companies House will also update your company\'s public filing history online.',
      },
    ],
  },
  {
    id: 'statutory-accounts-2027',
    title: 'First Statutory Accounts (Year ended 31 March 2027)',
    description: 'Your first set of statutory accounts covering 17 March 2026 to 31 March 2027. Must be filed at Companies House by 17 December 2027. As a micro-entity (under £632k turnover), you can use simplified accounts.',
    category: 'accounting',
    frequency: 'annual',
    period: '2026-27',
    due_date: '2027-12-17',
    submit_to: 'Companies House (WebFiling)',
    submit_url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return',
    sort_order: 4,
    subtasks: [
      {
        label: 'Confirm you qualify as a micro-entity',
        detail: 'You qualify as a micro-entity if you meet 2 of 3: turnover under £632k, balance sheet under £316k, fewer than 10 employees. As a small eBay seller you almost certainly qualify. Micro-entities can file simplified accounts with just a Balance Sheet — no P&L required publicly.',
      },
      {
        label: 'Gather all sales income for the full year (17 Mar 2026 – 31 Mar 2027)',
        detail: 'Export your total eBay payouts for the full accounting period from your app\'s P&L page. This is your turnover figure for the accounts.',
      },
      {
        label: 'Gather all expense receipts and invoices',
        detail: 'Collect: supplier invoices, eBay fee statements, postage receipts, shop subscription invoices, any equipment or software purchased, bank charges, and any other business costs.',
      },
      {
        label: 'Reconcile your business bank account for the full year',
        detail: 'Match every bank transaction to a receipt or invoice. Download all bank statements for the period. Every pound in and out must be accounted for. This is the foundation of your accounts.',
      },
      {
        label: 'Prepare the Profit & Loss statement',
        detail: 'Your P&L page has most of this: Revenue (eBay payouts) → less eBay fees, supplier costs, ad fees, overheads → Net Profit. Format it as a simple table for the year 17 Mar 2026 – 31 Mar 2027.',
      },
      {
        label: 'Prepare the Balance Sheet at 31 March 2027',
        detail: 'A Balance Sheet shows what the company owns (assets) and owes (liabilities) on 31 March 2027. Typical items: Cash at bank, any stock held, money owed to suppliers, share capital. Assets must equal Liabilities + Equity.',
      },
      {
        label: 'File micro-entity accounts at Companies House',
        detail: 'Log into Companies House WebFiling. Select "File micro-entity accounts". You can enter the Balance Sheet figures directly online — no specialist software needed. The form guides you through each field.',
      },
      {
        label: 'Save the Companies House filing confirmation',
        detail: 'Download the acceptance notice from Companies House. This is your proof of filing. Keep it with your business records for at least 6 years.',
      },
    ],
  },
  {
    id: 'corp-tax-payment-2027',
    title: 'Corporation Tax Payment (Year ended 31 March 2027)',
    description: 'Pay your Corporation Tax bill for the year ended 31 March 2027. Payment is due 9 months and 1 day after the accounting period end — 1 January 2028.',
    category: 'tax',
    frequency: 'annual',
    period: '2026-27',
    due_date: '2028-01-01',
    submit_to: 'HMRC (bank transfer)',
    submit_url: 'https://www.gov.uk/pay-corporation-tax',
    sort_order: 5,
    subtasks: [
      {
        label: 'Calculate your taxable profit for the year',
        detail: 'Taxable profit = Total eBay revenue − Allowable business expenses − Director salary (if any) − Pension contributions (if any). Your app\'s P&L net profit is a good starting point, but check with HMRC guidance on which expenses are allowable.',
      },
      {
        label: 'Apply the correct Corporation Tax rate',
        detail: 'For profits under £50,000: 19% (small profits rate). For profits over £250,000: 25%. Between these: marginal relief applies. As a small eBay dropshipper, you\'ll almost certainly be at 19%.',
      },
      {
        label: 'Calculate the exact tax owed',
        detail: 'Multiply your taxable profit by 19%. Example: £15,000 profit × 19% = £2,850 Corporation Tax. Note: you only pay tax on profit, not on revenue.',
      },
      {
        label: 'Find your 17-digit HMRC Corporation Tax payment reference',
        detail: 'This is on your HMRC correspondence after you registered for Corporation Tax. It\'s different from your UTR. Format: 1234567890A00101A. If you can\'t find it, log into your HMRC Online account for the company.',
      },
      {
        label: 'Pay HMRC by bank transfer',
        detail: 'Bank transfer details: Sort code 08-32-10, Account number 12001039, Account name "HMRC Cumbernauld". Use your 17-digit payment reference as the reference. Payments via Faster Payments clear same or next working day.',
      },
      {
        label: 'Confirm payment received in HMRC Online account',
        detail: 'Log into your HMRC Online company account and check Corporation Tax. Payment should appear within 3–5 working days. Late payment incurs interest (currently ~7.5% per year on unpaid tax).',
      },
    ],
  },
  {
    id: 'ct600-return-2027',
    title: 'Corporation Tax Return CT600 (Year ended 31 March 2027)',
    description: 'File your CT600 Corporation Tax Return with HMRC for the year ended 31 March 2027. Due 12 months after the accounting period end — 31 March 2028.',
    category: 'tax',
    frequency: 'annual',
    period: '2026-27',
    due_date: '2028-03-31',
    submit_to: 'HMRC Online',
    submit_url: 'https://www.gov.uk/file-your-company-accounts-and-tax-return',
    sort_order: 6,
    subtasks: [
      {
        label: 'Ensure your statutory accounts are finalised',
        detail: 'The CT600 must be accompanied by your statutory accounts in iXBRL format. Complete your Companies House filing first, as the same accounts are used for both.',
      },
      {
        label: 'Log into HMRC Online for the company',
        detail: 'Use your COMPANY\'s Government Gateway login. Go to https://www.gov.uk/log-in-register-hmrc-online-services. Select "Corporation Tax" from the tax list.',
      },
      {
        label: 'Complete the CT600 form — company and period details',
        detail: 'Enter: Company name (THE LIFESTYLE TRADING COMPANY LTD), company number (17097033), accounting period (17 March 2026 to 31 March 2027), your UTR.',
      },
      {
        label: 'Enter turnover and trading profit/loss',
        detail: 'Enter your total turnover (eBay payouts) and compute the trading profit after allowable expenses. The online form will walk you through each box with guidance notes.',
      },
      {
        label: 'Claim any capital allowances',
        detail: 'If you bought equipment for the business (computer, phone, storage), you may be able to claim Annual Investment Allowance to reduce your taxable profit. Check which items qualify.',
      },
      {
        label: 'Attach your iXBRL accounts',
        detail: 'HMRC\'s free Corporation Tax online filing tool (HMRC CT software) can convert simple accounts to iXBRL automatically. Alternatively, use free software like FreeAgent, QuickFile, or Xero for this conversion.',
      },
      {
        label: 'Submit the CT600 return online',
        detail: 'Submit via HMRC Online. You\'ll receive an online acknowledgement with a submission reference. Save this as proof of filing. Filing late incurs an automatic £100 penalty (increasing for longer delays).',
      },
      {
        label: 'Save the filing confirmation',
        detail: 'Keep the HMRC acknowledgement email and submission reference with your company records for at least 6 years.',
      },
    ],
  },
  {
    id: 'self-assessment-2026-27',
    title: "Director's Self Assessment 2026–27",
    description: 'Personal Self Assessment as a director of THE LIFESTYLE TRADING COMPANY LTD. Covers 6 April 2026 to 5 April 2027. Includes any director salary and dividends taken from the company.',
    category: 'tax',
    frequency: 'annual',
    period: '2026-27',
    due_date: '2028-01-31',
    submit_to: 'HMRC Online (Self Assessment)',
    submit_url: 'https://www.gov.uk/self-assessment-tax-returns',
    sort_order: 7,
    subtasks: [
      {
        label: 'Note your total director salary for 2026–27',
        detail: 'Total salary paid to you from THE LIFESTYLE TRADING COMPANY LTD between 6 April 2026 and 5 April 2027. This will be on your P60 (if you ran payroll) or your company\'s payroll records. The optimal director salary is typically around £12,570 (the Personal Allowance) to minimise tax and NI.',
      },
      {
        label: 'Note any dividends received from the company',
        detail: 'Dividends are paid from the company\'s after-tax profits. The first £500 of dividends is tax-free (2026-27 allowance). Above that: 8.75% tax at basic rate. Record the total declared and paid to you.',
      },
      {
        label: 'Log into HMRC Government Gateway (personal account)',
        detail: 'Use your PERSONAL login — not the company\'s. Go to https://www.gov.uk/log-in-file-self-assessment-tax-return',
      },
      {
        label: 'Complete the SA100 main return',
        detail: 'Tick boxes for: Employment (director\'s salary) and Dividends. Enter your personal details and National Insurance number.',
      },
      {
        label: 'Complete SA102 for director employment income',
        detail: 'SA102 covers your salary as a director. Enter gross pay and PAYE tax deducted (from your P60). If PAYE was deducted throughout the year, you may have already paid some or all of your tax.',
      },
      {
        label: 'Enter dividend income in the SA100',
        detail: 'In the dividends section of SA100, enter total dividends received above the £500 tax-free amount. HMRC will calculate the tax at the dividend rate (8.75% for basic rate taxpayers).',
      },
      {
        label: 'Review the tax calculation',
        detail: 'Check the total tax owed. With a low director\'s salary (at or below Personal Allowance) and modest dividends, your personal tax bill should be low. If the number looks unexpectedly high, double-check your entries.',
      },
      {
        label: 'Submit the return by 31 January 2028',
        detail: 'Submit via HMRC Online. Save the submission reference. An automatic £100 penalty applies if filed late.',
      },
      {
        label: 'Pay any tax owed by 31 January 2028',
        detail: 'Pay via HMRC Online using your personal Self Assessment UTR as the reference. Interest applies from 1 February 2028 on any unpaid balance.',
      },
    ],
  },
  {
    id: 'monthly-bookkeeping',
    title: 'Monthly Bookkeeping & Reconciliation',
    description: 'Reconcile all accounts and keep your app data up to date at the end of each month. Good monthly habits prevent a stressful year-end.',
    category: 'internal',
    frequency: 'monthly',
    period: 'monthly',
    due_date: '',   // computed dynamically
    submit_to: 'Internal (your app)',
    submit_url: '',
    sort_order: 8,
    subtasks: [
      {
        label: 'Run eBay Orders sync',
        detail: 'Go to the Orders page and click "Sync eBay". This pulls all new and updated orders from eBay into your app.',
      },
      {
        label: 'Run Finance sync',
        detail: 'Click "Sync Finances" on the Orders or P&L page. This updates actual payouts and fees from the eBay Finance API.',
      },
      {
        label: 'Download and import the eBay Expenses CSV',
        detail: 'In eBay Seller Hub: go to Payments → Reports → Transaction report. Download the CSV for the current month. Import it on the Cost Entry page to add ad fees and subscription costs.',
      },
      {
        label: 'Enter missing supplier costs',
        detail: 'Go to the Cost Entry page. Any orders showing £0 cost need the supplier cost entering manually. Enter what you paid the supplier for each order.',
      },
      {
        label: 'Review the P&L page for the month',
        detail: 'Check the Monthly tab on the P&L page. Verify the net profit looks correct. Investigate any months where margin is unexpectedly low — it usually means missing costs or an unrecorded expense.',
      },
      {
        label: 'Check and update any refunded orders',
        detail: 'Review orders with refund-related statuses. Update "Refunded - Awaiting Supplier Refund" orders once you receive the supplier refund.',
      },
    ],
  },
]
