import { NextRequest, NextResponse } from 'next/server';
import {
  fetchProductsFromSheet,
  fetchOrdersFromSheet,
  fetchBankDetailsFromSheet,
  getInteractionLogs,
  updateOrderStatus,
  updateOrderDetails,
  updateProductStock,
  addOrUpdateBankDetail,
  logInteraction,
  getGoogleSheetsMetadata
} from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    if (type === 'metadata') {
      return NextResponse.json({ success: true, data: getGoogleSheetsMetadata() });
    }

    if (type === 'products') {
      const products = await fetchProductsFromSheet();
      return NextResponse.json({ success: true, data: products });
    }

    if (type === 'orders') {
      const orders = await fetchOrdersFromSheet();
      return NextResponse.json({ success: true, data: orders });
    }

    if (type === 'bank') {
      const bank = await fetchBankDetailsFromSheet();
      return NextResponse.json({ success: true, data: bank });
    }

    if (type === 'logs') {
      const logs = getInteractionLogs();
      return NextResponse.json({ success: true, data: logs });
    }

    const [products, orders, bank] = await Promise.all([
      fetchProductsFromSheet(),
      fetchOrdersFromSheet(),
      fetchBankDetailsFromSheet()
    ]);
    const logs = getInteractionLogs();
    const metadata = getGoogleSheetsMetadata();

    return NextResponse.json({
      success: true,
      data: {
        products,
        orders,
        bankDetails: bank,
        logs,
        metadata
      }
    });
  } catch (error: any) {
    console.error('Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, status, modelName, stock, price, bankDetail, logData, orderUpdates } = body;

    if (action === 'update_order' && orderId) {
      const res = await updateOrderDetails(orderId, orderUpdates || {});
      return NextResponse.json({ success: res.success, syncedToGoogleSheet: res.syncedToGoogleSheet, order: res.order, note: res.note });
    }

    if (action === 'update_status' && orderId && status) {
      const res = await updateOrderStatus(orderId, status);
      return NextResponse.json({ success: res.success, syncedToGoogleSheet: res.syncedToGoogleSheet, note: res.note });
    }

    if (action === 'update_product' && modelName) {
      const res = await updateProductStock(modelName, stock, price);
      return NextResponse.json({ success: res.success, syncedToGoogleSheet: res.syncedToGoogleSheet, note: res.note });
    }

    if (action === 'add_bank' && bankDetail) {
      const res = await addOrUpdateBankDetail(bankDetail);
      return NextResponse.json({ success: res.success, syncedToGoogleSheet: res.syncedToGoogleSheet, note: res.note });
    }

    if (action === 'log' && logData) {
      const entry = logInteraction(logData);
      return NextResponse.json({ success: true, log: entry });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
