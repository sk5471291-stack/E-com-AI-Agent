# ⚡ TechMart AI Enterprise E-Commerce Support Agent

An AI-powered customer support application built with **Next.js (App Router)**, **Google Gemini**, **Microsoft Word (.docx) Policy Grounding**, and **Google Sheets Live Synchronization**.

The agent assists customers with product-related queries, order tracking, and refund requests grounded in corporate Word policy documents and real-time Google Sheets data.

---

## 🌟 Key Features

1. **AI Chatbot for Customer Support**:
   - Natural language conversational assistant powered by Google Gemini.
   - Context-aware intent detection for pricing, specs, order inquiries, and refund evaluations.
   - Rapid prompt chips and inline interactive product & order cards.

2. **Google Sheets Integration**:
   - **Products Sheet** (`1vWSe1...`): 20 items with category, brand, model, specs, price, and stock levels.
   - **Orders Sheet** (`1xl3LS...`): 9 live customer orders (`ORD-101` to `ORD-109`), tracking elapsed days and status.
   - **Bank Details Sheet** (`1Ic0mn...`): Linked bank names, masked account numbers, and customer mobile numbers for payouts.

3. **Word (.docx) Policy Grounding**:
   - Reads directly from [data/company_policies.docx](file:///d:/Datacrumb/RAG%20chatbot/ecommerce-support-agent/data/company_policies.docx) using `mammoth`.
   - Structures policies into 9 distinct sections (Return Policy, Refund Eligibility, Shipping, Warranty, Exchanges, Promotions, and Support Hours).
   - Allows uploading or downloading custom `.docx` policy files in real-time.

4. **Automated Refund Workflow**:
   - Strictly applies Policy Clause 2 & 9: **15-calendar-day return threshold for electronics** (30 days for general items).
   - Automatically approves orders within 15 days (e.g. `ORD-108`, `ORD-109`, `ORD-101`).
   - Rejects orders exceeding 15 days (e.g. `ORD-102` at 18 days, `ORD-104` at 22 days) with clear policy citations.

5. **Automated Refund Confirmation Emails**:
   - Generates branded, personalized HTML confirmation emails with order ID, item name, refund amount, destination bank account, and transaction reference.
   - Includes an interactive **Customer Email Inbox** simulator to inspect dispatched emails in real time.

6. **Two-Way Google Sheets Audit Logging**:
   - Real-time audit trail logging every customer interaction, order evaluation, and refund transaction status.

---

## 🏗️ 6-Step Workflow Execution

```text
[1. Load Policy (.docx)] ──> [2. Fetch Google Sheets] ──> [3. Customer Asks Question / Request]
                                                                     │
[6. Update Status & Log in Sheets] <── [5. Auto Send Email] <── [4. AI Policy & Refund Evaluation]
```

1. **Load Company Policies from Word (.docx)**: Extracted and indexed via `mammoth`.
2. **Fetch Google Sheets Data**: Retrieves catalog, pricing, order history, and bank details.
3. **Customer Asks Query or Submits Refund**: Evaluates natural language queries or order numbers.
4. **AI Policy Evaluation**: Cross-references exact prices and evaluates 15-day electronics return rules.
5. **Send Automated Confirmation Email**: If approved, immediately sends confirmation email.
6. **Store Interaction & Status in Sheets**: Updates order status to `Return Approved` and records audit entry.

---

## 🚀 Quick Start & Local Execution

### 1. Environment Configuration
Configured in `ecommerce-support-agent/.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_API_KEY=your_gemini_api_key
SHEET_ID_PRODUCTS=1vWSe1-GsTXi9lXrLyEEee0q3QXgtspepO6JWD0DNiPk
SHEET_ID_ORDERS=1xl3LS8xbNuJMGssg5UD89CSbHdnh2FBYMU3on4DI-U0
SHEET_ID_BANK=1Ic0mnXGUEDYoGA5JRoOO3Ofk9NYpa9gJKw-HmzCJfzw
```

### 2. Start the Next.js Application
```bash
cd ecommerce-support-agent
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🧪 Testing the API & Workflows

Run the automated test suite:
```bash
python scripts/test_app.py
```
This tests all 6 workflow steps:
- `GET /` (Next.js client interface)
- `GET /api/policy` (Word .docx parsing)
- `GET /api/sheets?type=all` (Google Sheets sync)
- `POST /api/chat` (Product specs & stock query)
- `POST /api/chat` (Refund for ORD-108 -> Approved + Email)
- `POST /api/chat` (Refund for ORD-102 -> Rejected under 15-day policy)
- `GET /api/emails` (Verification of dispatched confirmation email)
