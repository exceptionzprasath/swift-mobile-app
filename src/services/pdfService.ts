export interface PDFPalette {
  primaryHex: string;
  primaryDarkHex: string;
  accentHex: string;
  primaryRgb?: [number, number, number];
  primaryDarkRgb?: [number, number, number];
  accentRgb?: [number, number, number];
}

export const DEFAULT_PDF_PALETTE: PDFPalette = {
  primaryHex: '#0f172a',
  primaryDarkHex: '#020617',
  accentHex: '#0284c7',
  primaryRgb: [15, 23, 42],
  primaryDarkRgb: [2, 6, 23],
  accentRgb: [2, 132, 199],
};

export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [15, 23, 42];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Format amount in Indian Rupees */
export function formatPdfCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rs. ${rounded.toLocaleString('en-IN')}`;
}

/** Pure JavaScript UTF-8 to Base64 Encoder */
export function utf8ToBase64(str: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
    } else {
      // surrogate pair
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let encoded = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    const b2 = i < bytes.length ? bytes[i++] : NaN;
    const b3 = i < bytes.length ? bytes[i++] : NaN;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    let enc4 = b3 & 63;

    if (isNaN(b2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(b3)) {
      enc4 = 64;
    }

    encoded += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }
  return encoded;
}

/** Convert numbers to Indian English Words */
export function numberToWordsIndian(num: number): string {
  const val = Math.round(num || 0);
  if (val <= 0) return 'Rupees Zero Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let temp = val;
  const crore = Math.floor(temp / 10000000);
  temp %= 10000000;
  const lakh = Math.floor(temp / 100000);
  temp %= 100000;
  const thousand = Math.floor(temp / 1000);
  temp %= 1000;
  const remainder = Math.floor(temp);

  let res = '';
  if (crore > 0) res += inWords(crore) + 'Crore ';
  if (lakh > 0) res += inWords(lakh) + 'Lakh ';
  if (thousand > 0) res += inWords(thousand) + 'Thousand ';
  if (remainder > 0) res += inWords(remainder);

  return 'Rupees ' + res.trim() + ' Only';
}

export interface GenerateSalarySlipOptions {
  company: any;
  employee: any;
  month: string;
  computation: any;
  paidDays?: number;
  weekOffDaysCount?: number;
  leaveDaysCount?: number;
  holidaysDaysCount?: number;
  sundayWorkDaysCount?: number;
  pendingAdvance?: number;
  docAssets?: {
    letterheadDataUrl?: string;
    watermarkDataUrl?: string;
    footerDataUrl?: string;
    logoDataUrl?: string;
  };
  palette?: PDFPalette;
}

/**
 * Generates an exact HTML representation of the Swift Admin Payslip Template
 */
export function generatePayslipHtml(options: GenerateSalarySlipOptions): string {
  const {
    company = {},
    employee = {},
    month = new Date().toISOString().slice(0, 7),
    computation = {},
    paidDays,
    weekOffDaysCount = 4,
    leaveDaysCount = 0,
    holidaysDaysCount = 0,
    sundayWorkDaysCount = 0,
    pendingAdvance = 0,
    docAssets = {},
    palette = DEFAULT_PDF_PALETTE,
  } = options;

  const deductions = computation.deductions || {};
  const earnings = computation.earnings || {};
  const net = Math.round(computation.net || 0);
  const gross = Math.round(computation.gross || 0);
  const totalDeductions = Math.round(computation.totalDeductions || 0);

  const safeMonth = month || new Date().toISOString().slice(0, 7);
  let formattedMonthDateStr = `01-${safeMonth}`;
  let formattedMonthNameStr = safeMonth;
  try {
    const [y, m] = safeMonth.split('-');
    if (y && m) {
      formattedMonthDateStr = `01-${m}-${y}`;
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      formattedMonthNameStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    }
  } catch {
    // fallback
  }

  const workingDays = company.workingDaysPerMonth || 26;
  const actualPresent = computation.daysWorked !== undefined ? computation.daysWorked : (paidDays !== undefined ? paidDays : workingDays);
  const weekOffs = weekOffDaysCount !== undefined ? weekOffDaysCount : 4;
  const effectivePaidDays = paidDays !== undefined ? paidDays : actualPresent + weekOffs;

  let totalMonthDays = 30;
  try {
    const [y, m] = safeMonth.split('-');
    if (y && m) {
      totalMonthDays = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    }
  } catch {
    totalMonthDays = 30;
  }

  const fixedGross = computation.fixedGross || employee.fixedSalary || employee.basic || 30000;
  const dailyPaySlab = workingDays > 0 ? Math.round(fixedGross / workingDays) : Math.round(fixedGross / 30);
  const prorateFactor = workingDays > 0 ? Math.min(1, actualPresent / workingDays) : 1;

  const basicPct = company.basicPct ?? 20;
  const daPct = company.daEnabled !== false ? (company.daPct ?? 13.33) : 0;
  const combinedBasicDaPct = basicPct + daPct;
  const rateBasicDA = Math.round(fixedGross * (combinedBasicDaPct / 100));

  const earnedItems: { name: string; amount: number }[] = [];
  if (computation.earningsList && computation.earningsList.length > 0) {
    let combinedBasicDaAmt = 0;
    computation.earningsList.forEach((el: any) => {
      const idLower = (el.id || '').toLowerCase();
      const nameLower = (el.name || '').toLowerCase();
      if (idLower === 'basic' || idLower === 'da' || nameLower.includes('basic') || nameLower.includes('dearness')) {
        combinedBasicDaAmt += el.amount || 0;
      }
    });

    if (combinedBasicDaAmt > 0) {
      earnedItems.push({ name: 'BASIC + DA', amount: combinedBasicDaAmt });
    }

    computation.earningsList.forEach((el: any) => {
      const idLower = (el.id || '').toLowerCase();
      const nameLower = (el.name || '').toLowerCase();
      if (idLower === 'basic' || idLower === 'da' || nameLower.includes('basic') || nameLower.includes('dearness')) {
        return;
      }
      let displayName = (el.name || 'ALLOWANCE').toUpperCase();
      if (idLower === 'hra' || nameLower.includes('hra')) displayName = 'HRA (HOUSE RENT)';
      else if (idLower === 'ca' || nameLower.includes('conveyance')) displayName = 'CONVEYANCE ALW';
      else if (idLower === 'oa' || nameLower.includes('other')) displayName = 'SPECIAL / OTHER ALW';
      else if (idLower === 'lta' || nameLower.includes('travel')) displayName = 'L.T.A';

      if (el.amount > 0 && !earnedItems.some((item) => item.name === displayName)) {
        earnedItems.push({ name: displayName, amount: el.amount });
      }
    });
  }

  if (earnedItems.length === 0 && gross > 0) {
    earnedItems.push({ name: 'BASIC + DA', amount: Math.round(rateBasicDA * prorateFactor) || gross });
  }

  const deductionItems: { name: string; amount: number }[] = [];
  if ((deductions.employeePF || 0) > 0) deductionItems.push({ name: 'EPF (EMPLOYEE PF)', amount: deductions.employeePF });
  if ((deductions.employeeESI || 0) > 0) deductionItems.push({ name: 'ESIC (ESI)', amount: deductions.employeeESI });
  if ((deductions.professionalTax || 0) > 0) deductionItems.push({ name: 'PROFESSIONAL TAX (PT)', amount: deductions.professionalTax });
  if ((deductions.tds || 0) > 0) deductionItems.push({ name: 'TDS (INCOME TAX)', amount: deductions.tds });
  if ((deductions.advance || 0) > 0) deductionItems.push({ name: 'SALARY ADVANCE', amount: deductions.advance });
  if ((deductions.loan || 0) > 0 || (deductions.loanEmi || 0) > 0) {
    deductionItems.push({ name: 'LOAN EMI DEDUCTION', amount: deductions.loan || deductions.loanEmi });
  }

  if (deductionItems.length === 0) {
    deductionItems.push({ name: 'NIL DEDUCTIONS', amount: 0 });
  }

  const maxRows = Math.max(earnedItems.length, deductionItems.length, 6);
  const rowsHtml: string[] = [];

  for (let i = 0; i < maxRows; i++) {
    const eItem = earnedItems[i];
    const dItem = deductionItems[i];
    rowsHtml.push(`
      <tr>
        <td class="col-earn-name">${eItem ? eItem.name : ''}</td>
        <td class="col-earn-amt">${eItem ? `: ₹${eItem.amount.toLocaleString('en-IN')}` : ''}</td>
        <td class="col-ded-name">${dItem ? dItem.name : ''}</td>
        <td class="col-ded-amt">${dItem ? `: ₹${dItem.amount.toLocaleString('en-IN')}` : ''}</td>
      </tr>
    `);
  }

  const letterheadImgTag = docAssets?.letterheadDataUrl
    ? `<div class="letterhead-header" style="background-color:#ffffff !important;"><img src="${docAssets.letterheadDataUrl}" alt="Letterhead" /></div>`
    : '';

  const footerImgTag = docAssets?.footerDataUrl
    ? `<div class="footer-image" style="background-color:#ffffff !important;"><img src="${docAssets.footerDataUrl}" alt="Footer" /></div>`
    : '';

  const primaryDark = palette.primaryDarkHex || '#020617';
  const primary = palette.primaryHex || '#0f172a';
  const accent = palette.accentHex || '#0284c7';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip_${employee.empCode || 'EMP'}_${safeMonth}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 16px 12px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .payslip-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff !important;
      border: 2px solid ${primary}50;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      -webkit-print-color-adjust: exact !important;
    }
    .letterhead-header {
      width: 100%;
      text-align: center;
      border-bottom: 1px solid ${primary}30;
      padding: 6px;
      background: #ffffff !important;
    }
    .letterhead-header img {
      max-height: 70px;
      max-width: 100%;
      object-fit: contain;
    }
    .brand-banner {
      background-color: ${primaryDark} !important;
      border-bottom: 2px solid ${accent}90;
      padding: 12px 16px;
      color: #ffffff !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff !important;
    }
    .brand-tag {
      display: inline-block;
      background-color: ${accent}35 !important;
      border: 1px solid ${accent}80;
      color: #ffffff !important;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
      margin-top: 4px;
      text-transform: uppercase;
      -webkit-print-color-adjust: exact !important;
    }
    .brand-address {
      font-size: 9px;
      color: #e2e8f0 !important;
      text-align: right;
      max-width: 260px;
      line-height: 1.3;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      table-layout: fixed;
    }
    th, td {
      padding: 4.5px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    
    .meta-table td {
      background-color: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
    }
    .meta-label {
      font-weight: 800;
      color: #475569 !important;
      width: 14%;
      text-transform: uppercase;
      font-size: 8.5px;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a !important;
      width: 19.3%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta-theme {
      color: ${primary} !important;
      font-weight: 800;
    }
    .meta-highlight {
      background-color: ${primary}12 !important;
      color: ${primary} !important;
      font-weight: 800;
      -webkit-print-color-adjust: exact !important;
    }
    
    .att-header {
      background-color: ${primary} !important;
      color: #ffffff !important;
      text-align: center;
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 5px;
      -webkit-print-color-adjust: exact !important;
    }
    .att-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;
      padding: 6px;
      background-color: #f8fafc !important;
      border-bottom: 1px solid #cbd5e1;
      -webkit-print-color-adjust: exact !important;
    }
    .att-tile {
      background-color: #ffffff !important;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-align: center;
      padding: 4px 2px;
      -webkit-print-color-adjust: exact !important;
    }
    .att-tile-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b !important;
    }
    .att-tile-val {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a !important;
      margin-top: 1px;
    }
    
    .earn-header {
      background-color: #047857 !important;
      color: #ffffff !important;
      text-align: center;
      font-weight: 900;
      width: 50%;
      font-size: 10px;
      padding: 5px;
      -webkit-print-color-adjust: exact !important;
    }
    .ded-header {
      background-color: #be123c !important;
      color: #ffffff !important;
      text-align: center;
      font-weight: 900;
      width: 50%;
      font-size: 10px;
      padding: 5px;
      -webkit-print-color-adjust: exact !important;
    }
    .col-earn-name {
      width: 33%;
      font-weight: 700;
      color: #334155 !important;
    }
    .col-earn-amt {
      width: 17%;
      font-weight: 900;
      color: #047857 !important;
      text-align: right;
    }
    .col-ded-name {
      width: 33%;
      font-weight: 700;
      color: #334155 !important;
    }
    .col-ded-amt {
      width: 17%;
      font-weight: 900;
      color: #be123c !important;
      text-align: right;
    }
    
    .totals-row td {
      font-weight: 900;
      font-size: 10.5px;
      padding: 6px;
    }
    .gross-cell {
      background-color: #ecfdf5 !important;
      color: #047857 !important;
      -webkit-print-color-adjust: exact !important;
    }
    .ded-cell {
      background-color: #fff1f2 !important;
      color: #be123c !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    .net-banner {
      background-color: ${primary} !important;
      color: #ffffff !important;
      padding: 9px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 12px;
      border-top: 2px solid ${accent}80;
      -webkit-print-color-adjust: exact !important;
    }
    .net-val {
      font-size: 15px;
      font-weight: 900;
      color: #ffffff !important;
    }
    
    .disbursal-box {
      background-color: #f8fafc !important;
      padding: 8px 12px;
      border-top: 1.5px solid #cbd5e1;
      font-size: 9.5px;
      -webkit-print-color-adjust: exact !important;
    }
    .disbursal-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .disbursal-col {
      font-weight: 700;
      color: #334155 !important;
    }
    .words-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #334155 !important;
    }
    .footer-image {
      text-align: center;
      padding: 4px;
      border-top: 1px solid ${primary}30;
      background-color: #ffffff !important;
    }
    .footer-image img {
      max-height: 40px;
      max-width: 100%;
      object-fit: contain;
    }
    .disclaimer {
      font-size: 8px;
      color: #64748b !important;
      text-align: center;
      margin-top: 8px;
      line-height: 1.4;
      padding-bottom: 8px;
    }

    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .payslip-container {
        border: 1.5px solid ${primary} !important;
        border-radius: 8px !important;
        box-shadow: none !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:800px;margin:0 auto 12px;display:flex;justify-content:space-between;align-items:center;background:#1e293b;color:#ffffff;padding:10px 16px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.3px;">Official Salary Slip Preview</div>
    <button onclick="window.print()" style="background:${accent};color:#ffffff;border:none;padding:8px 18px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
      <span>🖨️</span> Save as PDF / Print
    </button>
  </div>

  <div class="payslip-container">
    ${letterheadImgTag}
    <div class="brand-banner" style="background-color:${primaryDark} !important; color:#ffffff !important; border-bottom:2px solid ${accent}90 !important;">
      <div>
        <div class="brand-title" style="color:#ffffff !important;">${(company.legalName || company.name || employee.companyName || 'SWIFT HRMS').toUpperCase()}</div>
        <div class="brand-tag" style="background-color:${accent}35 !important; border:1px solid ${accent}80 !important; color:#ffffff !important;">SALARY / WAGE SLIP & TIME CARD</div>
      </div>
      <div class="brand-address" style="color:#e2e8f0 !important;">${employee.branch || company.address || company.branch || 'Corporate Office'}</div>
    </div>
    
    <table class="meta-table">
      <tr>
        <td class="meta-label">Name</td>
        <td class="meta-val">: ${employee.name || '—'}</td>
        <td class="meta-label">Employee Code</td>
        <td class="meta-val meta-theme" style="color:${primary} !important;">: ${employee.empCode || employee.code || '—'}</td>
        <td class="meta-label">Designation</td>
        <td class="meta-val">: ${employee.designation || '—'}</td>
      </tr>
      <tr>
        <td class="meta-label">Gender</td>
        <td class="meta-val">: ${employee.gender ? employee.gender.toUpperCase() : 'MALE'}</td>
        <td class="meta-label">Month & Year</td>
        <td class="meta-val">: ${formattedMonthDateStr}</td>
        <td class="meta-label">Father Name</td>
        <td class="meta-val">: ${employee.fatherName || '—'}</td>
      </tr>
      <tr>
        <td class="meta-label">D.O.J</td>
        <td class="meta-val">: ${employee.joiningDate || employee.doj || '—'}</td>
        <td class="meta-label">D.O.B</td>
        <td class="meta-val">: ${employee.dob || '—'}</td>
        <td class="meta-label meta-theme" style="color:${primary} !important;">Pay Slab</td>
        <td class="meta-val meta-highlight" style="background-color:${primary}15 !important; color:${primary} !important;">: ₹${dailyPaySlab}/day</td>
      </tr>
      <tr>
        <td class="meta-label">PF / UAN</td>
        <td class="meta-val">: ${employee.uan || employee.pfNumber || '—'}</td>
        <td class="meta-label">ESI No</td>
        <td class="meta-val">: ${employee.esiNumber || employee.esic || (computation.esiEligible ? 'Applicable' : 'NA')}</td>
        <td class="meta-label meta-theme" style="color:${primary} !important;">Fixed Salary</td>
        <td class="meta-val meta-highlight" style="background-color:${primary}15 !important; color:${primary} !important;">: ₹${fixedGross.toLocaleString('en-IN')}/mo</td>
      </tr>
      <tr>
        <td class="meta-label">Bank A/C</td>
        <td class="meta-val">: ${employee.bankAccount || employee.bankAcc || '—'}</td>
        <td class="meta-label">Bank IFSC</td>
        <td class="meta-val">: ${employee.bankIfsc || '—'}</td>
        <td class="meta-label">PAN / Dept</td>
        <td class="meta-val">: ${employee.panNumber || employee.pan || '—'} · ${employee.department || 'General'}</td>
      </tr>
    </table>

    <div class="att-header" style="background-color:${primary} !important; color:#ffffff !important;">Attendance Summary</div>
    <div class="att-grid" style="background-color:#f8fafc !important;">
      <div class="att-tile" style="background-color:#ffffff !important;"><div class="att-tile-label">Month Days</div><div class="att-tile-val">${totalMonthDays}</div></div>
      <div class="att-tile" style="background-color:#f0f9ff !important; border-color:#bae6fd !important;"><div class="att-tile-label" style="color:#0369a1 !important;">Pay Days</div><div class="att-tile-val" style="color:#0369a1 !important;">${effectivePaidDays}</div></div>
      <div class="att-tile" style="background-color:#ecfdf5 !important; border-color:#a7f3d0 !important;"><div class="att-tile-label" style="color:#047857 !important;">Present</div><div class="att-tile-val" style="color:#047857 !important;">${actualPresent}</div></div>
      <div class="att-tile" style="background-color:#fff1f2 !important; border-color:#fecdd3 !important;"><div class="att-tile-label" style="color:#be123c !important;">Leave</div><div class="att-tile-val" style="color:#be123c !important;">${leaveDaysCount}</div></div>
      <div class="att-tile" style="background-color:#eef2ff !important; border-color:#c7d2fe !important;"><div class="att-tile-label" style="color:#4338ca !important;">Week Off</div><div class="att-tile-val" style="color:#4338ca !important;">${weekOffs}</div></div>
      <div class="att-tile" style="background-color:#fffbeb !important; border-color:#fde68a !important;"><div class="att-tile-label" style="color:#b45309 !important;">Holidays</div><div class="att-tile-val" style="color:#b45309 !important;">${holidaysDaysCount}</div></div>
      <div class="att-tile" style="background-color:#faf5ff !important; border-color:#e9d5ff !important;"><div class="att-tile-label" style="color:#7e22ce !important;">Sunday Work</div><div class="att-tile-val" style="color:#7e22ce !important;">${sundayWorkDaysCount}</div></div>
      <div class="att-tile" style="background-color:#f8fafc !important;"><div class="att-tile-label">Pending Adv.</div><div class="att-tile-val">₹${(pendingAdvance || (deductions.advance || 0)).toLocaleString('en-IN')}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th colspan="2" class="earn-header" style="background-color:#047857 !important; color:#ffffff !important;">EARNINGS (ACTUAL EARNED)</th>
          <th colspan="2" class="ded-header" style="background-color:#be123c !important; color:#ffffff !important;">DEDUCTIONS & RECOVERIES</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.join('')}
        <tr class="totals-row">
          <td class="gross-cell" style="background-color:#ecfdf5 !important; color:#047857 !important; font-weight:800 !important;">Gross Earnings</td>
          <td class="gross-cell" style="background-color:#ecfdf5 !important; color:#047857 !important; text-align:right !important; font-weight:900 !important;">: ₹${gross.toLocaleString('en-IN')}</td>
          <td class="ded-cell" style="background-color:#fff1f2 !important; color:#be123c !important; font-weight:800 !important;">Total Deductions</td>
          <td class="ded-cell" style="background-color:#fff1f2 !important; color:#be123c !important; text-align:right !important; font-weight:900 !important;">: ₹${totalDeductions.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="net-banner" style="background-color:${primary} !important; color:#ffffff !important; border-top:2px solid ${accent}80 !important;">
      <span style="color:#ffffff !important;">NET TAKE-HOME PAY</span>
      <span class="net-val" style="color:#ffffff !important;">: ₹${net.toLocaleString('en-IN')}</span>
    </div>

    <div class="disbursal-box" style="background-color:#f8fafc !important;">
      <div class="disbursal-row">
        <div class="disbursal-col">IFSC CODE : ${employee.bankIfsc || '—'}</div>
        <div class="disbursal-col">CREDITED INTO ACCOUNT : A/C NO : ${employee.bankAccount || employee.bankAcc || '—'}</div>
        <div class="disbursal-col" style="color:${primary} !important; font-weight:800;">BANK NAME : ${employee.bankName || company.bankName || 'Corporate Bank Transfer'}</div>
      </div>
      <div class="words-row">
        <div><strong>Amount in Words:</strong> <em>${numberToWordsIndian(net)}</em></div>
        <div style="color:#059669 !important; font-weight:700;">✓ Verified Computer Generated Payslip</div>
      </div>
    </div>

    ${footerImgTag}
    <div class="disclaimer">
      This is a computer-generated salary slip and time card issued via SWIFT HRMS and does not require a physical signature.<br/>
      Generated on ${new Date().toLocaleString()} · Confidential & Privileged Document
    </div>
  </div>
</body>
</html>
  `;
}
