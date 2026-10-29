import os
import zipfile

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

with open('data/company_info.txt', 'r', encoding='utf-8') as f:
    text = f.read()

extra_policy = '''

8. DISCOUNTS, PROMOTIONS & PRICE MATCH POLICY
- Promo Code TECH10: Grants an instant 10% discount on all orders over $100.
- Promo Code SAVE15: Exclusive 15% discount for verified students and educators on laptops, tablets, and headphones.
- Free Standard Shipping: Automatically applied at checkout for all cart totals of $50.00 or more.
- Bundle Discount: Purchasing a laptop and mouse together automatically applies a $25 instant bundle rebate.
- Price Match Guarantee: TechMart will match any lower verified advertised price from authorized US retailers within 7 days of purchase.
- Clearance / Final Sale: Items marked with discount >= 50% or 'Final Sale' are sold as-is and cannot be returned or refunded.

9. REFUND PROCESS & CRITERIA EVALUATION
- Eligibility Rule 1 (Timeframe): Return/Refund requests must be submitted within 15 calendar days of order delivery for electronics (laptops, phones, tablets, headphones, keyboards, mice) and within 30 calendar days for general accessories.
- Eligibility Rule 2 (Condition): Products must be in original condition, undamaged, with original packaging, cables, manuals, and accessories.
- Eligibility Rule 3 (Final Sale): Final sale or clearance items with >= 50% discount are strictly non-refundable.
- Automatic Approval & Payout: Once a refund request is approved, an automated refund confirmation email is immediately sent to the customer's registered email address, specifying the refunded amount, bank details, and transaction reference.
- Payout Schedule: Funds are remitted to the customer's bank account or original card within 3 to 5 business days.
- Logging: All customer support interactions, return evaluations, and refund transaction statuses are logged synchronously in Google Sheets.
'''

full_text = text + extra_policy

paragraphs_xml = []
for line in full_text.splitlines():
    escaped_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')) or 'POLICY' in line or 'COMPANY' in line:
        p_xml = f'<w:p><w:pPr><w:b/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>{escaped_line}</w:t></w:r></w:p>'
    elif line.strip() == '':
        p_xml = '<w:p/>'
    else:
        p_xml = f'<w:p><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{escaped_line}</w:t></w:r></w:p>'
    paragraphs_xml.append(p_xml)

document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(paragraphs_xml)}
  </w:body>
</w:document>'''

os.makedirs('data', exist_ok=True)
docx_path = 'data/company_policies.docx'
with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as docx:
    docx.writestr('[Content_Types].xml', content_types)
    docx.writestr('_rels/.rels', rels)
    docx.writestr('word/document.xml', document_xml)

print(f'Successfully created {docx_path}, size={os.path.getsize(docx_path)} bytes')
