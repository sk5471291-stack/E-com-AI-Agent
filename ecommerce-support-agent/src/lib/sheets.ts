import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Product, Order, BankDetail, InteractionLog } from '@/types';

export const SHEET_ID_PRODUCTS = process.env.SHEET_ID_PRODUCTS || '1PO1hBFvYwMzIr79qGVdiuZpSTgyW72AGEI8LlSPkGlw';
export const SHEET_ID_ORDERS = process.env.SHEET_ID_ORDERS || '16ZP9_maMi2Hq5y6lsJ1jVEYzjA_nz5i2Ru8c3zPU6AQ';
export const SHEET_ID_BANK = process.env.SHEET_ID_BANK || '1MVZZaGEKqwbcsTjcGiy0R6DszgHDKKxjxV4E2IDEqr4';

export const SERVICE_ACCOUNT_EMAIL = 'e-com-ai-agent@blissful-star-512209-k1.iam.gserviceaccount.com';

// Fallback products dataset (matches sheet)
const FALLBACK_PRODUCTS: Product[] = [
  { id: 'PROD-1', category: 'Laptop', brand: 'Apple', modelName: 'MacBook Air M3', keySpecifications: '13.6", Apple M3, 16GB RAM, 512GB SSD', bestFor: 'Students & Professionals', price: 799.99, stock: 8 },
  { id: 'PROD-2', category: 'Laptop', brand: 'Dell', modelName: 'XPS 15 9530', keySpecifications: 'Intel Core i7, RTX 4050, 16GB RAM', bestFor: 'Creators & Office Work', price: 149.99, stock: 0 },
  { id: 'PROD-3', category: 'Laptop', brand: 'Lenovo', modelName: 'Legion Pro 5', keySpecifications: 'Ryzen 9, RTX 4070, 32GB RAM', bestFor: 'Gaming', price: 499.99, stock: 15 },
  { id: 'PROD-4', category: 'Laptop', brand: 'HP', modelName: 'Spectre x360 14', keySpecifications: 'OLED Touchscreen, Intel Evo', bestFor: 'Business & Travel', price: 329.99, stock: 4 },
  { id: 'PROD-5', category: 'Headphones', brand: 'Sony', modelName: 'WH-1000XM5', keySpecifications: 'Noise Cancelling, 30hr Battery', bestFor: 'Music & Travel', price: 59.99, stock: 22 },
  { id: 'PROD-6', category: 'Headphones', brand: 'Apple', modelName: 'AirPods Max', keySpecifications: 'Spatial Audio, Premium Build', bestFor: 'Apple Ecosystem', price: 29.99, stock: 35 },
  { id: 'PROD-7', category: 'Headphones', brand: 'Bose', modelName: 'QuietComfort Ultra', keySpecifications: 'ANC, Comfortable Fit', bestFor: 'Frequent Travelers', price: 799.99, stock: 8 },
  { id: 'PROD-8', category: 'Phone', brand: 'Samsung', modelName: 'Galaxy S25 Ultra', keySpecifications: 'Snapdragon 8 Gen 4, 200MP Camera', bestFor: 'Photography', price: 149.99, stock: 0 },
  { id: 'PROD-9', category: 'Phone', brand: 'Apple', modelName: 'iPhone 16 Pro Max', keySpecifications: 'A18 Pro Chip, Titanium Design', bestFor: 'Premium Users', price: 499.99, stock: 15 },
  { id: 'PROD-10', category: 'Phone', brand: 'Google', modelName: 'Pixel 9 Pro', keySpecifications: 'AI Features, Excellent Camera', bestFor: 'Android Users', price: 329.99, stock: 4 },
  { id: 'PROD-11', category: 'Phone', brand: 'OnePlus', modelName: 'OnePlus 13', keySpecifications: 'Fast Charging, AMOLED Display', bestFor: 'Performance', price: 59.99, stock: 22 },
  { id: 'PROD-12', category: 'Tablet', brand: 'Apple', modelName: 'iPad Pro M4', keySpecifications: 'OLED Display, Apple Pencil Pro', bestFor: 'Designers', price: 29.99, stock: 35 },
  { id: 'PROD-13', category: 'Tablet', brand: 'Samsung', modelName: 'Galaxy Tab S10 Ultra', keySpecifications: '14.6" AMOLED, S-Pen', bestFor: 'Entertainment', price: 850.00, stock: 25 },
  { id: 'PROD-14', category: 'Tablet', brand: 'Xiaomi', modelName: 'Pad 7 Pro', keySpecifications: 'Snapdragon Processor, 144Hz', bestFor: 'Budget Premium', price: 149.99, stock: 0 },
  { id: 'PROD-15', category: 'Keyboard', brand: 'Logitech', modelName: 'MX Keys S', keySpecifications: 'Wireless, Backlit Keys', bestFor: 'Productivity', price: 499.99, stock: 15 },
  { id: 'PROD-16', category: 'Keyboard', brand: 'Keychron', modelName: 'Keychron K8 Pro', keySpecifications: 'Mechanical, Hot-Swappable', bestFor: 'Programmers', price: 329.99, stock: 4 },
  { id: 'PROD-17', category: 'Keyboard', brand: 'Razer', modelName: 'BlackWidow V4', keySpecifications: 'RGB Mechanical Keyboard', bestFor: 'Gamers', price: 59.99, stock: 22 },
  { id: 'PROD-18', category: 'Mouse', brand: 'Logitech', modelName: 'MX Master 3S', keySpecifications: 'Ergonomic, Silent Clicks', bestFor: 'Office & Editing', price: 29.99, stock: 35 },
  { id: 'PROD-19', category: 'Mouse', brand: 'Razer', modelName: 'DeathAdder V3 Pro', keySpecifications: 'Lightweight, Wireless Gaming', bestFor: 'Esports', price: 499.99, stock: 4 },
  { id: 'PROD-20', category: 'Mouse', brand: 'SteelSeries', modelName: 'Aerox 5 Wireless', keySpecifications: 'Ultra-Lightweight, RGB', bestFor: 'Gaming & Streaming', price: 329.99, stock: 22 },
];

const FALLBACK_ORDERS: Order[] = [
  { orderId: 'ORD-101', customer: 'Ali', modelName: 'MacBook Air M3', product: 'laptop', category: 'electronics', shippingAddress: 'Lahore DHA', mobileNumber: '03001234567', customerEmail: 'ali@gmail.com', daysAgo: 5, status: 'Return Approved', price: 799.99 },
  { orderId: 'ORD-102', customer: 'Sara', modelName: 'WH-1000XM5', product: 'headphones', category: 'electronics', shippingAddress: 'Karachi Clifton', mobileNumber: '03211234567', customerEmail: 'sara@gmail.com', daysAgo: 18, status: 'Pending Review', price: 59.99 },
  { orderId: 'ORD-103', customer: 'John', modelName: 'Galaxy S25 Ultra', product: 'phone', category: 'electronics', shippingAddress: 'Islamabad F-7', mobileNumber: '03009876543', customerEmail: 'john@gmail.com', daysAgo: 3, status: 'Return Approved', price: 149.99 },
  { orderId: 'ORD-104', customer: 'Mia', modelName: 'Galaxy Tab S10 Ultra', product: 'tablet', category: 'electronics', shippingAddress: 'Rawalpindi Saddar', mobileNumber: '03335551234', customerEmail: 'mia@gmail.com', daysAgo: 22, status: 'Pending Review', price: 850.00 },
  { orderId: 'ORD-105', customer: 'Abis', modelName: 'WH-1000XM5', product: 'headphones', category: 'electronics', shippingAddress: 'Lahore Gulberg', mobileNumber: '03004445566', customerEmail: 'abis@gmail.com', daysAgo: 18, status: 'Pending Review', price: 59.99 },
  { orderId: 'ORD-106', customer: 'Syed', modelName: 'Galaxy S25 Ultra', product: 'phone', category: 'electronics', shippingAddress: 'Karachi PECHS', mobileNumber: '03362507273', customerEmail: 'syed@gmail.com', daysAgo: 7, status: 'Return Approved', price: 149.99 },
  { orderId: 'ORD-107', customer: 'Hussain', modelName: 'WH-1000XM5', product: 'headphones', category: 'electronics', shippingAddress: 'Multan Cantt', mobileNumber: '03362507273', customerEmail: 'hussain@gmail.com', daysAgo: 10, status: 'Return Approved', price: 59.99 },
  { orderId: 'ORD-108', customer: 'Abis', modelName: 'MacBook Air M3', product: 'laptop', category: 'electronics', shippingAddress: 'Lahore Model Town', mobileNumber: '03001112233', customerEmail: 'abis.tech@gmail.com', daysAgo: 0, status: 'Order Placed', price: 799.99 },
  { orderId: 'ORD-109', customer: 'Ayyan', modelName: 'Keychron K8 Pro', product: 'keyboard', category: 'electronics', shippingAddress: 'Faisalabad City', mobileNumber: '03007778899', customerEmail: 'ayyan@gmail.com', daysAgo: 0, status: 'Order Placed', price: 329.99 },
];

const FALLBACK_BANK_DETAILS: BankDetail[] = [
  { orderId: 'ORD-103', customer: 'John', product: 'phone', bankName: 'Meezan Bank', accountNumber: '9876543210', mobileNumber: '03009876543' },
  { orderId: 'ORD-106', customer: 'Syed', product: 'phone', bankName: 'HabibMetro', accountNumber: '423423423423', mobileNumber: '03362507273' },
  { orderId: 'ORD-107', customer: 'Hussain', product: 'headphones', bankName: 'Meezan Bank', accountNumber: 'MEZN-123-123-42123', mobileNumber: '03362507273' },
  { orderId: 'ORD-101', customer: 'Ali', product: 'laptop', bankName: 'Habib Metro', accountNumber: '34123123412', mobileNumber: '312312312312' },
];

// In-memory runtime state
let runtimeProducts: Product[] = [...FALLBACK_PRODUCTS];
let runtimeOrders: Order[] = [...FALLBACK_ORDERS];
let runtimeBankDetails: BankDetail[] = [...FALLBACK_BANK_DETAILS];
let runtimeLogs: InteractionLog[] = [
  {
    id: 'LOG-INIT-1',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'order_lookup',
    customerName: 'System',
    orderId: 'SYS-INIT',
    details: 'Google Sheets integration initialized with Service Account & Live API v4.',
    statusBadge: 'SYNCHRONIZED'
  }
];

// Token Cache
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtain an OAuth2 Bearer token using the service account credentials
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  try {
    const candidatePaths = [
      process.env.GOOGLE_SERVICE_ACCOUNT_FILE ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_FILE) : '',
      path.join(process.cwd(), 'blissful-star-512209-k1-ce22a583e015.json'),
      path.join(process.cwd(), '..', 'blissful-star-512209-k1-ce22a583e015.json'),
      'd:/Datacrumb/RAG chatbot/blissful-star-512209-k1-ce22a583e015.json'
    ].filter(Boolean);

    let keyFilePath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        keyFilePath = p;
        break;
      }
    }

    if (!keyFilePath) {
      console.warn('Google service account key file not found in paths:', candidatePaths);
      return null;
    }

    const sa = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claimSet = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${claimSet}`);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${header}.${claimSet}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!res.ok) {
      console.warn('Failed to obtain Google OAuth2 token:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      cachedAccessToken = {
        token: data.access_token,
        expiresAt: now + (data.expires_in || 3600)
      };
      return data.access_token;
    }
  } catch (err) {
    console.warn('Error reading service account or fetching token:', err);
  }
  return null;
}

/**
 * Fetch Products from Google Sheet (Sheet2 with gid 515198597)
 */
export async function fetchProductsFromSheet(): Promise<Product[]> {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_PRODUCTS}/values/Sheet2!A1:G100`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const rows: string[][] = data.values || [];
        if (rows.length >= 2) {
          const list: Product[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length >= 3) {
              list.push({
                id: `PROD-${i}`,
                category: row[0] || 'Uncategorized',
                brand: row[1] || 'Generic',
                modelName: row[2] || 'Item',
                keySpecifications: row[3] || '',
                bestFor: row[4] || '',
                price: parseFloat(row[5]) || 0,
                stock: parseInt(row[6], 10) || 0,
                discountEligible: true
              });
            }
          }
          if (list.length > 0) {
            runtimeProducts = list;
            return list;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Live Google Sheets product fetch failed, using runtime fallback:', err);
  }
  return runtimeProducts.length > 0 ? runtimeProducts : FALLBACK_PRODUCTS;
}

/**
/**
 * Fetch Orders from Google Sheet (Sheet1 with gid 0)
 * Order Sheet columns:
 * A: order_id | B: customer | C: Model Name | D: product | E: Shipping Adress | F: Mobile number | G: Status | H: days_ago | I: gmail adress
 */
export async function fetchOrdersFromSheet(): Promise<Order[]> {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ORDERS}/values/Sheet1!A1:I100`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const rows: string[][] = data.values || [];
        if (rows.length >= 2) {
          const list: Order[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length >= 2) {
              const orderId = (row[0] || `ORD-${100 + i}`).trim();
              list.push({
                orderId,
                customer: row[1] || 'Customer',
                modelName: row[2] || '',
                product: row[3] || '',
                category: 'electronics',
                shippingAddress: row[4] || '',
                mobileNumber: row[5] || '',
                status: row[6] || 'Order Placed',
                daysAgo: parseInt(row[7], 10) || 0,
                customerEmail: row[8] || ''
              });
            }
          }
          if (list.length > 0) {
            runtimeOrders = list;
            return list;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Live Google Sheets orders fetch failed, using runtime orders:', err);
  }
  return runtimeOrders;
}

/**
 * Compute the next sequential Order ID (e.g. ORD-110, ORD-111)
 */
export function getNextOrderId(ordersList?: Order[]): string {
  const currentOrders = ordersList && ordersList.length > 0 ? ordersList : runtimeOrders;
  let maxNum = 100;
  for (const o of currentOrders) {
    const m = o.orderId.match(/^ORD-(\d+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `ORD-${maxNum + 1}`;
}

/**
 * Fetch Bank Details from Google Sheet (Sheet1 with gid 0)
 * Columns: A: order_id | B: customer | C: product | D: Bank_Name | E: Account Number | F: Mobile Number
 */
export async function fetchBankDetailsFromSheet(): Promise<BankDetail[]> {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_BANK}/values/Sheet1!A1:F100`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const rows: string[][] = data.values || [];
        if (rows.length >= 2) {
          const list: BankDetail[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length >= 3) {
              list.push({
                orderId: row[0] || '',
                customer: row[1] || '',
                product: row[2] || '',
                bankName: row[3] || 'Bank',
                accountNumber: row[4] || '',
                mobileNumber: row[5] || ''
              });
            }
          }
          if (list.length > 0) {
            runtimeBankDetails = list;
            return list;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Live Google Sheets bank fetch failed, using runtime bank details:', err);
  }
  return runtimeBankDetails;
}

/**
 * Update Order details (customer name, shipping address, mobile number, status, etc.)
 * in runtime state and directly in live Google Sheet
 */
export async function updateOrderDetails(
  orderId: string,
  updates: {
    customer?: string;
    modelName?: string;
    product?: string;
    shippingAddress?: string;
    mobileNumber?: string;
    customerEmail?: string;
    status?: string;
    daysAgo?: number;
  }
): Promise<{
  success: boolean;
  syncedToGoogleSheet: boolean;
  order?: Order;
  note?: string;
}> {
  const normId = orderId.trim().toUpperCase();
  let existingOrder = runtimeOrders.find(o => o.orderId.toUpperCase() === normId);

  if (existingOrder) {
    if (updates.customer !== undefined && updates.customer.trim()) existingOrder.customer = updates.customer.trim();
    if (updates.modelName !== undefined && updates.modelName.trim()) existingOrder.modelName = updates.modelName.trim();
    if (updates.product !== undefined && updates.product.trim()) existingOrder.product = updates.product.trim();
    if (updates.shippingAddress !== undefined && updates.shippingAddress.trim()) existingOrder.shippingAddress = updates.shippingAddress.trim();
    if (updates.mobileNumber !== undefined && updates.mobileNumber.trim()) existingOrder.mobileNumber = updates.mobileNumber.trim();
    if (updates.customerEmail !== undefined && updates.customerEmail.trim()) existingOrder.customerEmail = updates.customerEmail.trim();
    if (updates.status !== undefined && updates.status.trim()) existingOrder.status = updates.status.trim();
    if (updates.daysAgo !== undefined) existingOrder.daysAgo = updates.daysAgo;
  } else {
    existingOrder = {
      orderId: normId,
      customer: updates.customer || 'Customer',
      modelName: updates.modelName || 'Order Item',
      product: updates.product || 'item',
      category: 'electronics',
      daysAgo: updates.daysAgo !== undefined ? updates.daysAgo : 0,
      status: updates.status || 'Order Placed',
      shippingAddress: updates.shippingAddress || '',
      mobileNumber: updates.mobileNumber || '',
      customerEmail: updates.customerEmail || ''
    };
    runtimeOrders.push(existingOrder);
  }

  let synced = false;
  let note = '';

  try {
    const token = await getGoogleAccessToken();
    if (token) {
      // Find row index in live sheet
      const getRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ORDERS}/values/Sheet1!A1:I100`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
      );

      if (getRes.ok) {
        const data = await getRes.json();
        const rows: string[][] = data.values || [];
        let rowIndex = -1;
        let existingRow: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i][0] && rows[i][0].trim().toUpperCase() === normId) {
            rowIndex = i + 1;
            existingRow = rows[i];
            break;
          }
        }

        const customerVal = updates.customer ?? (existingRow[1] || existingOrder.customer);
        const modelVal = updates.modelName ?? (existingRow[2] || existingOrder.modelName);
        const productVal = updates.product ?? (existingRow[3] || existingOrder.product);
        const addressVal = updates.shippingAddress ?? (existingRow[4] || existingOrder.shippingAddress || '');
        const rawMobile = updates.mobileNumber ?? (existingRow[5] || existingOrder.mobileNumber || '');
        const mobileVal = rawMobile ? (rawMobile.startsWith('0') && !rawMobile.startsWith("'") ? `'${rawMobile}` : rawMobile) : '';
        const statusVal = updates.status ?? (existingRow[6] || existingOrder.status);
        const daysVal = updates.daysAgo !== undefined ? updates.daysAgo.toString() : (existingRow[7] || existingOrder.daysAgo.toString());
        const emailVal = updates.customerEmail ?? (existingRow[8] || existingOrder.customerEmail || '');

        if (rowIndex > 0) {
          // Update existing row
          const putRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ORDERS}/values/Sheet1!A${rowIndex}:I${rowIndex}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                range: `Sheet1!A${rowIndex}:I${rowIndex}`,
                majorDimension: 'ROWS',
                values: [[normId, customerVal, modelVal, productVal, addressVal, mobileVal, statusVal, daysVal, emailVal]]
              })
            }
          );

          if (putRes.ok) {
            synced = true;
            note = `Directly updated Order Google Sheet row ${rowIndex} for ${normId}.`;
          } else {
            const errBody = await putRes.text();
            console.warn('Order Sheet update error:', putRes.status, errBody);
            note = `Updated in session (${errBody.slice(0, 80)}).`;
          }
        } else {
          // Directly write to next row index (rows.length + 1)
          const nextRow = rows.length + 1;
          const putRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ORDERS}/values/Sheet1!A${nextRow}:I${nextRow}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                range: `Sheet1!A${nextRow}:I${nextRow}`,
                majorDimension: 'ROWS',
                values: [[normId, customerVal, modelVal, productVal, addressVal, mobileVal, statusVal, daysVal, emailVal]]
              })
            }
          );

          if (putRes.ok) {
            synced = true;
            note = `Directly added new Order ${normId} to Google Sheet row ${nextRow}.`;
          } else {
            // Fallback to append endpoint
            const appendRes = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_ORDERS}/values/Sheet1!A1:I1:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  range: 'Sheet1!A1:I1',
                  majorDimension: 'ROWS',
                  values: [[normId, customerVal, modelVal, productVal, addressVal, mobileVal, statusVal, daysVal, emailVal]]
                })
              }
            );

            if (appendRes.ok) {
              synced = true;
              note = `Appended new Order ${normId} to Google Sheet.`;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Google Sheet Order update error:', err.message);
  }

  logInteraction({
    type: 'order_lookup',
    orderId: normId,
    customerName: updates.customer || existingOrder.customer,
    details: `Order ${normId} details updated (Address: "${existingOrder.shippingAddress || 'N/A'}", Mobile: "${existingOrder.mobileNumber || 'N/A'}", Gmail: "${existingOrder.customerEmail || 'N/A'}", Status: "${existingOrder.status}"). ${synced ? 'Synced to Google Sheet.' : note}`,
    statusBadge: synced ? 'SHEET SYNCED' : 'LOCAL UPDATED'
  });

  return { success: true, syncedToGoogleSheet: synced, order: existingOrder, note };
}

/**
 * Update Order status in runtime and attempt direct update to Google Sheet
 */
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<{
  success: boolean;
  syncedToGoogleSheet: boolean;
  note?: string;
}> {
  return updateOrderDetails(orderId, { status: newStatus });
}

/**
 * Update Product stock or price in runtime and direct in Google Sheets
 */
export async function updateProductStock(
  modelNameOrKeyword: string,
  newStock?: number,
  newPrice?: number
): Promise<{ success: boolean; syncedToGoogleSheet: boolean; product?: Product; note?: string }> {
  const norm = modelNameOrKeyword.toLowerCase().trim();
  const prod = runtimeProducts.find(
    p => p.modelName.toLowerCase().includes(norm) || p.brand.toLowerCase().includes(norm)
  );

  if (!prod) {
    return { success: false, syncedToGoogleSheet: false, note: `Product "${modelNameOrKeyword}" not found.` };
  }

  if (typeof newStock === 'number') prod.stock = newStock;
  if (typeof newPrice === 'number') prod.price = newPrice;

  let synced = false;
  let note = '';

  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const getRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_PRODUCTS}/values/Sheet2!C1:C50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (getRes.ok) {
        const data = await getRes.json();
        const rows: string[][] = data.values || [];
        let rowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i][0] && rows[i][0].toLowerCase().includes(norm)) {
            rowIndex = i + 1;
            break;
          }
        }

        if (rowIndex > 0) {
          const valuesToUpdate: string[] = [];
          let range = '';
          if (typeof newPrice === 'number' && typeof newStock === 'number') {
            range = `Sheet2!F${rowIndex}:G${rowIndex}`;
            valuesToUpdate.push(newPrice.toString(), newStock.toString());
          } else if (typeof newStock === 'number') {
            range = `Sheet2!G${rowIndex}`;
            valuesToUpdate.push(newStock.toString());
          } else if (typeof newPrice === 'number') {
            range = `Sheet2!F${rowIndex}`;
            valuesToUpdate.push(newPrice.toString());
          }

          if (range) {
            const putRes = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_PRODUCTS}/values/${range}?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  range,
                  majorDimension: 'ROWS',
                  values: [valuesToUpdate]
                })
              }
            );
            if (putRes.ok) {
              synced = true;
              note = `Directly updated Google Sheet for "${prod.modelName}".`;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Google Sheet Product update error:', err.message);
  }

  logInteraction({
    type: 'product_search',
    details: `Product "${prod.modelName}" updated: Stock=${prod.stock}, Price=$${prod.price}. ${synced ? 'Synced to Google Sheet.' : note}`,
    statusBadge: synced ? 'SHEET SYNCED' : 'LOCAL UPDATED'
  });

  return { success: true, syncedToGoogleSheet: synced, product: prod, note };
}

/**
 * Add or update Bank details in runtime and directly in live Google Sheet
 */
export async function addOrUpdateBankDetail(detail: BankDetail): Promise<{
  success: boolean;
  syncedToGoogleSheet: boolean;
  note?: string;
}> {
  const normId = detail.orderId.trim().toUpperCase();
  const idx = runtimeBankDetails.findIndex(b => b.orderId.toUpperCase() === normId);
  if (idx !== -1) {
    runtimeBankDetails[idx] = { ...runtimeBankDetails[idx], ...detail, orderId: normId };
  } else {
    runtimeBankDetails.push({ ...detail, orderId: normId });
  }

  let synced = false;
  let note = '';

  try {
    const token = await getGoogleAccessToken();
    if (token) {
      // Check if orderId row already exists in Bank Details sheet
      const getRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_BANK}/values/Sheet1!A1:A50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let existingRowIndex = -1;
      if (getRes.ok) {
        const data = await getRes.json();
        const rows: string[][] = data.values || [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i][0] && rows[i][0].trim().toUpperCase() === normId) {
            existingRowIndex = i + 1;
            break;
          }
        }
      }

      const mobFmt = (detail.mobileNumber && detail.mobileNumber.startsWith('0') && !detail.mobileNumber.startsWith("'")) ? `'${detail.mobileNumber}` : (detail.mobileNumber || '');
      const accFmt = (detail.accountNumber && detail.accountNumber.startsWith('0') && !detail.accountNumber.startsWith("'")) ? `'${detail.accountNumber}` : (detail.accountNumber || '');

      const rowValues = [[
        normId,
        detail.customer || '',
        detail.product || '',
        detail.bankName || 'Bank',
        accFmt,
        mobFmt
      ]];

      if (existingRowIndex > 0) {
        // Update existing row
        const putRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_BANK}/values/Sheet1!A${existingRowIndex}:F${existingRowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: `Sheet1!A${existingRowIndex}:F${existingRowIndex}`,
              majorDimension: 'ROWS',
              values: rowValues
            })
          }
        );
        if (putRes.ok) {
          synced = true;
          note = `Updated existing Bank Details row ${existingRowIndex} in Google Sheet.`;
        }
      } else {
        // Append new row
        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_BANK}/values/Sheet1!A1:F1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: 'Sheet1!A1:F1',
              majorDimension: 'ROWS',
              values: rowValues
            })
          }
        );
        if (appendRes.ok) {
          synced = true;
          note = 'Appended to live Bank Details Google Sheet.';
        } else if (appendRes.status === 403) {
          note = `Saved in session. To sync directly to Google Sheet, invite ${SERVICE_ACCOUNT_EMAIL} as Editor.`;
        }
      }
    }
  } catch (err: any) {
    console.warn('Bank detail sync error:', err.message);
  }

  logInteraction({
    type: 'refund_processed',
    orderId: normId,
    customerName: detail.customer,
    details: `Bank details for ${detail.customer} (${detail.bankName}, A/C: ${detail.accountNumber}): ${synced ? 'Synced to Google Sheet' : note}`,
    statusBadge: synced ? 'SHEET SYNCED' : 'LOCAL UPDATED'
  });

  return { success: true, syncedToGoogleSheet: synced, note };
}

export function updateOrderStatusLocal(orderId: string, newStatus: string): boolean {
  updateOrderStatus(orderId, newStatus);
  return true;
}

export function logInteraction(log: Omit<InteractionLog, 'id' | 'timestamp'>): InteractionLog {
  const entry: InteractionLog = {
    id: `LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...log
  };
  runtimeLogs.unshift(entry);
  if (runtimeLogs.length > 50) runtimeLogs.pop();
  return entry;
}

export function getInteractionLogs(): InteractionLog[] {
  return runtimeLogs;
}

export function getRuntimeData() {
  return {
    products: runtimeProducts,
    orders: runtimeOrders,
    bankDetails: runtimeBankDetails,
    logs: runtimeLogs
  };
}

export function getGoogleSheetsMetadata() {
  return {
    serviceAccount: SERVICE_ACCOUNT_EMAIL,
    sheets: [
      {
        type: 'products',
        name: 'Products Catalog',
        id: SHEET_ID_PRODUCTS,
        tab: 'Sheet2',
        gid: '515198597',
        status: 'Connected (Read & Write)',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID_PRODUCTS}/edit?gid=515198597#gid=515198597`
      },
      {
        type: 'orders',
        name: 'Customer Orders',
        id: SHEET_ID_ORDERS,
        tab: 'Sheet1',
        gid: '0',
        status: 'Connected (Live Read & Auto-Sync)',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID_ORDERS}/edit?gid=0#gid=0`
      },
      {
        type: 'bank',
        name: 'Bank Details',
        id: SHEET_ID_BANK,
        tab: 'Sheet1',
        gid: '0',
        status: 'Connected (Live Read & Auto-Sync)',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID_BANK}/edit?gid=0#gid=0`
      }
    ]
  };
}
