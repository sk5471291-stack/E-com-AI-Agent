import { RefundEmail, Order, BankDetail } from '@/types';
import { logInteraction } from './sheets';

const globalForEmails = globalThis as unknown as {
  __techmart_dispatched_emails?: RefundEmail[];
};

if (!globalForEmails.__techmart_dispatched_emails) {
  globalForEmails.__techmart_dispatched_emails = [];
}

const dispatchedEmails: RefundEmail[] = globalForEmails.__techmart_dispatched_emails;

export function generateRefundEmail(
  order: Order,
  refundAmount: number,
  bankDetail?: BankDetail,
  customEmail?: string
): RefundEmail {
  const transactionRef = `TXN-TM-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const recipientEmail = customEmail || `${order.customer.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
  const bankName = bankDetail?.bankName || 'Original Payment Method (Direct Credit)';
  const accountNumber = bankDetail?.accountNumber ? `•••• ${bankDetail.accountNumber.slice(-4)}` : 'On File';

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; color: #93c5fd; font-size: 14px; }
    .badge-approved { display: inline-block; background: #10b981; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 18px; color: #334155; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .highlight-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .amount-value { color: #059669; font-size: 20px; font-weight: 700; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin: 22px 0; font-size: 13.5px; line-height: 1.5; color: #1e40af; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ TechMart Support</h1>
      <p>Automated Customer Care & Refund Notification</p>
      <div class="badge-approved">✓ Refund Approved & Dispatched</div>
    </div>
    <div class="content">
      <div class="greeting">
        Hello <b>${order.customer}</b>,<br><br>
        Great news! We have processed your refund request for Order <b>${order.orderId}</b> (${order.modelName || order.product}) in accordance with our <b>15-Day TechMart Policy Guarantee</b>.
      </div>

      <div class="highlight-card">
        <div class="highlight-row">
          <span class="label">Order ID:</span>
          <span class="value">${order.orderId}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Product Item:</span>
          <span class="value">${order.modelName}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Destination Account:</span>
          <span class="value">${bankName} (${accountNumber})</span>
        </div>
        <div class="highlight-row">
          <span class="label">Transaction Ref:</span>
          <span class="value" style="font-family: monospace;">${transactionRef}</span>
        </div>
        <div class="highlight-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <span class="label" style="font-size: 15px;">Total Refund Dispatched:</span>
          <span class="amount-value">$${refundAmount.toFixed(2)} USD</span>
        </div>
      </div>

      <div class="info-box">
        ℹ️ <b>Funds Delivery Schedule:</b><br>
        Your payout has been transmitted to our banking gateway. Depending on your financial institution, funds typically reflect in your account within <b>3 to 5 business days</b>.
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        If you have questions or require additional assistance, simply reply to this notification or contact our 24/7 AI Concierge at <a href="mailto:support@techmart.com">support@techmart.com</a>.
      </p>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} TechMart Online Store, Inc. • 100 Tech Blvd, Austin, TX 78701<br>
      This is an automated system confirmation generated by TechMart AI Agent.
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailRecord: RefundEmail = {
    id: `EMAIL-${Date.now().toString().slice(-6)}`,
    orderId: order.orderId,
    customerName: order.customer,
    customerEmail: recipientEmail,
    productName: order.modelName || order.product,
    refundAmount,
    bankName,
    accountNumber,
    transactionRef,
    timestamp: dateStr,
    subject: `⚡ Refund Confirmation: Order #${order.orderId} ($${refundAmount.toFixed(2)}) Approved`,
    bodyHtml,
    emailType: 'refund_confirmation'
  };

  dispatchedEmails.unshift(emailRecord);

  // Log in sheets interaction log
  logInteraction({
    type: 'email_dispatched',
    customerName: order.customer,
    orderId: order.orderId,
    details: `Automated refund confirmation email sent to ${recipientEmail} for $${refundAmount.toFixed(2)} (Ref: ${transactionRef}).`,
    statusBadge: 'EMAIL SENT'
  });

  return emailRecord;
}

export function generateOrderPlacementEmail(
  order: Order,
  recipientEmail: string,
  totalAmount?: number
): RefundEmail {
  const transactionRef = `ORD-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const amount = totalAmount || order.price || 799.99;
  const targetEmail = recipientEmail || order.customerEmail || `${order.customer.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; color: #a7f3d0; font-size: 14px; }
    .badge-confirmed { display: inline-block; background: #059669; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 18px; color: #334155; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .highlight-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .amount-value { color: #047857; font-size: 20px; font-weight: 700; }
    .info-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin: 22px 0; font-size: 13.5px; line-height: 1.5; color: #065f46; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #059669; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ TechMart Online Store</h1>
      <p>Official Order Confirmation & Delivery Receipt</p>
      <div class="badge-confirmed">✓ Order Placed & Synced in Google Sheets</div>
    </div>
    <div class="content">
      <div class="greeting">
        Hello <b>${order.customer}</b>,<br><br>
        Thank you for your order! Your purchase of <b>${order.modelName || order.product}</b> has been confirmed and logged in our live Google Sheets dispatch queue.
      </div>

      <div class="highlight-card">
        <div class="highlight-row">
          <span class="label">Order ID:</span>
          <span class="value">${order.orderId}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Item Ordered:</span>
          <span class="value">${order.modelName || order.product}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Shipping Address:</span>
          <span class="value">${order.shippingAddress || 'Standard Delivery Address'}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Contact Mobile:</span>
          <span class="value">${order.mobileNumber || 'On File'}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Order Reference:</span>
          <span class="value" style="font-family: monospace;">${transactionRef}</span>
        </div>
        <div class="highlight-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <span class="label" style="font-size: 15px;">Total Order Amount:</span>
          <span class="amount-value">$${amount.toFixed(2)} USD</span>
        </div>
      </div>

      <div class="info-box">
        📦 <b>Estimated Delivery Window:</b><br>
        Your item will be dispatched within 24 hours. Courier delivery typically takes <b>2 to 4 business days</b>. Tracking SMS updates will be sent to <b>${order.mobileNumber || 'your phone'}</b>.
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        If you need to change your address or have any questions, simply chat with our 24/7 AI Concierge or email <a href="mailto:support@techmart.com">support@techmart.com</a>.
      </p>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} TechMart Online Store, Inc. • 100 Tech Blvd, Austin, TX 78701<br>
      This is an automated system confirmation generated by TechMart AI Agent.
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailRecord: RefundEmail = {
    id: `EMAIL-${Date.now().toString().slice(-6)}`,
    orderId: order.orderId,
    customerName: order.customer,
    customerEmail: targetEmail,
    productName: order.modelName || order.product,
    refundAmount: amount,
    bankName: 'Order Placement (Pre-authorized / COD)',
    accountNumber: order.mobileNumber || 'N/A',
    transactionRef,
    timestamp: dateStr,
    subject: `⚡ Order Placed: #${order.orderId} - ${order.modelName || order.product} Confirmed`,
    bodyHtml,
    emailType: 'order_confirmation'
  };

  dispatchedEmails.unshift(emailRecord);

  logInteraction({
    type: 'email_dispatched',
    customerName: order.customer,
    orderId: order.orderId,
    details: `Order placement confirmation email dispatched to ${targetEmail} for Order ${order.orderId} ($${amount.toFixed(2)}).`,
    statusBadge: 'EMAIL SENT'
  });

  return emailRecord;
}

export function generateExchangeEmail(
  order: Order,
  replacementProduct: string,
  shippingAddress: string,
  recipientEmail: string
): RefundEmail {
  const transactionRef = `EXC-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const targetEmail = recipientEmail || order.customerEmail || `${order.customer.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; color: #bfdbfe; font-size: 14px; }
    .badge-exchange { display: inline-block; background: #2563eb; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 18px; color: #334155; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .highlight-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin: 22px 0; font-size: 13.5px; line-height: 1.5; color: #1e40af; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ TechMart Support</h1>
      <p>Official Product Exchange Confirmation</p>
      <div class="badge-exchange">✓ Exchange Request Registered</div>
    </div>
    <div class="content">
      <div class="greeting">
        Hello <b>${order.customer}</b>,<br><br>
        Your exchange request for Order <b>${order.orderId}</b> has been received and processed.
      </div>

      <div class="highlight-card">
        <div class="highlight-row">
          <span class="label">Order ID:</span>
          <span class="value">${order.orderId}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Original Item:</span>
          <span class="value">${order.modelName || order.product}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Replacement Item:</span>
          <span class="value">${replacementProduct}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Delivery Address:</span>
          <span class="value">${shippingAddress}</span>
        </div>
        <div class="highlight-row">
          <span class="label">Reference ID:</span>
          <span class="value" style="font-family: monospace;">${transactionRef}</span>
        </div>
      </div>

      <div class="info-box">
        🔄 <b>Next Steps for Exchange:</b><br>
        Our courier partner will deliver your replacement <b>${replacementProduct}</b> within <b>2 to 4 business days</b> and pick up your return package. Please ensure the original item is packaged with all original accessories.
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} TechMart Online Store, Inc. • 100 Tech Blvd, Austin, TX 78701<br>
      This is an automated system confirmation generated by TechMart AI Agent.
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailRecord: RefundEmail = {
    id: `EMAIL-${Date.now().toString().slice(-6)}`,
    orderId: order.orderId,
    customerName: order.customer,
    customerEmail: targetEmail,
    productName: replacementProduct,
    refundAmount: 0,
    bankName: 'Product Exchange',
    accountNumber: order.mobileNumber || 'N/A',
    transactionRef,
    timestamp: dateStr,
    subject: `⚡ Product Exchange Confirmed: Order #${order.orderId} (${replacementProduct})`,
    bodyHtml,
    emailType: 'exchange_confirmation'
  };

  dispatchedEmails.unshift(emailRecord);

  logInteraction({
    type: 'email_dispatched',
    customerName: order.customer,
    orderId: order.orderId,
    details: `Exchange confirmation email dispatched to ${targetEmail} for Order ${order.orderId} (Replacement: ${replacementProduct}).`,
    statusBadge: 'EMAIL SENT'
  });

  return emailRecord;
}

export function getDispatchedEmails(): RefundEmail[] {
  return dispatchedEmails;
}
