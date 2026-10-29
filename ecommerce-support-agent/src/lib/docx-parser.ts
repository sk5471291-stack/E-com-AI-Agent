import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import { PolicyData } from '@/types';

let cachedPolicyData: PolicyData | null = null;

export async function parseDocxFile(filePath?: string, customBuffer?: Buffer): Promise<PolicyData> {
  const targetPath = filePath || path.join(process.cwd(), 'data', 'company_policies.docx');
  const fallbackPath = path.join(process.cwd(), '..', 'data', 'company_policies.docx');

  let buffer: Buffer;
  let fileName = 'company_policies.docx';

  if (customBuffer) {
    buffer = customBuffer;
    fileName = 'custom_uploaded_policy.docx';
  } else if (fs.existsSync(targetPath)) {
    buffer = fs.readFileSync(targetPath);
    fileName = path.basename(targetPath);
  } else if (fs.existsSync(fallbackPath)) {
    buffer = fs.readFileSync(fallbackPath);
    fileName = path.basename(fallbackPath);
  } else {
    // If docx file not found on disk, produce fallback text
    return getFallbackPolicyData();
  }

  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });

    const rawText = rawResult.value;
    const htmlContent = htmlResult.value;

    const sections = parseSectionsFromText(rawText);

    const policyData: PolicyData = {
      rawText,
      htmlContent,
      sections,
      lastLoaded: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      fileName
    };

    cachedPolicyData = policyData;
    return policyData;
  } catch (error) {
    console.error('Error parsing docx with mammoth:', error);
    return getFallbackPolicyData();
  }
}

export function getCachedPolicy(): PolicyData {
  if (cachedPolicyData) return cachedPolicyData;
  return getFallbackPolicyData();
}

function parseSectionsFromText(text: string): { id: string; title: string; content: string }[] {
  const lines = text.split('\n');
  const sections: { id: string; title: string; content: string }[] = [];
  let currentTitle = 'General Overview';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line looks like a header (e.g. "1. COMPANY OVERVIEW" or "RETURN POLICY")
    const isHeader = /^[0-9]+\.\s+[A-Z\s&]+$/.test(trimmed) || 
                     /^[A-Z\s]{4,30}\s+(POLICY|OVERVIEW|SUPPORT|HOURS|PROCESS)$/.test(trimmed);

    if (isHeader) {
      if (currentLines.length > 0) {
        sections.push({
          id: `sec-${sections.length + 1}`,
          title: currentTitle,
          content: currentLines.join('\n').trim()
        });
        currentLines = [];
      }
      currentTitle = trimmed;
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      id: `sec-${sections.length + 1}`,
      title: currentTitle,
      content: currentLines.join('\n').trim()
    });
  }

  return sections;
}

function getFallbackPolicyData(): PolicyData {
  const fallbackText = `
COMPANY OVERVIEW & POLICY DOCUMENT
TechMart Online Store — Internal & Customer Knowledge Base

1. COMPANY OVERVIEW
TechMart Online Store is a leading consumer electronics and computer accessories retailer founded in 2021.
Headquarters: 100 Tech Blvd, Suite 400, Austin, TX 78701.
Mission: Providing authentic tech gadgets and computing hardware with lightning-fast delivery and transparent customer support.

2. RETURN POLICY
Customers may return items within 30 days of the purchase date.
All returned items must be unused and in their original packaging with all accessories included.
Electronics such as laptops, phones, tablets, headphones, keyboards, and mice must be returned within 15 days.
Items marked as "Final Sale" or discounted by 50% or more cannot be returned or exchanged.
To initiate a return, contact support@techmart.com or enter your order number in our AI portal.

3. REFUND POLICY
Refunds are processed within 5 business days after the returned item or cancellation request is approved.
Refunds are issued to the customer's bank account or original payment method.
Standard shipping costs are non-refundable unless the return is due to a defective or incorrect item delivered.
If paid via bank transfer, funds reflect in 3 to 5 business days.

4. SHIPPING POLICY
Standard shipping takes 3–5 business days and costs $4.99.
Express shipping takes 1–2 business days and costs $12.99.
Free standard shipping is automatically available on all orders above $50.00.
We currently ship to all 50 US states. International shipping is not available.
Orders placed before 2:00 PM EST are dispatched the same day.

5. WARRANTY POLICY
All electronics come with a 1-year manufacturer warranty covering internal hardware defects.
The warranty does not cover physical drops, liquid damage, or unauthorized modifications.
To claim warranty service, contact support@techmart.com with your proof of purchase.
Laptops and desktops come with an optional 2-year extended warranty.

6. EXCHANGE POLICY
Exchanges are allowed within 30 days of purchase (15 days for electronics).
The item being exchanged must be in original condition with packaging intact.
If the replacement item costs more, the customer pays the difference; if less, the difference is refunded.

7. CUSTOMER SUPPORT & CONTACT HOURS
Support is available Monday to Friday, 9:00 AM to 6:00 PM EST.
Email: support@techmart.com | Phone: 1-800-TECHMART
Live AI Chat assistance is available 24/7 on the website.

8. DISCOUNTS, PROMOTIONS & PRICE MATCH POLICY
Promo Code "TECH10": Grants an instant 10% discount on all orders over $100.
Promo Code "SAVE15": Exclusive 15% discount for verified students and educators on laptops, tablets, and headphones.
Free Standard Shipping: Automatically applied at checkout for all cart totals of $50.00 or more.
Bundle Discount: Purchasing a laptop and mouse together automatically applies a $25 instant bundle rebate.
Price Match Guarantee: TechMart will match any lower verified advertised price from authorized US retailers within 7 days.
Clearance / Final Sale: Items marked with discount >= 50% or "Final Sale" are sold as-is and cannot be returned or refunded.

9. REFUND PROCESS & CRITERIA EVALUATION
Eligibility Rule 1 (Timeframe): Return/Refund requests must be submitted within 15 calendar days of order delivery for electronics (laptops, phones, tablets, headphones, keyboards, mice) and within 30 calendar days for general accessories.
Eligibility Rule 2 (Condition): Products must be in original condition, undamaged, with original packaging, cables, and accessories.
Eligibility Rule 3 (Final Sale): Final sale or clearance items with >= 50% discount are strictly non-refundable.
Automatic Approval & Payout: Once a refund request is approved, an automated refund confirmation email is immediately sent to the customer's registered email address.
Payout Schedule: Funds are remitted to the customer's bank account or original card within 3 to 5 business days.
Logging: All customer support interactions, return evaluations, and refund transaction statuses are logged synchronously in Google Sheets.
  `.trim();

  return {
    rawText: fallbackText,
    htmlContent: `<pre>${fallbackText}</pre>`,
    sections: parseSectionsFromText(fallbackText),
    lastLoaded: new Date().toLocaleTimeString(),
    fileName: 'company_policies.docx (Embedded)'
  };
}
