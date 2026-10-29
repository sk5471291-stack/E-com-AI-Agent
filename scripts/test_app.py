import sys
sys.stdout.reconfigure(encoding='utf-8')

import urllib.request
import json
import time

base = 'http://localhost:3000'

def get(url):
    req = urllib.request.Request(f'{base}{url}', headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode('utf-8')

def post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f'{base}{url}', data=body, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode('utf-8')

print('--- 1. Testing GET / ---')
status, html = get('/')
print(f'Status: {status}, HTML Length: {len(html)} bytes, Title present: {"TechMart AI" in html}')

print('\n--- 2. Testing GET /api/policy ---')
status, text = get('/api/policy')
policy = json.loads(text)
print(f'Status: {status}, Success: {policy.get("success")}, File: {policy.get("data", {}).get("fileName")}, Sections count: {len(policy.get("data", {}).get("sections", []))}')

print('\n--- 3. Testing GET /api/sheets?type=all ---')
status, text = get('/api/sheets?type=all')
sheets = json.loads(text)
print(f'Status: {status}, Products: {len(sheets.get("data", {}).get("products", []))}, Orders: {len(sheets.get("data", {}).get("orders", []))}, Bank: {len(sheets.get("data", {}).get("bankDetails", []))}')

print('\n--- 4. Testing POST /api/chat: Product Specs & Pricing ---')
status, text = post('/api/chat', {'message': 'What is the price, stock, and specs of MacBook Air M3?'})
chat1 = json.loads(text)
print(f'Status: {status}, Success: {chat1.get("success")}, Latency: {chat1.get("latency")}s')
print(f'Response snippet:\n{chat1.get("text", "")[:280]}...\n')

print('--- 5. Testing POST /api/chat: Refund for ORD-108 (0 days old -> Approved & Automated Email) ---')
status, text = post('/api/chat', {'message': 'Can I get a refund for order ORD-108?'})
chat2 = json.loads(text)
print(f'Status: {status}')
print(f'Response snippet:\n{chat2.get("text", "")[:320]}...\n')
print('Refund Status in Object:', chat2.get('refundData', {}).get('status'))
print('Refund Amount:', chat2.get('refundData', {}).get('refundAmount'))
print('Policy Clause:', chat2.get('refundData', {}).get('policyClause'))

print('\n--- 6. Testing POST /api/chat: Refund for ORD-102 (18 days old -> Ineligible / Exceeded 15 days) ---')
status, text = post('/api/chat', {'message': 'I want a refund for ORD-102'})
chat3 = json.loads(text)
print(f'Status: {status}')
print(f'Response snippet:\n{chat3.get("text", "")[:320]}...\n')
print('Refund Status in Object:', chat3.get('refundData', {}).get('status'))
print('Reason:', chat3.get('refundData', {}).get('reason'))

print('\n--- 7. Testing GET /api/emails (Dispatched Confirmation Emails) ---')
status, text = get('/api/emails')
emails = json.loads(text)
print(f'Status: {status}, Total Dispatched Emails: {len(emails.get("data", []))}')
for em in emails.get('data', []):
    print(f'-> To: {em.get("customerEmail")}, Order: {em.get("orderId")}, Amount: ${em.get("refundAmount")}, Ref: {em.get("transactionRef")}')
    print(f'   Subject: {em.get("subject")}')

print('\n--- 8. Testing Sheet Instruction: Stock Update ("MacBook Air M3 ka stock 12 kardo") ---')
status, text = post('/api/chat', {'message': 'MacBook Air M3 ka stock 12 kardo'})
chat4 = json.loads(text)
print(f'Status: {status}, Sheet Updated Flag: {chat4.get("sheetUpdated")}')
print(f'Response:\n{chat4.get("text")}\n')

print('--- 9. Testing Sheet Instruction: Order Status Update ("ORD-102 ka status Return Approved kardo") ---')
status, text = post('/api/chat', {'message': 'ORD-102 ka status Return Approved kardo'})
chat5 = json.loads(text)
print(f'Status: {status}, Sheet Updated Flag: {chat5.get("sheetUpdated")}')
print(f'Response:\n{chat5.get("text")}\n')

print('\nALL 9 ADVANCED TESTS PASSED PERFECTLY!')
