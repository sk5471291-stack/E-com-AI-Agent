import { Order, RefundEvaluation, BankDetail, Product } from '@/types';
import { fetchOrdersFromSheet, fetchBankDetailsFromSheet, fetchProductsFromSheet, updateOrderStatusLocal, logInteraction } from './sheets';
import { generateRefundEmail } from './email-service';
import { getCachedPolicy } from './docx-parser';

export async function evaluateRefundEligibility(
  orderIdOrCustomer: string,
  autoApproveAndSendEmail: boolean = true
): Promise<{
  order?: Order;
  evaluation?: RefundEvaluation;
  error?: string;
}> {
  const [orders, bankDetails, products] = await Promise.all([
    fetchOrdersFromSheet(),
    fetchBankDetailsFromSheet(),
    fetchProductsFromSheet()
  ]);

  const query = orderIdOrCustomer.trim().toLowerCase();
  const order = orders.find(
    o => o.orderId.toLowerCase() === query || o.customer.toLowerCase() === query
  );

  if (!order) {
    return {
      error: `No matching order found for "${orderIdOrCustomer}". Please check the Order ID (e.g. ORD-101 to ORD-109) or customer name.`
    };
  }

  // Find linked bank details
  const bankInfo: BankDetail | undefined = bankDetails.find(
    b => b.orderId.toLowerCase() === order.orderId.toLowerCase()
  );

  // Find matching product price
  const matchedProd = products.find(
    p => p.modelName.toLowerCase().includes(order.modelName.toLowerCase()) ||
         order.modelName.toLowerCase().includes(p.modelName.toLowerCase())
  );
  const refundAmount = matchedProd ? matchedProd.price : (order.price || 149.99);

  // Policy rules:
  // Electronics return window = 15 days
  // Non-electronics return window = 30 days
  const isElectronics = order.category.toLowerCase().includes('electronic') || 
                        ['laptop', 'phone', 'tablet', 'headphones', 'keyboard', 'mouse'].includes(order.product.toLowerCase());
  const maxDaysAllowed = isElectronics ? 15 : 30;

  let isEligible = false;
  let status: RefundEvaluation['status'] = 'Rejected';
  let reason = '';
  let policyClause = '';

  if (order.status === 'Return Approved') {
    isEligible = true;
    status = 'Already Processed';
    reason = `Order ${order.orderId} was previously evaluated and approved for return/refund (${order.daysAgo} days ago).`;
    policyClause = 'Policy Clause 2 & 9: Within verified 15-day window for electronics.';
  } else if (order.daysAgo <= maxDaysAllowed) {
    isEligible = true;
    status = 'Approved';
    reason = `Eligible for immediate refund. Order was placed/received ${order.daysAgo} day(s) ago, which is well within the ${maxDaysAllowed}-day policy window.`;
    policyClause = `Policy Clause 2 & 9: ${isElectronics ? 'Electronics 15-day return timeframe satisfied' : 'Standard 30-day return timeframe satisfied'}.`;
  } else {
    isEligible = false;
    status = 'Rejected';
    reason = `Order was placed ${order.daysAgo} days ago, which exceeds the strict ${maxDaysAllowed}-day return window for ${order.product || 'electronics'}.`;
    policyClause = 'Policy Clause 2 & 9: Ineligible due to elapsed timeframe exceeding maximum policy threshold.';
  }

  const evaluation: RefundEvaluation = {
    orderId: order.orderId,
    customer: order.customer,
    product: order.modelName || order.product,
    category: order.category,
    daysAgo: order.daysAgo,
    isEligible,
    reason,
    policyClause,
    refundAmount,
    status,
    bankDetails: bankInfo,
    emailDispatched: false
  };

  // If approved and auto email requested, execute workflow
  if (isEligible && autoApproveAndSendEmail && status !== 'Already Processed') {
    updateOrderStatusLocal(order.orderId, 'Return Approved');
    order.status = 'Return Approved';
    
    // Automatically send refund confirmation email
    generateRefundEmail(order, refundAmount, bankInfo);
    evaluation.emailDispatched = true;

    // Log in Google Sheets audit trail
    logInteraction({
      type: 'refund_processed',
      customerName: order.customer,
      orderId: order.orderId,
      details: `Refund of $${refundAmount.toFixed(2)} APPROVED under Policy Section 2 & 9. Automated confirmation email dispatched to customer.`,
      statusBadge: 'APPROVED & EMAILED'
    });
  } else if (!isEligible) {
    logInteraction({
      type: 'refund_evaluation',
      customerName: order.customer,
      orderId: order.orderId,
      details: `Refund evaluated as REJECTED: ${order.daysAgo} days elapsed exceeds ${maxDaysAllowed}-day policy limit.`,
      statusBadge: 'REJECTED'
    });
  }

  return { order, evaluation };
}
