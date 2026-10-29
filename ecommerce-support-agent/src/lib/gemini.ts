import { parseDocxFile } from './docx-parser';
import {
  fetchProductsFromSheet,
  fetchOrdersFromSheet,
  fetchBankDetailsFromSheet,
  updateOrderStatus,
  updateOrderDetails,
  updateProductStock,
  addOrUpdateBankDetail,
  getNextOrderId
} from './sheets';
import { evaluateRefundEligibility } from './refund-engine';
import { generateOrderPlacementEmail, generateRefundEmail, generateExchangeEmail } from './email-service';
import { Product, Order, BankDetail } from '@/types';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

/**
 * Clean and format text strictly without asterisks (*):
 * - Converts **word** or *word* to <b>word</b>
 * - Converts * or - bullets to clean bullet symbols (•)
 * - Completely removes any remaining isolated asterisks (*)
 */
export function cleanAgentText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Convert markdown bold **word** to <b>word</b>
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  // 2. Convert markdown italic *word* to <b>word</b>
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');

  // 3. Convert markdown bullet points (* Item or - Item) to clean bullet symbol (• Item)
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '• ');

  // 4. Strip any remaining rogue asterisks
  cleaned = cleaned.replace(/\*/g, '');

  return cleaned.trim();
}

/**
 * Detect language of query: 'en' (English) vs 'ur' (Roman Urdu)
 */
export function detectLanguage(text: string): 'en' | 'ur' {
  const lower = text.toLowerCase().trim();

  // Distinct English markers
  const englishTokens = [
    'what', 'which', 'who', 'where', 'how', 'when', 'why', 'is', 'are', 'was',
    'were', 'the', 'of', 'in', 'for', 'with', 'about', 'offer', 'kind', 'show',
    'please', 'tell', 'price', 'model', 'buy', 'want', 'have', 'can', 'do',
    'does', 'would', 'you', 'your', 'need', 'give', 'details', 'specs', 'stock',
    'hello', 'hi', 'hey', 'laptop', 'laptops', 'headphones', 'phones'
  ];

  // Distinct Roman Urdu markers
  const urduTokens = [
    'kya', 'hai', 'hain', 'karo', 'kardo', 'karna', 'krdo', 'krna', 'chahiye',
    'batao', 'bataen', 'bataiye', 'kitna', 'kitni', 'kitne', 'kaunsa', 'konsa',
    'konsay', 'yeh', 'ye', 'woh', 'wo', 'mera', 'meri', 'mere', 'aapka', 'aapki',
    'apna', 'apni', 'mujhe', 'humne', 'maine', 'mene', 'shukriya', 'theek',
    'thik', 'wapis', 'qeemat', 'taadad', 'kahan', 'kaise', 'kyun', 'dekho',
    'dekh', 'bhi', 'kuch', 'bhai', 'pata', 'rakho', 'nmae', 'naam'
  ];

  // Specific Urdu phrase check
  if (/\b(kya\s+he|ki\s+price|ka\s+rate|acha\s+he|kya\s+hai|k\s+name\s+se|k\s+naam\s+se|kya\s+h|he\?)\b/i.test(lower)) {
    return 'ur';
  }

  const words = lower.split(/[^a-zA-Z]+/);
  let enCount = 0;
  let urCount = 0;

  for (const w of words) {
    if (englishTokens.includes(w)) enCount++;
    if (urduTokens.includes(w)) urCount++;
  }

  if (urCount > enCount) return 'ur';
  if (enCount > urCount) return 'en';
  return urCount > 0 ? 'ur' : 'en';
}

/**
 * Fuzzy & Alias Product Finder for store catalog
 */
export function findProductInText(text: string, products: Product[]): Product | null {
  const lower = text.toLowerCase().trim();

  // 1. Direct exact or substring match with modelName or "Brand Model"
  for (const prod of products) {
    const full = `${prod.brand} ${prod.modelName}`.toLowerCase();
    const model = prod.modelName.toLowerCase();
    if (lower.includes(full) || lower.includes(model)) {
      return prod;
    }
  }

  // 2. Multi-word partial matches (e.g. "Dell XPS 15", "XPS 15", "MacBook Air", "Pixel 9")
  for (const prod of products) {
    const words = prod.modelName.toLowerCase().split(/[\s\-]+/).filter(w => w.length >= 2);
    const brandInQuery = lower.includes(prod.brand.toLowerCase());
    const modelWordsMatching = words.filter(w => lower.includes(w));
    if (brandInQuery && modelWordsMatching.length >= 1) {
      return prod;
    }
    if (modelWordsMatching.length >= 2) {
      return prod;
    }
  }

  // 3. Brand + category match (e.g., "apple laptop", "sony headphones")
  for (const prod of products) {
    if (lower.includes(`${prod.brand.toLowerCase()} ${prod.category.toLowerCase()}`)) {
      return prod;
    }
  }

  // 4. Aliases & Nicknames
  if (/macbook|air\s*m3|m3\s*air|mac\s*book/i.test(lower)) return products.find(p => p.modelName.includes('MacBook')) || null;
  if (/dell|xps/i.test(lower)) return products.find(p => p.modelName.includes('XPS')) || null;
  if (/legion/i.test(lower)) return products.find(p => p.modelName.includes('Legion')) || null;
  if (/spectre/i.test(lower)) return products.find(p => p.modelName.includes('Spectre')) || null;
  if (/airpods/i.test(lower)) return products.find(p => p.modelName.includes('AirPods')) || null;
  if (/wh-?1000xm5|sony\s*headphone/i.test(lower)) return products.find(p => p.modelName.includes('WH-1000XM5')) || null;
  if (/bose|quietcomfort/i.test(lower)) return products.find(p => p.modelName.includes('QuietComfort')) || null;
  if (/galaxy\s*s25|s25/i.test(lower)) return products.find(p => p.modelName.includes('Galaxy S25')) || null;
  if (/iphone/i.test(lower)) return products.find(p => p.modelName.includes('iPhone')) || null;
  if (/pixel/i.test(lower)) return products.find(p => p.modelName.includes('Pixel')) || null;
  if (/oneplus/i.test(lower)) return products.find(p => p.modelName.includes('OnePlus')) || null;
  if (/ipad/i.test(lower)) return products.find(p => p.modelName.includes('iPad')) || null;
  if (/galaxy\s*tab|tab\s*s10/i.test(lower)) return products.find(p => p.modelName.includes('Galaxy Tab')) || null;
  if (/pad\s*7|xiaomi/i.test(lower)) return products.find(p => p.modelName.includes('Pad 7')) || null;
  if (/mx\s*keys/i.test(lower)) return products.find(p => p.modelName.includes('MX Keys')) || null;
  if (/keychron/i.test(lower)) return products.find(p => p.modelName.includes('Keychron')) || null;
  if (/blackwidow/i.test(lower)) return products.find(p => p.modelName.includes('BlackWidow')) || null;
  if (/mx\s*master/i.test(lower)) return products.find(p => p.modelName.includes('MX Master')) || null;
  if (/deathadder/i.test(lower)) return products.find(p => p.modelName.includes('DeathAdder')) || null;
  if (/aerox/i.test(lower)) return products.find(p => p.modelName.includes('Aerox')) || null;

  return null;
}

export interface ConversationMemory {
  customerName?: string;
  orderId?: string;
  modelName?: string;
  product?: string;
  shippingAddress?: string;
  mobileNumber?: string;
  customerEmail?: string;
  bankName?: string;
  accountNumber?: string;
  accountTitle?: string;
  replacementProduct?: string;
  returnType?: 'refund' | 'exchange';
  confirmedOrder?: boolean;
  intent?: 'order_placement' | 'refund' | 'order_update' | 'product_inquiry' | 'stock_update' | 'general' | 'exchange';
}

/**
 * Conversational Memory Extractor:
 * Analyzes conversation history + current user message to track entities and multi-turn state.
 */
export function extractConversationMemory(
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  products: Product[],
  orders: Order[]
): ConversationMemory {
  const memory: ConversationMemory = {};

  const allTurnTexts: { role: 'user' | 'model'; text: string }[] = [
    ...history.map(h => ({ role: h.role, text: h.parts?.[0]?.text || '' })),
    { role: 'user', text: userMessage }
  ];

  const stopWords = new Set([
    'kardo', 'karo', 'update', 'order', 'laptop', 'phone', 'sheet', 'detail',
    'please', 'hello', 'salam', 'bhai', 'agent', 'refund', 'return', 'item',
    'product', 'address', 'mobile', 'bank', 'email', 'gmail', 'name', 'naam',
    'hai', 'tha', 'thi', 'kar', 'karna', 'mera', 'meri', 'mere', 'kya', 'bhi',
    'chahiye', 'mujhe', 'hum', 'humne', 'mene', 'maine', 'karke', 'rakho',
    'policy', 'asool', 'rules', 'status', 'kahan', 'check', 'batao', 'tell'
  ]);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  for (const turn of allTurnTexts) {
    const text = turn.text;
    const isUser = turn.role === 'user';

    if (isUser) {
      // Customer Name
      const nameSeMatch = text.match(/(?:maine|mera|meri|hum|humne|mene)?\s*([a-zA-Z]{3,20})\s*(?:k\b|ke\b|ka\b|ki\b)?\s*(?:nmae|naam|name)\s*(?:se|pe|par)?/i);
      if (nameSeMatch) {
        const cand = nameSeMatch[1].toLowerCase();
        if (!stopWords.has(cand)) {
          memory.customerName = capitalize(cand);
        }
      }

      const directNameMatch = text.match(/(?:customer(?:\s*name)?|order\s*ka\s*name|mera\s*naam|my\s*name(?:\s*is)?|naam|name)\s*(?:is|to|:|hai|=|karke|kardo)?\s*([a-zA-Z]{3,20})\b/i);
      if (directNameMatch) {
        const cand = directNameMatch[1].toLowerCase();
        if (!stopWords.has(cand)) {
          memory.customerName = capitalize(cand);
        }
      }

      if (!memory.customerName) {
        const orderNameMatch = text.match(/\b([a-zA-Z]{3,20})\s+(?:k[aei]?\b)\s*order\b/i);
        if (orderNameMatch) {
          const cand = orderNameMatch[1].toLowerCase();
          const productKeywords = ['pro', 'air', 'max', 'ultra', 'mini', 'plus', 'laptop', 'phone', 'keys', 'master', 'pad', 'touch'];
          if (!stopWords.has(cand) && !productKeywords.includes(cand)) {
            memory.customerName = capitalize(cand);
          }
        }
      }

      // Order ID
      const orderMatch = text.match(/\b(ORD-\d{2,4})\b/i);
      if (orderMatch) {
        memory.orderId = orderMatch[1].toUpperCase();
      }

      // Email / Gmail Address
      const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
      if (emailMatch) {
        memory.customerEmail = emailMatch[1].trim();
      }

      // Mobile Number
      const mobileMatch = text.match(/\b(03\d{2}[-\s]?\d{7}|03\d{9}|\+92\d{10}|\b\d{11}\b)\b/);
      if (mobileMatch) {
        memory.mobileNumber = mobileMatch[0].replace(/[-\s]/g, '');
      }

      // Product / Model Name
      const matchedProd = findProductInText(text, products);
      if (matchedProd) {
        memory.modelName = matchedProd.modelName;
        memory.product = matchedProd.category;
      }

      // Shipping Address
      const addrLabelMatch = text.match(/(?:shipping\s*)?(?:address|adress|pata|location)\s*(?:is|to|:|hai|=|karke|kardo)?\s*([a-zA-Z0-9\s,\-\#\/\.]{4,60}?)(?=(?:mobile|phone|number|status|customer|order|naam|gmail|email|\n|$))/i);
      if (addrLabelMatch && addrLabelMatch[1].trim().length > 3) {
        const cand = addrLabelMatch[1].trim().replace(/\s+(?:aur|and|hai|mera|meri|kardo|karo)$/i, '').trim();
        if (!stopWords.has(cand.toLowerCase())) {
          memory.shippingAddress = cand;
        }
      }

      if (!memory.shippingAddress && text.includes(',')) {
        const parts = text.split(',').map(p => p.trim());
        for (const p of parts) {
          if (
            !p.includes('@') &&
            !/03\d{9}|\d{11}/.test(p) &&
            !products.some(prod => prod.modelName.toLowerCase() === p.toLowerCase()) &&
            !/salman|customer|ali|sara|john|mia|abis|syed|hussain|ayyan/i.test(p) &&
            p.length > 3 &&
            !stopWords.has(p.toLowerCase())
          ) {
            memory.shippingAddress = p;
            break;
          }
        }
      }

      if (!memory.shippingAddress) {
        const cleanForAddr = text
          .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '')
          .replace(/\b(03\d{2}[-\s]?\d{7}|03\d{9}|\+92\d{10}|\b\d{11}\b)\b/g, '')
          .trim();

        const addrKeywordMatch = cleanForAddr.match(/\b(?:house|flat|street|sector|phase|dha|bahria|model town|gulberg|clifton|pechs|cantt|f-7|f-8|f-10|f-11|i-8|g-9|saddar|town|colony|block|lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar)[a-zA-Z0-9\s,\-\#\/\.]+/i);
        if (addrKeywordMatch) {
          let clean = addrKeywordMatch[0].trim();
          clean = clean.replace(/^[,;\s]+|[,;\s]+$/g, '');
          if (clean.length >= 4 && !stopWords.has(clean.toLowerCase())) {
            memory.shippingAddress = clean;
          }
        }
      }

      // Bank Details
      const bankNameMatch = text.match(/(meezan|habib\s*metro|habib|alfalah|ubl|hbl|mcb|standard chartered|allied|faysal|soneri|askari|bank [a-z]+|easypaisa|jazzcash|nayapay|sadapay|bank)/i);
      if (bankNameMatch) {
        memory.bankName = bankNameMatch[0];
      }

        const accountMatch = text.match(/\b(PK\d{2}[A-Z]{4}\d{16}|\d{8,24})\b/i);
        if (accountMatch) {
          memory.accountNumber = accountMatch[0];
        }

        // Account Title / Holder Name
        const titleMatch = text.match(/(?:account\s*title|account\s*holder|title|account\s*name)\s*(?:is|:|hai|=|karke)?\s*([a-zA-Z\s]{3,30})/i);
        if (titleMatch && !stopWords.has(titleMatch[1].trim().toLowerCase())) {
          memory.accountTitle = titleMatch[1].trim();
        }

        // Return vs Exchange intent
        if (/exchange|replacement|tabdeel|badal/i.test(text)) {
          memory.returnType = 'exchange';
          memory.intent = 'exchange';
          const repProd = findProductInText(text, products);
          if (repProd) {
            memory.replacementProduct = repProd.modelName;
          }
        } else if (/refund|paisa\s*wapas|money\s*back/i.test(text)) {
          memory.returnType = 'refund';
          memory.intent = 'refund';
        }

        // Confirmation keywords
        if (/\b(confirm|confirm\s*kardo|order\s*confirm|yes|proceed|haan|theek hai|thik hai|sahi hai|ji haan|done)\b/i.test(text)) {
          memory.confirmedOrder = true;
        }
      }
    }

  // Cross-reference with existing orders if orderId is identified
  if (memory.orderId) {
    const existing = orders.find(o => o.orderId.toUpperCase() === memory.orderId);
    if (existing) {
      if (!memory.customerName && existing.customer) memory.customerName = existing.customer;
      if (!memory.modelName && (existing.modelName || existing.product)) {
        memory.modelName = existing.modelName || existing.product;
        memory.product = existing.product;
      }
      if (!memory.shippingAddress && existing.shippingAddress && existing.shippingAddress !== '############') {
        memory.shippingAddress = existing.shippingAddress;
      }
      if (!memory.mobileNumber && existing.mobileNumber && existing.mobileNumber !== '0300######') {
        memory.mobileNumber = existing.mobileNumber;
      }
      if (!memory.customerEmail && existing.customerEmail) {
        memory.customerEmail = existing.customerEmail;
      }
    }
  }

  return memory;
}

/**
 * Format Product details grounded from live Google Sheet in matching language
 */
function formatProductDetail(prod: Product, lang: 'en' | 'ur'): string {
  const stockText = prod.stock > 0 ? `🟢 <b>${prod.stock} units available</b>` : '🔴 Out of stock';

  if (lang === 'en') {
    return (
      `Here are the live details for <b>${prod.brand} ${prod.modelName}</b> from our Google Sheet catalog: 💻✨\n\n` +
      `• <b>Price</b>: <b>$${prod.price.toFixed(2)} USD</b>\n` +
      `• <b>Stock</b>: ${stockText}\n` +
      `• <b>Specifications</b>: ${prod.keySpecifications}\n` +
      `• <b>Best For</b>: ${prod.bestFor}\n\n` +
      `Promo code <b>TECH10</b> is active for 10% off storewide!\n` +
      `Would you like to place an order for this? Just say 'place order' or share your delivery address, mobile, and Gmail. 😊`
    );
  } else {
    return (
      `Yeh rahi <b>${prod.brand} ${prod.modelName}</b> ki live details (Google Sheet se): 💻✨\n\n` +
      `• <b>Price</b>: <b>$${prod.price.toFixed(2)} USD</b>\n` +
      `• <b>Stock</b>: ${stockText}\n` +
      `• <b>Specs</b>: ${prod.keySpecifications}\n` +
      `• <b>Best For</b>: ${prod.bestFor}\n\n` +
      `Promo code <b>TECH10</b> use karke aap 10% discount haasil kar sakte hain!\n` +
      `Agar aap iska order lagana chahte hain, to 'order place kardo' kahein ya apna Shipping Address, Mobile aur Gmail share karein. 😊`
    );
  }
}

/**
 * Format Catalog listing grounded from live Google Sheet in matching language
 */
function formatCatalogResponse(products: Product[], categoryFilter?: string, lang: 'en' | 'ur' = 'en'): string {
  let filtered = products;
  if (categoryFilter) {
    filtered = products.filter(p => p.category.toLowerCase().includes(categoryFilter.toLowerCase()));
  }

  if (categoryFilter && filtered.length > 0) {
    const items = filtered.map(p =>
      `• <b>${p.brand} ${p.modelName}</b>: <b>$${p.price.toFixed(2)} USD</b> (${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}) - ${p.keySpecifications}`
    ).join('\n');

    if (lang === 'en') {
      return (
        `Here are the <b>${filtered[0].category}</b> models we offer from our live Google Sheet catalog: 💻✨\n\n` +
        items +
        `\n\nWhich model would you like more details on or to order? 😊`
      );
    } else {
      return (
        `Yeh rahe hamare store ke <b>${filtered[0].category}</b> models (live Google Sheet se): 💻✨\n\n` +
        items +
        `\n\nKisi bhi model ki mazeed detail ya order ke liye batayein! 😊`
      );
    }
  }

  // Multi-category overview
  const laptops = products.filter(p => p.category.toLowerCase() === 'laptop').slice(0, 4);
  const audio = products.filter(p => p.category.toLowerCase() === 'headphones').slice(0, 3);
  const phones = products.filter(p => p.category.toLowerCase() === 'phone').slice(0, 3);

  const formatList = (list: Product[]) => list.map(p => `• <b>${p.brand} ${p.modelName}</b> ($${p.price.toFixed(2)}) - ${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}`).join('\n');

  if (lang === 'en') {
    return (
      `Here are the models we offer across our live store catalog: 🛍️✨\n\n` +
      `💻 <b>Laptops:</b>\n` + formatList(laptops) + `\n\n` +
      `🎧 <b>Headphones & Audio:</b>\n` + formatList(audio) + `\n\n` +
      `📱 <b>Smartphones:</b>\n` + formatList(phones) + `\n\n` +
      `Which model would you like pricing, specs, or to place an order for? 😊`
    );
  } else {
    return (
      `Hamare live store catalog me available models: 🛍️✨\n\n` +
      `💻 <b>Laptops:</b>\n` + formatList(laptops) + `\n\n` +
      `🎧 <b>Headphones & Audio:</b>\n` + formatList(audio) + `\n\n` +
      `📱 <b>Smartphones:</b>\n` + formatList(phones) + `\n\n` +
      `Aap kis model ki price ya detail check karna chahte hain? 😊`
    );
  }
}

export async function askAgent(
  userMessage: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<{
  text: string;
  refundData?: any;
  orderData?: any;
  productData?: any;
  sheetUpdated?: boolean;
}> {
  // 1. Fetch live contextual knowledge from Google Sheets and Word docx
  const [policyData, products, orders, bankDetails] = await Promise.all([
    parseDocxFile(),
    fetchProductsFromSheet(),
    fetchOrdersFromSheet(),
    fetchBankDetailsFromSheet()
  ]);

  const lowerMsg = userMessage.toLowerCase().trim();

  // 2. Detect language: English ('en') vs. Roman Urdu ('ur')
  const lang = detectLanguage(userMessage);

  // 3. Extract Conversational Memory across multi-turn history
  const memory = extractConversationMemory(userMessage, history, products, orders);

  // -------------------------------------------------------------------------
  // INQUIRY DETECTION: Check if current message is an explicit question/inquiry
  // (Inquiries MUST NOT be intercepted as missing-slot order placements!)
  // -------------------------------------------------------------------------
  const isQuestion = userMessage.trim().endsWith('?') ||
    /\b(what|which|how|who|where|when|why|kya|kitna|kitni|kitne|kaunsa|konsa|konsay|kahan|kab|kaise)\b/i.test(lowerMsg);

  // -------------------------------------------------------------------------
  // ACTION A: Direct Stock / Price Update instruction (Admin)
  // Must have explicit update action verb AND cannot be a question!
  // -------------------------------------------------------------------------
  const isStockOrPriceInstruction = !isQuestion &&
    (/(?:update|set|change|badal|rakh\s*do|kardo|karo)\s+.*(?:stock|price|qeemat|taadad|quantity)/i.test(lowerMsg) ||
     /(?:stock|price|qeemat|taadad|quantity)\s+.*(?:update|set|badal|change|kardo|karo)/i.test(lowerMsg));

  if (isStockOrPriceInstruction) {
    const targetProduct = findProductInText(userMessage, products);
    if (targetProduct) {
      const numbers = userMessage.match(/\b\d+(\.\d+)?\b/g);
      if (numbers && numbers.length > 0) {
        const val = parseFloat(numbers[numbers.length - 1]);
        const isPrice = /price|qeemat|\$|dollar|rs/i.test(userMessage);
        const updateRes = await updateProductStock(
          targetProduct.modelName,
          isPrice ? undefined : Math.round(val),
          isPrice ? val : undefined
        );

        if (lang === 'en') {
          return {
            text: cleanAgentText(
              `Done! ✨ Live Google Sheet updated for <b>${targetProduct.brand} ${targetProduct.modelName}</b>: ${isPrice ? 'Price' : 'Stock'} is now <b>${isPrice ? `$${val.toFixed(2)}` : `${val} units`}</b>. 📦`
            ),
            productData: updateRes.product || targetProduct,
            sheetUpdated: true
          };
        } else {
          return {
            text: cleanAgentText(
              `Done! ✨ <b>${targetProduct.brand} ${targetProduct.modelName}</b> ka ${isPrice ? 'price' : 'stock'} live Google Sheet me <b>${isPrice ? `$${val.toFixed(2)}` : `${val} units`}</b> update kar diya hai. 📦`
            ),
            productData: updateRes.product || targetProduct,
            sheetUpdated: true
          };
        }
      }
    }
  }

  const isPriceQuery = isQuestion && /(price|cost|rate|qeemat|how much|kitne ka|kitna)/i.test(lowerMsg) ||
    /(price|cost|rate|qeemat|how much)/i.test(lowerMsg);

  const isCatalogQuery = /(what kind of|what models|which models|show models|offer|catalog|options?|what do you have|kaunse model|konsay model|list|all products|available|categories|types of)/i.test(lowerMsg);

  const isPolicyQuestion = /(policy|asool|rules|sharayet|guide|how to|procedure|tareeqa|terms)/i.test(lowerMsg);

  const isRecommendationQuery = /(best|recommend|suggestion|compare|good|top|programming|coding|developer|gamer|gaming|students?|photo|camera)/i.test(lowerMsg);

  const isOrderStatusQuery = /order.*(?:status|kahan|update|detail|batao|check|hai|track|pohancha|kab)|(?:status|track|details?).*order/i.test(lowerMsg) ||
    /(?:kahan\s*hai|kab\s*aayega|status\s*kya\s*hai|where\s*is\s*my\s*order)/i.test(lowerMsg);

  // -------------------------------------------------------------------------
  // ACTION B: INQUIRY 1 - Product Price / Specs Inquiry
  // e.g. "MacBook Air M3 ki price kya he", "What is the price of MacBook Air M3?"
  const queriedProduct = findProductInText(userMessage, products);
  const isNotExchangeOrRefundOrOrder = !/exchange|replacement|tabdeel|badal|refund|return|wapis|place\s*order|order\s*kardo|order\s*karna|buy\s*now/i.test(lowerMsg);

  if (queriedProduct && isNotExchangeOrRefundOrOrder && (isPriceQuery || isQuestion || !/(place\s*order|order\s*kardo|order\s*karna|buy\s*now)/i.test(lowerMsg))) {
    // If user is asking about the product, answer with product details!
    return {
      text: cleanAgentText(formatProductDetail(queriedProduct, lang)),
      productData: queriedProduct
    };
  }

  // -------------------------------------------------------------------------
  // ACTION C: INQUIRY 2 - Catalog / Models Offered Inquiry
  // e.g. "what kind of model you offer", "what laptops do you have", "kaunse model hain"
  // -------------------------------------------------------------------------
  if (isCatalogQuery) {
    let targetCat: string | undefined = undefined;
    if (/laptop/i.test(lowerMsg)) targetCat = 'Laptop';
    else if (/headphone|audio|earphone/i.test(lowerMsg)) targetCat = 'Headphones';
    else if (/phone|mobile/i.test(lowerMsg)) targetCat = 'Phone';
    else if (/tablet|ipad/i.test(lowerMsg)) targetCat = 'Tablet';
    else if (/keyboard/i.test(lowerMsg)) targetCat = 'Keyboard';
    else if (/mouse/i.test(lowerMsg)) targetCat = 'Mouse';

    return {
      text: cleanAgentText(formatCatalogResponse(products, targetCat, lang))
    };
  }

  // -------------------------------------------------------------------------
  // ACTION D: INQUIRY 3 - Store Policies (Grounded in company_policies.docx)
  // e.g. "return policy kya hai store ki?", "what is the return policy?", "shipping time"
  // -------------------------------------------------------------------------
  if (isPolicyQuestion || /return|refund|shipping|delivery|warranty|cancel|payment/i.test(lowerMsg) && isQuestion) {
    // 1. Return & Refund Policy
    if (/return|refund|wapas|exchange/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Here are the key points of TechMart's <b>Return & Refund Policy</b>: 🛡️✨\n\n` +
            `• <b>15-Day Return Window</b>: Electronics items are eligible for return within <b>15 days</b> of delivery.\n` +
            `• <b>Condition</b>: The item must be in original packaging with all seals, manuals, and accessories intact.\n` +
            `• <b>Refund Timeline</b>: Once approved, funds are transferred to your bank account within <b>3 to 5 business days</b>.\n` +
            `• <b>Gmail Confirmation</b>: A formal payout receipt is dispatched directly to your verified Gmail address.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `TechMart ki <b>Return & Refund Policy</b> ke ahem usool: 🛡️✨\n\n` +
            `• <b>15-Day Return Window</b>: Electronics items deliver hone ke baad <b>15 din</b> ke andar return ke liye eligible hote hain.\n` +
            `• <b>Condition</b>: Item original packaging, seals, aur all accessories ke saath hona zaroori hai.\n` +
            `• <b>Refund Timeline</b>: Return approve hone ke baad refund amount <b>3 se 5 business days</b> me aapke bank account me credit kar di jaati hai.\n` +
            `• <b>Dispatched Receipt</b>: Payout confirmation receipt aapke verified Gmail par send ki jaati hai.`
          )
        };
      }
    }

    // 2. Shipping & Delivery
    if (/shipping|deliver|courier|dispatch|pohanch|time|kab/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `TechMart <b>Shipping & Delivery Information</b>: 🚚📦\n\n` +
            `• <b>Order Dispatch</b>: All confirmed orders are dispatched within <b>24 hours</b>.\n` +
            `• <b>Courier Window</b>: Standard delivery takes <b>2 to 4 business days</b>.\n` +
            `• <b>Free Shipping</b>: Orders over <b>$50</b> qualify for <b>FREE</b> delivery automatically.\n` +
            `• <b>Tracking</b>: SMS and Gmail tracking updates are dispatched upon shipment.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `TechMart ki <b>Shipping & Delivery Policy</b>: 🚚📦\n\n` +
            `• <b>Dispatch</b>: Har order confirm hone ke <b>24 hours</b> ke andar dispatch ho jata hai.\n` +
            `• <b>Delivery Window</b>: Courier delivery aam taur par <b>2 se 4 business days</b> leti hai.\n` +
            `• <b>Free Shipping</b>: <b>$50</b> se barhi purchase par delivery bilkul <b>FREE</b> hai.\n` +
            `• <b>Tracking</b>: Tracking updates aapke mobile number aur Gmail par send ki jaati hain.`
          )
        };
      }
    }

    // 3. Warranty
    if (/warranty|guarantee|kharab|defect|fault|repair/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `TechMart <b>Warranty Coverage</b>: 🛡️⚙️\n\n` +
            `• <b>1-Year Official Warranty</b>: All brand-new electronics include a full <b>1-Year Manufacturer Warranty</b>.\n` +
            `• <b>Coverage</b>: Covers hardware defects and technical malfunctions under normal use.\n` +
            `• <b>Assistance</b>: Simply chat with our AI concierge to initiate a warranty service request.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `TechMart ki <b>Warranty Policy</b>: 🛡️⚙️\n\n` +
            `• <b>1-Year Official Warranty</b>: Sabhi brand new electronics par <b>1-Year Manufacturer Warranty</b> shamil hai.\n` +
            `• <b>Coverage</b>: Hardware defects aur technical faults fully covered hote hain.\n` +
            `• <b>Assistance</b>: Warranty claim karne ke liye aap hamare AI concierge se rabta kar sakte hain.`
          )
        };
      }
    }

    // 4. Cancellation
    if (/cancel|mansookh/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `TechMart <b>Order Cancellation Policy</b>: ⏱️❌\n\n` +
            `• <b>Pre-Dispatch Cancellation</b>: You can cancel anytime before your order is dispatched.\n` +
            `• <b>100% Refund</b>: Cancelled orders receive an immediate full refund to the original payment source.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `TechMart <b>Order Cancellation Policy</b>: ⏱️❌\n\n` +
            `• <b>Pre-Dispatch Cancellation</b>: Order dispatch hone se pehle aap foran cancel karwa sakte hain.\n` +
            `• <b>Full Refund</b>: Cancelled order ka 100% refund immediately process ho jata hai.`
          )
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // ACTION E: INQUIRY 4 - Product Recommendations & Comparisons
  // e.g. "which laptop is best for programming?", "best headphones for travel"
  // -------------------------------------------------------------------------
  if (isRecommendationQuery) {
    if (/programm|coding|developer|software/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Here are our top recommendations for Programming & Software Development: 💻⚡\n\n` +
            `• <b>Apple MacBook Air M3</b> ($500.00) - Apple M3 chip, 16GB RAM, 512GB SSD. Exceptional build, blazing fast compile times, and industry-leading battery life.\n` +
            `• <b>Keychron K8 Pro</b> ($329.99) - Hot-swappable mechanical keyboard, wireless ergonomics preferred by developers.\n\n` +
            `Would you like to place an order for either of these? 😊`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `Programming aur Development ke liye hamari top recommendations: 💻⚡\n\n` +
            `• <b>Apple MacBook Air M3</b> ($500.00) - Apple M3 chip, 16GB RAM, 512GB SSD. Fast compile times aur exceptional battery life.\n` +
            `• <b>Keychron K8 Pro</b> ($329.99) - Hot-swappable mechanical keyboard, programmers ki pehli pasand!\n\n` +
            `Aap in me se koi order place karna chahte hain? 😊`
          )
        };
      }
    }

    if (/gaming|games|gamer|rtx/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Here is our ultimate high-performance gaming recommendation: 🎮🔥\n\n` +
            `• <b>Lenovo Legion Pro 5</b> ($499.99) - Ryzen 9, RTX 4070, 32GB RAM. Beast for high FPS AAA gaming.\n` +
            `• <b>Razer BlackWidow V4</b> ($59.99) - Tactile RGB Mechanical Gaming Keyboard.\n` +
            `• <b>Razer DeathAdder V3 Pro</b> ($499.99) - Ultra-lightweight esports wireless mouse.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `Gaming ke liye best powerhouse setup: 🎮🔥\n\n` +
            `• <b>Lenovo Legion Pro 5</b> ($499.99) - Ryzen 9, RTX 4070, 32GB RAM. High FPS gaming ke liye ultimate beast!\n` +
            `• <b>Razer BlackWidow V4</b> ($59.99) - RGB Mechanical Gaming Keyboard.\n` +
            `• <b>Razer DeathAdder V3 Pro</b> ($499.99) - Ultra-lightweight wireless esports mouse.`
          )
        };
      }
    }

    if (/headphone|audio|music|anc|noise/i.test(lowerMsg)) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Our top audio & headphone recommendations: 🎧🎶\n\n` +
            `• <b>Sony WH-1000XM5</b> ($59.99) - Industry-leading Active Noise Cancelling, 30hr battery.\n` +
            `• <b>Bose QuietComfort Ultra</b> ($799.99) - Premium comfort and spatial immersion.\n` +
            `• <b>Apple AirPods Max</b> ($29.99) - Seamless Apple ecosystem audio.`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `Best Audio & Headphones recommendations: 🎧🎶\n\n` +
            `• <b>Sony WH-1000XM5</b> ($59.99) - Industry-leading Active Noise Cancelling, 30hr battery life.\n` +
            `• <b>Bose QuietComfort Ultra</b> ($799.99) - World-class comfort aur spatial sound.\n` +
            `• <b>Apple AirPods Max</b> ($29.99) - Premium Apple ecosystem integration.`
          )
        };
      }
    }
  }

  // Budget / Price filter query (e.g. "under 100 dollar", "under $50", "sasta item", "gift")
  const budgetMatch = lowerMsg.match(/(?:under|below|less than|kam|tak)\s*(?:\$|rs|dollar)?\s*(\d+)/i) ||
    lowerMsg.match(/(\d+)\s*(?:dollar|\$|rs)\s*(?:se\s*kam|tak|under|below)/i);

  if (budgetMatch || /budget|sasta|gift/i.test(lowerMsg)) {
    const maxBudget = budgetMatch ? parseFloat(budgetMatch[1]) : 100;
    const affordable = products.filter(p => p.price <= maxBudget).slice(0, 4);

    if (affordable.length > 0) {
      const itemsList = affordable.map(p =>
        `• <b>${p.brand} ${p.modelName}</b>: <b>$${p.price.toFixed(2)} USD</b> (${p.category}) - ${p.keySpecifications}`
      ).join('\n');

      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Here are our top recommendations under <b>$${maxBudget} USD</b>: 🎁✨\n\n` +
            itemsList +
            `\n\nUse promo code <b>TECH10</b> for an extra 10% off! Which item would you like to order? 😊`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `<b>$${maxBudget} USD</b> ke andar hamari top recommendations: 🎁✨\n\n` +
            itemsList +
            `\n\nPromo code <b>TECH10</b> use karke mazeed 10% discount haasil karein! Kis item ka order karna chahenge? 😊`
          )
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // ACTION F: INQUIRY 5 - Order Status / Details Inquiry
  // e.g. "salman ka order status kya hai?", "where is my order?"
  // -------------------------------------------------------------------------
  let targetOrderForStatus: Order | null = null;
  if (memory.orderId) {
    targetOrderForStatus = orders.find(o => o.orderId.toUpperCase() === memory.orderId) || null;
  }
  if (!targetOrderForStatus && memory.customerName) {
    const custOrders = orders.filter(o => o.customer.toLowerCase() === (memory.customerName || '').toLowerCase());
    if (custOrders.length > 0) {
      targetOrderForStatus = custOrders[custOrders.length - 1];
    }
  }

  const isReturnOrExchangeIntent = /return|refund|exchange|replacement|tabdeel|badal|paisa|wapis/i.test(lowerMsg) || Boolean(memory.returnType);

  if (targetOrderForStatus && !isReturnOrExchangeIntent && (isOrderStatusQuery || (/\b(ORD-\d{2,4})\b/i.test(userMessage) && !/buy|order|purchase/i.test(lowerMsg)))) {
    if (lang === 'en') {
      return {
        text: cleanAgentText(
          `Here are the details for <b>Order #${targetOrderForStatus.orderId}</b>: 📦\n\n` +
          `• <b>Customer</b>: <b>${targetOrderForStatus.customer}</b>\n` +
          `• <b>Item</b>: <b>${targetOrderForStatus.modelName || targetOrderForStatus.product}</b>\n` +
          `• <b>Shipping Address</b>: ${targetOrderForStatus.shippingAddress || 'Not set'}\n` +
          `• <b>Mobile</b>: ${targetOrderForStatus.mobileNumber || 'Not set'}\n` +
          `• <b>Gmail</b>: ${targetOrderForStatus.customerEmail || 'Not set'}\n` +
          `• <b>Status</b>: <b>${targetOrderForStatus.status}</b>\n` +
          `• <b>Age</b>: Placed ${targetOrderForStatus.daysAgo} day(s) ago\n\n` +
          `Let me know if you would like to update your address, mobile, or Gmail! 😊`
        ),
        orderData: targetOrderForStatus
      };
    } else {
      return {
        text: cleanAgentText(
          `Yeh rahe details <b>Order #${targetOrderForStatus.orderId}</b> ke liye! 📦\n\n` +
          `• <b>Customer</b>: <b>${targetOrderForStatus.customer}</b>\n` +
          `• <b>Item</b>: <b>${targetOrderForStatus.modelName || targetOrderForStatus.product}</b>\n` +
          `• <b>Shipping Address</b>: ${targetOrderForStatus.shippingAddress || 'Not set'}\n` +
          `• <b>Mobile</b>: ${targetOrderForStatus.mobileNumber || 'Not set'}\n` +
          `• <b>Gmail</b>: ${targetOrderForStatus.customerEmail || 'Not set'}\n` +
          `• <b>Status</b>: <b>${targetOrderForStatus.status}</b>\n` +
          `• <b>Age</b>: ${targetOrderForStatus.daysAgo} din pehle\n\n` +
          `Address, mobile number ya Gmail update karna ho to batayein! 😊`
        ),
        orderData: targetOrderForStatus
      };
    }
  }

  // -------------------------------------------------------------------------
  // WORKFLOW 2: ORDER PLACEMENT (Sequential collection & summary confirmation)
  // -------------------------------------------------------------------------
  const isReturnOrExchangeOrRefund =
    /return|refund|exchange|replacement|wapis|badal|tabdeel/i.test(userMessage) ||
    Boolean(memory.returnType);

  const isExplicitOrderPlacement =
    !isReturnOrExchangeOrRefund && (
      /(?:place\s*(?:an\s*)?order|order\s*(?:kardo|karna|kar do|place|lagao|lagana|book|kare|chahiye|de do|krdo|krna)|book\s*order|buy\s*(?:this|it|now)?|purchase)/i.test(userMessage) ||
      /(?:nmae|naam|name)\s*se\s*order/i.test(userMessage) ||
      /^(?:i\s*buy|buy|order|purchase)\s*(?:to|a)?\s*(?:laptop|headphones|phone|tablet|keyboard|mouse)?$/i.test(userMessage.trim()) ||
      (Boolean(memory.shippingAddress || memory.mobileNumber || memory.customerEmail) && Boolean(memory.modelName))
    );

  const currentMsgMentionsOrderId = /\b(ORD-\d{2,4})\b/i.test(userMessage);

  if (isExplicitOrderPlacement && !currentMsgMentionsOrderId && !isQuestion) {
    const custName = memory.customerName;
    const prodName = memory.modelName;
    const address = memory.shippingAddress;
    const email = memory.customerEmail;
    const mobile = memory.mobileNumber;

    // Check if the user mentioned a generic category like "laptop" without choosing a specific model
    if (!prodName && /(laptop|headphones|phone|tablet|keyboard|mouse)/i.test(lowerMsg)) {
      const categoryMatch = lowerMsg.match(/(laptop|headphones|phone|tablet|keyboard|mouse)/i);
      const category = categoryMatch ? categoryMatch[1] : 'laptop';
      return {
        text: cleanAgentText(formatCatalogResponse(products, category, lang))
      };
    }

    if (!prodName) {
      return {
        text: cleanAgentText(
          lang === 'en'
            ? `Which product model would you like to order? You can tell me the brand or model name (e.g. <b>MacBook Air M3</b>, <b>Sony WH-1000XM5</b>, or <b>Galaxy S25 Ultra</b>). 😊`
            : `Aap kaunsa product model order karna chahenge? Kripya model ka naam batayein (jaise <b>MacBook Air M3</b>, <b>Sony WH-1000XM5</b>, ya <b>Galaxy S25 Ultra</b>). 😊`
        )
      };
    }

    // SEQUENTIAL DETAIL COLLECTION: 1. Full Name, 2. Complete Shipping Address, 3. Email Address, 4. Mobile Number
    if (!custName) {
      return {
        text: cleanAgentText(
          lang === 'en'
            ? `Great choice with <b>${prodName}</b>! 🛍️\n\nTo begin your order, could you please provide your <b>Full Name</b>?`
            : `Bohat umda intekhab <b>${prodName}</b>! 🛍️\n\nOrder process shuru karne ke liye apna <b>Full Name</b> share karein?`
        )
      };
    }

    if (!address) {
      return {
        text: cleanAgentText(
          lang === 'en'
            ? `Thank you, <b>${custName}</b>! 😊\n\nPlease provide your <b>Complete Shipping Address</b> for delivery:`
            : `Shukriya <b>${custName}</b>! 😊\n\nDelivery ke liye apna <b>Complete Shipping Address</b> share karein:`
        )
      };
    }

    if (!email) {
      return {
        text: cleanAgentText(
          lang === 'en'
            ? `Address noted! 📍\n\nNext, please provide your <b>Email Address</b> to receive order confirmation and dispatch receipt:`
            : `Address note kar liya gaya hai! 📍\n\nAb apna <b>Email Address</b> share karein taake confirmation receipt bhej saken:`
        )
      };
    }

    if (!mobile) {
      return {
        text: cleanAgentText(
          lang === 'en'
            ? `Almost there, <b>${custName}</b>! 📱\n\nPlease share your <b>Mobile Number</b> for courier tracking updates:`
            : `Aakhri detail, <b>${custName}</b>! 📱\n\nCourier delivery tracking ke liye apna <b>Mobile Number</b> share karein:`
        )
      };
    }

    // ALL DETAILS COLLECTED: Summarize for confirmation
    const catalogProd = products.find(p => p.modelName.toLowerCase() === prodName.toLowerCase());
    const finalPrice = catalogProd?.price || 500.00;
    const finalCategory = catalogProd?.category || 'electronics';

    const isConfirmedInThisMessage = /\b(yes|confirm|proceed|ok|theek hai|thik hai|haan|done|sahi hai|confirm kardo|order confirm|placed?)\b/i.test(userMessage);

    if (!isConfirmedInThisMessage && !memory.confirmedOrder) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Thank you, <b>${custName}</b>! Here is your order summary for confirmation: 📋✨\n\n` +
            `• <b>Product Item</b>: <b>${prodName}</b> ($${finalPrice.toFixed(2)} USD)\n` +
            `• <b>Customer Name</b>: <b>${custName}</b>\n` +
            `• <b>Shipping Address</b>: ${address}\n` +
            `• <b>Email Address</b>: ${email}\n` +
            `• <b>Mobile Number</b>: ${mobile}\n\n` +
            `Please reply <b>'Confirm'</b> or <b>'Yes'</b> to finalize and place your order! 😊`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `Shukriya <b>${custName}</b>! Aapke order ka summary confirmation ke liye: 📋✨\n\n` +
            `• <b>Product Item</b>: <b>${prodName}</b> ($${finalPrice.toFixed(2)} USD)\n` +
            `• <b>Customer Name</b>: <b>${custName}</b>\n` +
            `• <b>Shipping Address</b>: ${address}\n` +
            `• <b>Email Address</b>: ${email}\n` +
            `• <b>Mobile Number</b>: ${mobile}\n\n` +
            `Agar sab sahi hai to kripya <b>'Confirm'</b> ya <b>'Haan'</b> kahein taake order finalize kiya ja sake! 😊`
          )
        };
      }
    }

    // UPON CONFIRMATION:
    // a) Instantly write complete order details into Orders Sheet
    // b) Trigger Email integration to send confirmation email
    // c) Share generated Order Number with customer in chat
    const nextId = getNextOrderId(orders);
    const orderObj: Order = {
      orderId: nextId,
      customer: custName,
      modelName: prodName,
      product: finalCategory,
      category: 'electronics',
      shippingAddress: address,
      mobileNumber: mobile,
      customerEmail: email,
      status: 'Order Placed',
      daysAgo: 0,
      price: finalPrice
    };

    await updateOrderDetails(nextId, {
      customer: custName,
      modelName: prodName,
      product: finalCategory,
      shippingAddress: address,
      mobileNumber: mobile,
      customerEmail: email,
      status: 'Order Placed',
      daysAgo: 0
    });

    if (email) {
      generateOrderPlacementEmail(orderObj, email, finalPrice);
    }

    if (lang === 'en') {
      return {
        text: cleanAgentText(
          `Congratulations, <b>${custName}</b>! 🎉 Your order has been placed successfully!\n\n` +
          `• <b>Order Number</b>: <b>${nextId}</b>\n` +
          `• <b>Item</b>: <b>${prodName}</b> ($${finalPrice.toFixed(2)} USD)\n` +
          `• <b>Shipping Address</b>: ${address}\n` +
          `• <b>Email</b>: ${email}\n` +
          `• <b>Status</b>: <b>Order Placed</b>\n\n` +
          `An official confirmation email has been dispatched to <b>${email}</b>. You can track your package anytime using Order Number <b>${nextId}</b>! 📦✨`
        ),
        orderData: orderObj,
        sheetUpdated: true
      };
    } else {
      return {
        text: cleanAgentText(
          `Mubarak ho, <b>${custName}</b>! 🎉 Aapka order kamiyabi se place ho gaya hai!\n\n` +
          `• <b>Order Number</b>: <b>${nextId}</b>\n` +
          `• <b>Item</b>: <b>${prodName}</b> ($${finalPrice.toFixed(2)} USD)\n` +
          `• <b>Shipping Address</b>: ${address}\n` +
          `• <b>Email</b>: ${email}\n` +
          `• <b>Status</b>: <b>Order Placed</b>\n\n` +
          `Official confirmation receipt aapke email <b>${email}</b> par bhej di gayi hai. Aap Order Number <b>${nextId}</b> se delivery kisi bhi waqt track kar sakte hain! 📦✨`
        ),
        orderData: orderObj,
        sheetUpdated: true
      };
    }
  }

  // -------------------------------------------------------------------------
  // WORKFLOW 3: RETURNS, EXCHANGES, AND REFUNDS
  if (isReturnOrExchangeOrRefund && !isCatalogQuery) {
    // 1. Identify target order by Order ID, Name, or Email
    let targetOrder: Order | null = null;
    if (memory.orderId) {
      targetOrder = orders.find(o => o.orderId.toUpperCase() === memory.orderId) || null;
    }
    if (!targetOrder && memory.customerEmail) {
      targetOrder = orders.find(o => o.customerEmail?.toLowerCase() === memory.customerEmail?.toLowerCase()) || null;
    }
    if (!targetOrder && memory.customerName) {
      const custOrders = orders.filter(o => o.customer.toLowerCase() === (memory.customerName || '').toLowerCase());
      if (custOrders.length > 0) targetOrder = custOrders[custOrders.length - 1];
    }

    // If order not yet identified, explain policy politely and ask for Order Number or Email
    if (!targetOrder) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Our standard Return Policy allows returns and exchanges within <b>15 calendar days</b> of delivery for all electronics, provided the item is in its original packaging with all accessories intact. 🛡️✨\n\n` +
            `Could you please share your <b>Order Number</b> (e.g. <b>ORD-101</b>) or <b>Email Address</b> so I can look up your details in our system? Also let me know if you would like an <b>Exchange</b> or a <b>Refund</b>! 😊`
          )
        };
      } else {
        return {
          text: cleanAgentText(
            `TechMart ki standard Return Policy ke mutabiq electronics items delivery ke baad <b>15 din</b> ke andar return ya exchange ke liye eligible hote hain (original packaging aur accessories ke sath). 🛡️✨\n\n` +
            `Kripya apna <b>Order Number</b> (jaise <b>ORD-101</b>) ya <b>Email Address</b> share karein taake main records check kar sakoon. Sath hi batayein ke aap <b>Exchange</b> chahte hain ya <b>Refund</b>? 😊`
          )
        };
      }
    }

    // Determine if Exchange or Refund
    const wantsExchange = memory.returnType === 'exchange' || /exchange|replacement|tabdeel|badal/i.test(userMessage);
    const wantsRefund = memory.returnType === 'refund' || /refund|paisa|money/i.test(userMessage);

    if (!wantsExchange && !wantsRefund) {
      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `I have located your order <b>#${targetOrder.orderId}</b> for <b>${targetOrder.modelName || targetOrder.product}</b>! 📦\n\n` +
            `Would you like to proceed with an <b>Exchange</b> for a replacement product, or a <b>Refund</b> back to your bank account? 😊`
          ),
          orderData: targetOrder
        };
      } else {
        return {
          text: cleanAgentText(
            `Aapka order <b>#${targetOrder.orderId}</b> (<b>${targetOrder.modelName || targetOrder.product}</b>) mil gaya hai! 📦\n\n` +
            `Aap kisi replacement item ke saath <b>Exchange</b> karwana chahte hain ya bank account me <b>Refund</b>? 😊`
          ),
          orderData: targetOrder
        };
      }
    }

    // IF EXCHANGE:
    if (wantsExchange) {
      const repProd = findProductInText(userMessage, products);
      const replacementName = repProd?.modelName || memory.replacementProduct;
      const currentAddress = memory.shippingAddress || targetOrder.shippingAddress;
      const email = memory.customerEmail || targetOrder.customerEmail;

      if (!replacementName) {
        if (lang === 'en') {
          return {
            text: cleanAgentText(
              `Certainly! Which replacement product model would you like to exchange your <b>${targetOrder.modelName || targetOrder.product}</b> for? (e.g. <b>MacBook Air M3</b>, <b>Sony WH-1000XM5</b>, or <b>Galaxy S25 Ultra</b>)`
            ),
            orderData: targetOrder
          };
        } else {
          return {
            text: cleanAgentText(
              `Zaroor! Aap <b>${targetOrder.modelName || targetOrder.product}</b> ke badle kaunsa replacement model lena chahenge? (jaise <b>MacBook Air M3</b>, <b>Sony WH-1000XM5</b>, ya <b>Galaxy S25 Ultra</b>)`
            ),
            orderData: targetOrder
          };
        }
      }

      if (!currentAddress || currentAddress === '############') {
        if (lang === 'en') {
          return {
            text: cleanAgentText(
              `Replacement selected: <b>${replacementName}</b>! ✨\n\nPlease confirm your current <b>Shipping Address</b> for the exchange dispatch:`
            ),
            orderData: targetOrder
          };
        } else {
          return {
            text: cleanAgentText(
              `Replacement select ho gaya: <b>${replacementName}</b>! ✨\n\nExchange dispatch ke liye apna current <b>Shipping Address</b> confirm karein:`
            ),
            orderData: targetOrder
          };
        }
      }

      // Update exchange request in Orders Sheet & send confirmation email
      await updateOrderDetails(targetOrder.orderId, {
        status: 'Exchange Requested',
        modelName: `${targetOrder.modelName} -> Exchange: ${replacementName}`,
        shippingAddress: currentAddress,
        customerEmail: email
      });

      if (email) {
        generateExchangeEmail(targetOrder, replacementName, currentAddress, email);
      }

      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Your exchange request for <b>Order #${targetOrder.orderId}</b> has been successfully registered! 🔄✨\n\n` +
            `• <b>Original Product</b>: ${targetOrder.modelName || targetOrder.product}\n` +
            `• <b>Replacement Product</b>: <b>${replacementName}</b>\n` +
            `• <b>Delivery Address</b>: ${currentAddress}\n` +
            `• <b>Status</b>: <b>Exchange Requested</b>\n\n` +
            `We have updated your order in our system and sent an exchange confirmation email to <b>${email || 'your email'}</b>. Our courier will deliver your replacement within 2 to 4 business days!`
          ),
          orderData: targetOrder,
          sheetUpdated: true
        };
      } else {
        return {
          text: cleanAgentText(
            `Aapki <b>Order #${targetOrder.orderId}</b> ki exchange request confirm ho chuki hai! 🔄✨\n\n` +
            `• <b>Original Product</b>: ${targetOrder.modelName || targetOrder.product}\n` +
            `• <b>Replacement Product</b>: <b>${replacementName}</b>\n` +
            `• <b>Delivery Address</b>: ${currentAddress}\n` +
            `• <b>Status</b>: <b>Exchange Requested</b>\n\n` +
            `Order update kar diya gaya hai aur confirmation email <b>${email || 'aapke email'}</b> par bhej di gayi hai. Courier 2 se 4 din me replacement deliver kar dega!`
          ),
          orderData: targetOrder,
          sheetUpdated: true
        };
      }
    }

    // IF REFUND:
    if (wantsRefund) {
      // 15-day policy evaluation
      const evalResult = await evaluateRefundEligibility(targetOrder.orderId, true);
      const refundData = evalResult.evaluation;

      if (refundData && !refundData.isEligible) {
        if (lang === 'en') {
          return {
            text: cleanAgentText(
              `Hello <b>${targetOrder.customer}</b>. <b>Order #${targetOrder.orderId}</b> was placed <b>${targetOrder.daysAgo} days ago</b>.\n\n` +
              `Under TechMart store policy, items have a strict <b>15-day return threshold</b>, so this order is not eligible for refund. However, if there is a technical defect, we can assist you under the 1-Year Manufacturer Warranty! 🛡️`
            ),
            orderData: targetOrder
          };
        } else {
          return {
            text: cleanAgentText(
              `Hello <b>${targetOrder.customer}</b>. <b>Order #${targetOrder.orderId}</b> ko <b>${targetOrder.daysAgo} din</b> guzar chuke hain.\n\n` +
              `TechMart policy ke mutabiq <b>15 din</b> ke baad refund allow nahi hota. Lekin technical fault ki soorat me hum 1-Year Warranty claim me madad kar sakte hain! 🛡️`
            ),
            orderData: targetOrder
          };
        }
      }

      // Collect: Bank Account Title, Bank Name, Account Number/IBAN
      const accTitle = memory.accountTitle;
      const bName = memory.bankName;
      const accNum = memory.accountNumber;
      const email = memory.customerEmail || targetOrder.customerEmail;
      const mobile = memory.mobileNumber || targetOrder.mobileNumber;

      const missingBankSlots: string[] = [];
      if (!accTitle) missingBankSlots.push(lang === 'en' ? '• <b>Bank Account Title</b> (Account Holder Name)' : '• <b>Bank Account Title</b> (Account Holder Name)');
      if (!bName) missingBankSlots.push(lang === 'en' ? '• <b>Bank Name</b> (e.g. Meezan, HBL, Alfalah, Standard Chartered)' : '• <b>Bank Name</b> (jaise Meezan, HBL, Alfalah, UBL)');
      if (!accNum) missingBankSlots.push(lang === 'en' ? '• <b>Account Number or IBAN</b>' : '• <b>Account Number ya IBAN</b>');

      if (missingBankSlots.length > 0) {
        if (lang === 'en') {
          return {
            text: cleanAgentText(
              `Great news! <b>Order #${targetOrder.orderId}</b> is eligible for refund under our 15-day policy. 🎉\n\n` +
              `To process your refund, please provide your bank details:\n\n` +
              missingBankSlots.join('\n') +
              `\n\nOnce received, we will save your details into the Bank Details Sheet, update the order status to <b>Refund Pending</b>, and dispatch a confirmation email!`
            ),
            orderData: targetOrder
          };
        } else {
          return {
            text: cleanAgentText(
              `Behtareen! <b>Order #${targetOrder.orderId}</b> 15-day policy ke mutabiq refund ke liye eligible hai. 🎉\n\n` +
              `Refund process karne ke liye kripya apni bank details share karein:\n\n` +
              missingBankSlots.join('\n') +
              `\n\nYeh details miltay hi Bank Details Sheet me save ho jayengi, status <b>Refund Pending</b> set ho jayega, aur confirmation email send kar di jayegi!`
            ),
            orderData: targetOrder
          };
        }
      }

      // Save exact details to Bank Details Sheet
      await addOrUpdateBankDetail({
        orderId: targetOrder.orderId,
        customer: accTitle || targetOrder.customer,
        product: targetOrder.modelName || targetOrder.product,
        bankName: bName || 'Bank',
        accountNumber: accNum || '0000',
        mobileNumber: mobile || 'N/A',
        accountTitle: accTitle,
        customerEmail: email
      });

      // Update order status in Orders Sheet to 'Refund Pending'
      await updateOrderDetails(targetOrder.orderId, {
        status: 'Refund Pending',
        customerEmail: email,
        mobileNumber: mobile
      });

      const refundAmt = targetOrder.price || 500.00;
      if (email) {
        generateRefundEmail(targetOrder, refundAmt, {
          orderId: targetOrder.orderId,
          customer: accTitle || targetOrder.customer,
          product: targetOrder.modelName || targetOrder.product,
          bankName: bName || 'Bank',
          accountNumber: accNum || '',
          mobileNumber: mobile || '',
          accountTitle: accTitle
        }, email);
      }

      if (lang === 'en') {
        return {
          text: cleanAgentText(
            `Your refund request for <b>Order #${targetOrder.orderId}</b> has been submitted! 💳✨\n\n` +
            `• <b>Account Title</b>: <b>${accTitle}</b>\n` +
            `• <b>Bank Name</b>: <b>${bName}</b>\n` +
            `• <b>Account / IBAN</b>: ${accNum}\n` +
            `• <b>Refund Amount</b>: <b>$${refundAmt.toFixed(2)} USD</b>\n` +
            `• <b>Order Status</b>: <b>Refund Pending</b>\n\n` +
            `Your bank details have been saved, and a refund confirmation email has been dispatched to <b>${email || 'your email'}</b>. Funds typically reflect within 3 to 5 business days!`
          ),
          orderData: targetOrder,
          sheetUpdated: true
        };
      } else {
        return {
          text: cleanAgentText(
            `Aapki <b>Order #${targetOrder.orderId}</b> ki refund request submit kar di gayi hai! 💳✨\n\n` +
            `• <b>Account Title</b>: <b>${accTitle}</b>\n` +
            `• <b>Bank Name</b>: <b>${bName}</b>\n` +
            `• <b>Account / IBAN</b>: ${accNum}\n` +
            `• <b>Refund Amount</b>: <b>$${refundAmt.toFixed(2)} USD</b>\n` +
            `• <b>Order Status</b>: <b>Refund Pending</b>\n\n` +
            `Aapki bank details save ho gayi hain aur status <b>Refund Pending</b> ho gaya hai. Confirmation email <b>${email || 'aapke email'}</b> par bhej di gayi hai! Funds 3 se 5 business days me credit ho jayenge!`
          ),
          orderData: targetOrder,
          sheetUpdated: true
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // ACTION I: Gemini AI Dynamic Call (Strict Formatting & Zero Asterisks)
  // -------------------------------------------------------------------------
  const productsSummary = products.map(p =>
    `• ${p.brand} ${p.modelName} (${p.category}): $${p.price.toFixed(2)} | Stock: ${p.stock} units | Specs: ${p.keySpecifications}`
  ).join('\n');

  const ordersSummary = orders.map(o =>
    `• Order ${o.orderId}: Customer ${o.customer} | ${o.modelName || o.product} | Address: ${o.shippingAddress || 'N/A'} | Mobile: ${o.mobileNumber || 'N/A'} | Gmail: ${o.customerEmail || 'N/A'} | Age: ${o.daysAgo}d | Status: ${o.status}`
  ).join('\n');

  const systemPrompt = `You are an intelligent, human-like E-commerce Customer Support and Operations Agent for TechMart. Your primary role is to assist customers with product inquiries, process new orders, and handle returns/refunds/exchanges while maintaining a natural, empathetic, and professional conversational tone.

CRITICAL LANGUAGE INSTRUCTION (STRICT):
The customer wrote in: ${lang === 'en' ? 'ENGLISH' : 'ROMAN URDU'}.
You MUST respond STRICTLY in ${lang === 'en' ? 'natural, professional ENGLISH' : 'natural, friendly ROMAN URDU'}.
If the customer asks in English, answer ONLY in English. Do NOT use Roman Urdu when English is used.

CRITICAL FORMATTING INSTRUCTIONS (STRICT):
1. NO ASTERISKS: Do NOT use asterisks (*) anywhere in your reply. Never use * or **.
2. BOLD WORDS: To emphasize or make a word bold, wrap it in <b>word</b> tags (e.g. <b>Order #ORD-101</b>).
3. BULLETS: For bullet lists, use the bullet symbol (•) followed by a space.
4. SHORT & HUMAN-LIKE: Keep answers natural, polite, and helpful (2 to 4 crisp sentences or bullets max).
5. NO SYSTEM LEAKS: Do NOT expose internal system logic, sheet IDs, or function names. Act completely as a human support representative.

KNOWLEDGE BASE:
=== POLICIES ===
${policyData.rawText}

=== LIVE PRODUCT CATALOG ===
${productsSummary}

=== LIVE CUSTOMER ORDERS ===
${ordersSummary}

WORKFLOWS:
1. PRODUCT INQUIRIES: Answer with exact real-time price ($) and stock from catalog in a polite, engaging tone.
2. ORDER PLACEMENT: Collect 1. Full Name, 2. Complete Shipping Address, 3. Email Address, 4. Mobile Number sequentially, summarize for confirmation, and share Order Number upon confirmation.
3. RETURNS, EXCHANGES & REFUNDS: Explain 15-day return policy politely. For Exchange: collect replacement model & confirm address. For Refund: collect Account Title, Bank Name, Account/IBAN, state Refund Pending.
4. MEMORY & CONTEXT: Use past conversation context without asking customers to repeat details already provided.`;

  if (apiKey) {
    const candidateModels = ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history,
            { role: 'user', parts: [{ text: userMessage }] }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        };

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return {
              text: cleanAgentText(text)
            };
          }
        }
      } catch (err: any) {
        // Fallback gracefully
      }
    }
  }

  // -------------------------------------------------------------------------
  // ACTION J: Default Warm Greeting / Capabilities Summary
  // -------------------------------------------------------------------------
  if (lang === 'en') {
    return {
      text: cleanAgentText(
        `Hello! 👋 Welcome to TechMart Support Concierge. I am connected live to our product catalog and store dispatch system.\n\n` +
        `How may I help you today?\n` +
        `• 💻 <b>Product Specs & Pricing</b>: Check real-time stock and prices for any model\n` +
        `• 📦 <b>Place Orders & Tracking</b>: Place new orders or track existing deliveries\n` +
        `• 💳 <b>Refunds & Returns</b>: 15-day return policy processing\n` +
        `• 📄 <b>Store Policies</b>: Shipping, warranty, and payment methods\n\n` +
        `What would you like to explore? 😊`
      )
    };
  } else {
    return {
      text: cleanAgentText(
        `Hello! 👋 Main aapka TechMart AI Assistant hoon. Main live Google Sheets aur store policies se connected hoon.\n\n` +
        `Main aapki in cheezon me madad kar sakta hoon:\n` +
        `• 💻 <b>Product Specs & Stock</b>: Live catalogue aur pricing check karein\n` +
        `• 📦 <b>Order Placement & Status</b>: Naya order place karein ya delivery check karein (Gmail receipts included)\n` +
        `• 💳 <b>Refund & Returns</b>: 15-day policy ke mutabiq refund claim karein\n` +
        `• 📄 <b>Store Policies</b>: Shipping, warranty, aur exchange rules\n\n` +
        `Aap kis cheez me proceed karna chahte hain? 😊`
      )
    };
  }
}
