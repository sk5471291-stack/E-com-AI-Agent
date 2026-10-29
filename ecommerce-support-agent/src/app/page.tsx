'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Package,
  RefreshCw,
  FileText,
  Mail,
  Database,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Download,
  UploadCloud,
  ShieldCheck,
  Tag,
  CreditCard,
  AlertTriangle,
  Info,
  Check,
  Zap,
  ArrowRight,
  Eye
} from 'lucide-react';
import { Product, Order, BankDetail, RefundEvaluation, RefundEmail, InteractionLog, PolicyData, ChatMessage } from '@/types';

function formatMessageContent(content: string) {
  if (!content) return null;
  // Convert markdown bold **word** or *word* to <b>word</b> and remove stray stars
  const clean = content
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/^\s*[\*\-]\s+/gm, '• ')
    .replace(/\*/g, '');

  const parts = clean.split(/(<b>.*?<\/b>)/g);
  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
      {parts.map((part, i) => {
        if (part.startsWith('<b>') && part.endsWith('</b>')) {
          const boldText = part.slice(3, -4);
          return (
            <strong key={i} style={{ fontWeight: 700, color: '#ffffff' }}>
              {boldText}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export default function EcommerceSupportAgentApp() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'chat' | 'products' | 'orders' | 'policy' | 'emails' | 'sheets'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      content: `👋 <b>Welcome to TechMart AI Customer Support Concierge!</b>\n\nMain aapke orders, products, aur refunds me help karne ke liye verified Google Sheets aur company policies se connected hoon.\n\n• 💻 <b>Product Specs & Stock</b>: Live catalogue aur pricing check karein\n• 📦 <b>Order Updates</b>: Name, Order No, Shipping Address, Mobile No live update karein\n• 💳 <b>Refund & Bank Details</b>: 15-day return policy ke mutabiq refund claim karein\n\nMain aapki kis cheez me madad kar sakta hoon? 😊`,
      timestamp: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const thinkingSteps = [
    'Checking product catalog & orders in Google Sheets...',
    'Verifying store return & refund policies (.docx)...',
    'Formulating concise, personalized response...'
  ];

  useEffect(() => {
    if (!isChatLoading) {
      setThinkingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStep(prev => (prev + 1) % thinkingSteps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isChatLoading]);

  // Data Store State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [dispatchedEmails, setDispatchedEmails] = useState<RefundEmail[]>([]);
  const [auditLogs, setAuditLogs] = useState<InteractionLog[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Product Filter State
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');

  // Policy View State
  const [activePolicySection, setActivePolicySection] = useState<string>('');
  const [isUploadingDocx, setIsUploadingDocx] = useState(false);
  const [policyUploadMessage, setPolicyUploadMessage] = useState('');

  // Email Viewer State
  const [selectedEmail, setSelectedEmail] = useState<RefundEmail | null>(null);

  // Quick Order Lookup in sidebar
  const [sidebarOrderId, setSidebarOrderId] = useState('');
  const [sidebarOrderResult, setSidebarOrderResult] = useState<any>(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);

  // Refund Modal State
  const [activeRefundModal, setActiveRefundModal] = useState<{
    order: Order;
    evaluation?: RefundEvaluation;
  } | null>(null);
  const [isProcessingModalRefund, setIsProcessingModalRefund] = useState(false);

  // Initial Data Fetching
  const loadAllData = async () => {
    setIsDataLoading(true);
    try {
      // 1. Fetch Sheets Data
      const sheetsRes = await fetch('/api/sheets?type=all');
      const sheetsJson = await sheetsRes.json();
      if (sheetsJson.success) {
        setProducts(sheetsJson.data.products || []);
        setOrders(sheetsJson.data.orders || []);
        setBankDetails(sheetsJson.data.bankDetails || []);
        setAuditLogs(sheetsJson.data.logs || []);
      }

      // 2. Fetch Policy Data (.docx)
      const policyRes = await fetch('/api/policy');
      const policyJson = await policyRes.json();
      if (policyJson.success) {
        setPolicyData(policyJson.data);
        if (policyJson.data.sections.length > 0) {
          setActivePolicySection(policyJson.data.sections[0].id);
        }
      }

      // 3. Fetch Dispatched Emails
      const emailsRes = await fetch('/api/emails');
      const emailsJson = await emailsRes.json();
      if (emailsJson.success) {
        setDispatchedEmails(emailsJson.data || []);
        if (emailsJson.data?.length > 0 && !selectedEmail) {
          setSelectedEmail(emailsJson.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsChatLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyPayload })
      });

      const data = await res.json();

      if (data.success) {
        const agentMsg: ChatMessage = {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          content: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          orderCard: data.orderData,
          refundResult: data.refundData,
          productCard: data.productData
        };
        setMessages(prev => [...prev, agentMsg]);

        // If refund was processed or sheet was updated, reload all data
        if ((data.refundData && data.refundData.isEligible) || data.sheetUpdated) {
          loadAllData();
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'agent',
            content: `⚠️ Error from AI engine: ${data.error || 'Unable to process query.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          content: `⚠️ Network error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Quick Refund Evaluation from Orders Tab
  const handleTriggerRefund = async (orderId: string) => {
    setIsProcessingModalRefund(true);
    try {
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, autoEmail: true })
      });
      const data = await res.json();

      if (data.success) {
        setActiveRefundModal({
          order: data.order,
          evaluation: data.evaluation
        });
        loadAllData();
      } else {
        alert(data.error || 'Failed to evaluate refund');
      }
    } catch (e: any) {
      alert('Error triggering refund: ' + e.message);
    } finally {
      setIsProcessingModalRefund(false);
    }
  };

  // Handle Policy Docx Upload
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDocx(true);
    setPolicyUploadMessage('Uploading & extracting .docx policy text via mammoth...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/policy', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setPolicyData(data.data);
        if (data.data.sections.length > 0) {
          setActivePolicySection(data.data.sections[0].id);
        }
        setPolicyUploadMessage(`✅ Successfully loaded "${file.name}"! AI knowledge base updated.`);
        setTimeout(() => setPolicyUploadMessage(''), 4000);
      } else {
        setPolicyUploadMessage(`❌ Upload error: ${data.error}`);
      }
    } catch (err: any) {
      setPolicyUploadMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsUploadingDocx(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCat = productCategoryFilter === 'All' || p.category.toLowerCase() === productCategoryFilter.toLowerCase();
    const matchesSearch = productSearch === '' ||
      p.modelName.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.bestFor.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="app-wrapper">
      {/* Enterprise Header */}
      <header className="enterprise-header">
        <div className="header-top">
          <div className="brand-section">
            <div className="brand-logo-glow">⚡</div>
            <div>
              <h1 className="brand-title">TechMart AI Support Agent</h1>
              <p className="brand-subtitle">
                Context-Aware E-Commerce Agent • Word (.docx) Policy Grounding • Google Sheets Synchronization
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={loadAllData}
              disabled={isDataLoading}
              className="action-btn-refund"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              title="Refresh Google Sheets & Document Cache"
            >
              <RefreshCw size={14} className={isDataLoading ? 'spin' : ''} />
              {isDataLoading ? 'Syncing...' : 'Sync Data'}
            </button>
            <a
              href="/company_policies.docx"
              download="TechMart_Company_Policies.docx"
              className="action-btn-refund"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1e293b',
                borderColor: '#475569'
              }}
            >
              <Download size={14} /> Download .docx
            </a>
          </div>
        </div>

        <div className="header-kpi-bar">
          <div className="kpi-chip highlight">
            <span className="pulse-circle"></span>
            Engine: <strong>Gemini 3.8 Flash</strong>
          </div>
          <div className="kpi-chip emerald">
            <ShieldCheck size={14} />
            Policy Doc: <strong>{policyData?.fileName || 'company_policies.docx'}</strong>
          </div>
          <div className="kpi-chip">
            <Database size={14} />
            Products Indexed: <strong>{products.length} Items</strong>
          </div>
          <div className="kpi-chip">
            <Package size={14} />
            Orders Synced: <strong>{orders.length} Records</strong>
          </div>
          <div className="kpi-chip">
            <Mail size={14} />
            Refund Emails Sent: <strong>{dispatchedEmails.length} Dispatched</strong>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <nav className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <Bot size={17} /> AI Support Concierge
        </button>

        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Tag size={17} /> Products & Deals
          <span className="tab-counter">{products.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={17} /> Orders & Refund Hub
          <span className="tab-counter">{orders.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          <FileText size={17} /> Company Policy (.docx)
          <span className="tab-counter">{policyData?.sections.length || 9} Sec</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'emails' ? 'active' : ''}`}
          onClick={() => setActiveTab('emails')}
        >
          <Mail size={17} /> Customer Email Inbox
          <span className="tab-counter">{dispatchedEmails.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'sheets' ? 'active' : ''}`}
          onClick={() => setActiveTab('sheets')}
        >
          <Database size={17} /> Google Sheets Sync & Logs
          <span className="tab-counter">{auditLogs.length}</span>
        </button>
      </nav>

      {/* =========================================================================
          TAB 1: AI SUPPORT CONCIERGE (CHAT)
          ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="chat-grid">
          <div className="chat-main-card">
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-bot-avatar">
                  <Bot size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>TechMart AI Assistant</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                    🟢 Grounded in Google Sheets & Word (.docx) Policy
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMessages([messages[0]])}
                className="filter-btn"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                Clear Chat
              </button>
            </div>

            {/* Chat Stream Area */}
            <div className="chat-stream-area">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message-bubble ${msg.sender}`}>
                  <div className={`msg-avatar ${msg.sender === 'user' ? 'user-av' : 'agent-av'}`}>
                    {msg.sender === 'user' ? '👤' : <Bot size={16} />}
                  </div>
                  <div style={{ maxWidth: '100%' }}>
                    <div className="msg-body">
                      {formatMessageContent(msg.content)}

                      {/* Inline Product Card if present */}
                      {msg.productCard && (
                        <div className="inline-action-card" style={{ marginTop: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: 'var(--accent-cyan)' }}>
                              {msg.productCard.brand} {msg.productCard.modelName}
                            </strong>
                            <span className="price-val" style={{ fontSize: '1.1rem' }}>
                              ${msg.productCard.price.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {msg.productCard.keySpecifications}
                          </div>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`stock-pill ${msg.productCard.stock > 0 ? 'stock-in' : 'stock-out'}`}>
                              {msg.productCard.stock > 0 ? `${msg.productCard.stock} In Stock` : 'Out of Stock'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                              🏷️ Promo code TECH10 eligible
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Inline Refund Card if present */}
                      {msg.refundResult && (
                        <div
                          className={`inline-action-card ${msg.refundResult.isEligible ? 'approved' : 'rejected'}`}
                          style={{ marginTop: '12px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>
                              {msg.refundResult.isEligible ? '✅ Refund Approved' : '❌ Refund Ineligible'}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: msg.refundResult.isEligible ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                              }}
                            >
                              {msg.refundResult.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', marginTop: '6px', color: '#cbd5e1' }}>
                            {msg.refundResult.reason}
                          </div>

                          {msg.refundResult.isEligible && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => setActiveTab('emails')}
                                className="action-btn-refund"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                <Mail size={13} /> View Dispatched Email
                              </button>
                              <button
                                onClick={() => setActiveTab('sheets')}
                                className="filter-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                <Database size={13} /> View Google Sheet Entry
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="msg-meta">
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="chat-message-bubble agent thinking-bubble">
                  <div className="msg-avatar agent-av thinking-avatar">
                    <Sparkles size={16} className="spin" />
                  </div>
                  <div className="msg-body thinking-content">
                    <div className="thinking-header">
                      <span className="thinking-title">
                        Thinking<span className="thinking-dots">...</span>
                      </span>
                      <span className="thinking-pill">
                        <span className="thinking-live-dot"></span>
                        AI Agent
                      </span>
                    </div>
                    <div className="thinking-subtext">
                      <span className="thinking-step-text">
                        💭 {thinkingSteps[thinkingStep]}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Rapid Prompt Chips */}
            <div className="quick-prompts-bar">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                ⚡ Quick Prompts:
              </span>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('maine salman k nmae se order kya')}
              >
                👤 Salman: Place Order (Step 1)
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('MacBook Air M3, House 24 Model Town Lahore, 03001234567, salman@gmail.com')}
              >
                📦 Salman: Details & Gmail (Step 2)
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('ORD-101 ka refund chahiye: Meezan Bank, Account 1234567890, Mobile 03001234567, Gmail ali@gmail.com')}
              >
                💳 Refund ORD-101 with Gmail & Bank
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('Mera order ORD-108 hai, shipping address House 15 Street 2 Lahore aur mobile 03001234567 kardo')}
              >
                📍 Update ORD-108 Address & Mobile
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('What is the price, stock, and specs of MacBook Air M3?')}
              >
                💻 MacBook Air M3 Price & Stock
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('Order ka name update kardo ORD-102 ka customer name Sara Khan kardo')}
              >
                👤 Update Order Customer Name
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('MacBook Air M3 ka stock 12 kardo')}
              >
                📝 Update MacBook Stock to 12
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('I want to return ORD-102 (bought 18 days ago)')}
              >
                ❌ Return ORD-102 (18 Days Old)
              </button>
              <button
                className="prompt-chip"
                onClick={() => handleSendMessage('What promotions and discount coupon codes are currently active?')}
              >
                🏷️ Active Discount Codes
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="chat-input-bar">
              <textarea
                className="chat-textarea"
                placeholder="Ask about products, orders, refunds, return policies, or discounts..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={isChatLoading || !inputQuery.trim()}
              >
                <Send size={16} /> Send
              </button>
            </div>
          </div>

          {/* Chat Sidepanel Widgets */}
          <div className="chat-sidepanel">
            {/* Quick Order Lookup Widget */}
            <div className="panel-card">
              <div className="panel-title">
                <Search size={16} style={{ color: 'var(--accent-cyan)' }} />
                Quick Order & Refund Check
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Enter an order ID to evaluate return policy eligibility and test automated email dispatch.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="e.g. ORD-108 or ORD-102"
                  value={sidebarOrderId}
                  onChange={(e) => setSidebarOrderId(e.target.value)}
                  className="search-box"
                  style={{ minWidth: 'unset', width: '100%', fontSize: '0.84rem' }}
                />
                <button
                  className="action-btn-refund"
                  onClick={async () => {
                    if (!sidebarOrderId.trim()) return;
                    setSidebarLoading(true);
                    try {
                      const res = await fetch('/api/refund', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: sidebarOrderId.trim(), autoEmail: true })
                      });
                      const d = await res.json();
                      setSidebarOrderResult(d);
                      if (d.success) loadAllData();
                    } catch (e: any) {
                      setSidebarOrderResult({ error: e.message });
                    } finally {
                      setSidebarLoading(false);
                    }
                  }}
                  disabled={sidebarLoading}
                >
                  {sidebarLoading ? '...' : 'Check'}
                </button>
              </div>

              {sidebarOrderResult && (
                <div
                  className={`inline-action-card ${
                    sidebarOrderResult.success && sidebarOrderResult.evaluation?.isEligible ? 'approved' : 'rejected'
                  }`}
                >
                  {sidebarOrderResult.success ? (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {sidebarOrderResult.evaluation?.isEligible ? '✅ Refund Approved' : '❌ Ineligible for Refund'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px' }}>
                        Customer: <b>{sidebarOrderResult.order?.customer}</b> ({sidebarOrderResult.order?.daysAgo} days ago)
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {sidebarOrderResult.evaluation?.reason}
                      </div>

                      {sidebarOrderResult.evaluation?.isEligible && (
                        <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--accent-emerald)' }}>
                          ✓ Confirmation email sent!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>
                      {sidebarOrderResult.error || 'Order not found'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Promotions Widget */}
            <div className="panel-card">
              <div className="panel-title">
                <Tag size={16} style={{ color: 'var(--accent-amber)' }} />
                Active Store Promotions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>TECH10</code>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>10% OFF</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Applies on orders over $100 storewide.
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>SAVE15</code>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>15% OFF</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Students & educators on laptops and audio.
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#ffffff' }}>Free Standard Shipping</strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>FREE</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Automatically applied on all orders &gt; $50.00.
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Reference Badge */}
            <div className="panel-card" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                📄 Verified Policy Word (.docx) Grounding
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All refund eligibility evaluations strictly comply with <b>Section 2 (15-day return window)</b> and{' '}
                <b>Section 9 (Refund Processing)</b> from <code>company_policies.docx</code>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PRODUCT CATALOG & PROMOTIONS
          ========================================================================= */}
      {activeTab === 'products' && (
        <div>
          <div className="catalog-header-bar">
            <div className="filter-group">
              {['All', 'Laptop', 'Phone', 'Tablet', 'Headphones', 'Keyboard', 'Mouse'].map(cat => (
                <button
                  key={cat}
                  className={`filter-btn ${productCategoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setProductCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search products, brands, specs..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="search-box"
              />
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map(p => (
              <div key={p.id} className="product-item-card">
                <div className="card-top-row">
                  <span className="brand-badge">{p.brand}</span>
                  <span
                    className={`stock-pill ${
                      p.stock === 0 ? 'stock-out' : p.stock < 5 ? 'stock-low' : 'stock-in'
                    }`}
                  >
                    {p.stock === 0 ? 'Out of Stock' : p.stock < 5 ? `Low Stock (${p.stock})` : `${p.stock} in Stock`}
                  </span>
                </div>

                <div className="product-title">{p.modelName}</div>
                <div className="product-specs">{p.keySpecifications}</div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  🎯 Best for: <b>{p.bestFor}</b>
                </div>

                <div className="product-price-row">
                  <div>
                    <span className="price-val">${p.price.toFixed(2)}</span>
                    {p.price > 50 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                        ✓ Free Standard Shipping
                      </span>
                    )}
                  </div>

                  <button
                    className="action-btn-refund"
                    style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                    onClick={() => {
                      setActiveTab('chat');
                      handleSendMessage(`Tell me more about the ${p.brand} ${p.modelName}, its price, stock, and available discounts.`);
                    }}
                  >
                    Ask AI Assistant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ORDERS & REFUND HUB
          ========================================================================= */}
      {activeTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Customer Orders & Refund Processor</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Directly fetched from Google Sheets (<code>Orders</code>). Electronics are subject to a 15-day return policy.
              </p>
            </div>
            <button onClick={loadAllData} className="action-btn-refund" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <RefreshCw size={14} /> Refresh Orders
            </button>
          </div>

          <div className="orders-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Model / Product</th>
                  <th>Shipping Address</th>
                  <th>Mobile Number</th>
                  <th>Gmail Address</th>
                  <th>Age (Days)</th>
                  <th>15-Day Policy Window</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const isEligibleWindow = o.daysAgo <= 15;
                  const isApproved = o.status === 'Return Approved';

                  return (
                    <tr key={o.orderId}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {o.orderId}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.customer}</td>
                      <td>{o.modelName || o.product}</td>
                      <td style={{ fontSize: '0.82rem', color: o.shippingAddress && o.shippingAddress !== '############' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {o.shippingAddress && o.shippingAddress !== '############' ? o.shippingAddress : <span style={{ opacity: 0.5 }}>Not set</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: o.mobileNumber && o.mobileNumber !== '0300######' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                        {o.mobileNumber && o.mobileNumber !== '0300######' ? o.mobileNumber : <span style={{ opacity: 0.5 }}>Not set</span>}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: o.customerEmail ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                        {o.customerEmail ? o.customerEmail : <span style={{ opacity: 0.5 }}>Not set</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        <strong>{o.daysAgo}</strong>d ago
                      </td>
                      <td>
                        {isEligibleWindow ? (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Within 15 Days
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={14} /> Exceeded (&gt;15 Days)
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            isApproved
                              ? 'order-badge-approved'
                              : o.status === 'Order Placed'
                              ? 'order-badge-placed'
                              : 'order-badge-pending'
                          }
                        >
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn-refund"
                          onClick={() => handleTriggerRefund(o.orderId)}
                          disabled={isProcessingModalRefund}
                        >
                          Evaluate Refund
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: COMPANY POLICIES (.DOCX VIEWER)
          ========================================================================= */}
      {activeTab === 'policy' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Company Policies (.docx Knowledge Base)</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Loaded from Microsoft Word document <code>{policyData?.fileName}</code> parsed via <code>mammoth</code>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label
                className="action-btn-refund"
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
                  borderColor: '#818cf8'
                }}
              >
                <UploadCloud size={14} /> Upload Custom .docx
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleDocxUpload}
                  style={{ display: 'none' }}
                  disabled={isUploadingDocx}
                />
              </label>

              <a
                href="/company_policies.docx"
                download="TechMart_Company_Policies.docx"
                className="action-btn-refund"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download .docx
              </a>
            </div>
          </div>

          {policyUploadMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid var(--accent-cyan)',
                marginBottom: '1rem',
                fontSize: '0.88rem'
              }}
            >
              {policyUploadMessage}
            </div>
          )}

          <div className="policy-container">
            {/* Section Index */}
            <div className="policy-nav-list">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                📑 Policy Sections:
              </div>
              {policyData?.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={`policy-nav-item ${activePolicySection === sec.id ? 'active' : ''}`}
                  onClick={() => setActivePolicySection(sec.id)}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', opacity: 0.7, marginRight: '6px' }}>
                    0{idx + 1}.
                  </span>
                  {sec.title}
                </div>
              ))}
            </div>

            {/* Section Full Text */}
            <div className="policy-doc-content">
              {policyData?.sections
                .filter(sec => !activePolicySection || sec.id === activePolicySection)
                .map(sec => (
                  <div key={sec.id} className="policy-section-card">
                    <h3 className="policy-section-title">
                      <ShieldCheck size={20} style={{ color: 'var(--accent-cyan)' }} />
                      {sec.title}
                    </h3>
                    <div className="policy-section-text">{sec.content}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CUSTOMER EMAIL INBOX
          ========================================================================= */}
      {activeTab === 'emails' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Customer Email Dispatch Simulator</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time audit of automated refund confirmation emails sent to customers upon approval.
            </p>
          </div>

          {dispatchedEmails.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem',
                textAlign: 'center'
              }}
            >
              <Mail size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Emails Dispatched Yet</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px' }}>
                Approve an order refund (such as <b>ORD-108</b> or <b>ORD-109</b>) to trigger automated confirmation emails!
              </p>
              <button
                className="action-btn-refund"
                style={{ marginTop: '16px' }}
                onClick={() => handleTriggerRefund('ORD-108')}
              >
                ⚡ Trigger Test Refund for ORD-108
              </button>
            </div>
          ) : (
            <div className="email-inbox-grid">
              <div className="email-list-panel">
                <div className="email-list-header">
                  <span>Inbox ({dispatchedEmails.length} Messages)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Live Dispatch Active</span>
                </div>

                {dispatchedEmails.map(em => (
                  <div
                    key={em.id}
                    className={`email-item ${selectedEmail?.id === em.id ? 'active' : ''}`}
                    onClick={() => setSelectedEmail(em)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>{em.customerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                        ${em.refundAmount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {em.subject}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      To: {em.customerEmail} • {em.timestamp}
                    </div>
                  </div>
                ))}
              </div>

              {selectedEmail && (
                <div className="email-preview-viewer">
                  <div className="email-viewer-toolbar">
                    <div>
                      <strong>{selectedEmail.subject}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        To: {selectedEmail.customerName} &lt;{selectedEmail.customerEmail}&gt; | Ref: {selectedEmail.transactionRef}
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="filter-btn"
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Print Receipt
                    </button>
                  </div>
                  <iframe
                    className="email-iframe-frame"
                    srcDoc={selectedEmail.bodyHtml}
                    title="Refund Email Preview"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: GOOGLE SHEETS SYNC & AUDIT LOGS
          ========================================================================= */}
      {activeTab === 'sheets' && (
        <div className="sheets-sync-dashboard">
          <div className="sync-status-card">
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulse-circle"></span> Google Sheets Two-Way Synchronization
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Interaction history and approved refund statuses are recorded in real-time.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={loadAllData} className="action-btn-refund" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} /> Synchronize Now
              </button>
            </div>
          </div>

          {/* Service Account Integration Card */}
          <div className="panel-card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
                  Google Sheets Integration Active (Service Account)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Connected Account: <code style={{ color: 'var(--accent-cyan)' }}>e-com-ai-agent@blissful-star-512209-k1.iam.gserviceaccount.com</code>
                </p>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Tip: Grant <strong>Editor</strong> permission to this email in Google Sheets Share dialog for live sheet writes.
              </div>
            </div>
          </div>

          <div className="sheet-cards-grid">
            {/* Products Sheet Card */}
            <div className="sheet-link-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>1. Products Sheet (Sheet2)</strong>
                <span className="brand-badge">{products.length} Products</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Live catalog with model names, prices, categories, and real-time inventory counts.
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/1PO1hBFvYwMzIr79qGVdiuZpSTgyW72AGEI8LlSPkGlw/edit?gid=515198597#gid=515198597"
                target="_blank"
                rel="noreferrer"
                className="filter-btn"
                style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                Open Products Sheet <ExternalLink size={13} />
              </a>
            </div>

            {/* Orders Sheet Card */}
            <div className="sheet-link-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>2. Orders Sheet (Sheet1)</strong>
                <span className="brand-badge">{orders.length} Orders</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Stores customer orders (ORD-101 to ORD-109), elapsed days, and live return statuses.
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/16ZP9_maMi2Hq5y6lsJ1jVEYzjA_nz5i2Ru8c3zPU6AQ/edit?gid=0#gid=0"
                target="_blank"
                rel="noreferrer"
                className="filter-btn"
                style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                Open Orders Sheet <ExternalLink size={13} />
              </a>
            </div>

            {/* Bank Details Sheet Card */}
            <div className="sheet-link-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>3. Bank Details Sheet (Sheet1)</strong>
                <span className="brand-badge">{bankDetails.length} Accounts</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Linked customer bank accounts for automatic reimbursement and refund verification.
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/1MVZZaGEKqwbcsTjcGiy0R6DszgHDKKxjxV4E2IDEqr4/edit?gid=0#gid=0"
                target="_blank"
                rel="noreferrer"
                className="filter-btn"
                style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                Open Bank Details Sheet <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Real-time Interaction Audit Logs */}
          <div className="panel-card" style={{ marginTop: '0.5rem' }}>
            <div className="panel-title">
              <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
              Live Customer Interaction & Refund Audit Trail
            </div>

            <div>
              {auditLogs.map((log) => (
                <div key={log.id} className="log-entry">
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className="log-badge">{log.statusBadge}</span>
                  <div style={{ flex: 1, color: '#e2e8f0' }}>
                    {log.customerName && <strong style={{ color: 'var(--accent-cyan)' }}>[{log.customerName}] </strong>}
                    {log.orderId && <code style={{ color: 'var(--accent-amber)', marginRight: '6px' }}>{log.orderId}</code>}
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REFUND EVALUATION POPUP MODAL
          ========================================================================= */}
      {activeRefundModal && (
        <div className="modal-overlay" onClick={() => setActiveRefundModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Refund Policy Evaluation</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Order <b>#{activeRefundModal.order.orderId}</b> • {activeRefundModal.order.customer}
                </p>
              </div>
              <button
                onClick={() => setActiveRefundModal(null)}
                className="filter-btn"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            {activeRefundModal.evaluation ? (
              <div>
                <div
                  className={`inline-action-card ${
                    activeRefundModal.evaluation.isEligible ? 'approved' : 'rejected'
                  }`}
                  style={{ marginBottom: '1.25rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {activeRefundModal.evaluation.isEligible ? '✅ Refund Approved' : '❌ Refund Request Rejected'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: activeRefundModal.evaluation.isEligible ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                      }}
                    >
                      {activeRefundModal.evaluation.status}
                    </span>
                  </div>

                  <p style={{ marginTop: '8px', fontSize: '0.88rem', color: '#cbd5e1' }}>
                    {activeRefundModal.evaluation.reason}
                  </p>

                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    📜 Grounding: {activeRefundModal.evaluation.policyClause}
                  </div>
                </div>

                {activeRefundModal.evaluation.isEligible && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '14px', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Refunded Amount:</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--accent-emerald)' }}>
                        ${activeRefundModal.evaluation.refundAmount.toFixed(2)} USD
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Destination Bank:</span>
                      <strong>{activeRefundModal.evaluation.bankDetails?.bankName || 'Direct Credit (Original Method)'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Account Number:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>
                        {activeRefundModal.evaluation.bankDetails?.accountNumber
                          ? `•••• ${activeRefundModal.evaluation.bankDetails.accountNumber.slice(-4)}`
                          : 'On File'}
                      </strong>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                      📬 Automated confirmation email was generated and delivered to customer inbox.
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  {activeRefundModal.evaluation.isEligible && (
                    <button
                      className="action-btn-refund"
                      onClick={() => {
                        setActiveRefundModal(null);
                        setActiveTab('emails');
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Mail size={14} /> Open Customer Inbox
                    </button>
                  )}
                  <button
                    className="filter-btn"
                    onClick={() => setActiveRefundModal(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>Loading evaluation...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
