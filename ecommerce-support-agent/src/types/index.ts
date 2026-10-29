export interface Product {
  id: string;
  category: string;
  brand: string;
  modelName: string;
  keySpecifications: string;
  bestFor: string;
  price: number;
  stock: number;
  discountEligible?: boolean;
}

export interface Order {
  orderId: string;
  customer: string;
  modelName: string;
  product: string;
  category: string;
  daysAgo: number;
  status: string;
  shippingAddress?: string;
  mobileNumber?: string;
  customerEmail?: string;
  orderDate?: string;
  price?: number;
}

export interface BankDetail {
  orderId: string;
  customer: string;
  product: string;
  bankName: string;
  accountNumber: string;
  mobileNumber: string;
  customerEmail?: string;
  accountTitle?: string;
}

export interface RefundEvaluation {
  orderId: string;
  customer: string;
  product: string;
  category: string;
  daysAgo: number;
  isEligible: boolean;
  reason: string;
  policyClause: string;
  refundAmount: number;
  status: 'Approved' | 'Rejected' | 'Manual Review' | 'Already Processed';
  bankDetails?: BankDetail;
  emailDispatched?: boolean;
}

export interface RefundEmail {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  refundAmount: number;
  bankName: string;
  accountNumber: string;
  transactionRef: string;
  timestamp: string;
  subject: string;
  bodyHtml: string;
  emailType?: 'refund_confirmation' | 'order_confirmation' | 'exchange_confirmation';
}

export interface InteractionLog {
  id: string;
  timestamp: string;
  type: 'chat_query' | 'product_search' | 'order_lookup' | 'refund_evaluation' | 'refund_processed' | 'email_dispatched';
  customerName?: string;
  orderId?: string;
  details: string;
  statusBadge: string;
}

export interface PolicyData {
  rawText: string;
  htmlContent: string;
  sections: {
    id: string;
    title: string;
    content: string;
  }[];
  lastLoaded: string;
  fileName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  contextSources?: string[];
  productCard?: Product;
  orderCard?: Order;
  refundResult?: RefundEvaluation;
  emailPreview?: RefundEmail;
  actions?: {
    label: string;
    action: string;
    payload?: any;
  }[];
}
