"""
app.py - TechMart Enterprise AI Knowledge Assistant
Ultra-Fast Streaming RAG System with a High-Contrast Premium Tech Theme
"""

import os
import time
import importlib
import streamlit as st
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()

# Force dynamic module reload so updates to rag.py take effect immediately
import rag
importlib.reload(rag)

# Set Streamlit Page Configuration
st.set_page_config(
    page_title="TechMart Enterprise AI // Knowledge Engine",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# High-Contrast Executive Tech Theme (Maximum Legibility & Modern Polish)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* Global Typography & Canvas */
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #f8fafc !important;
    }

    .stApp {
        background: linear-gradient(180deg, #0b1120 0%, #070d18 100%);
    }

    .main .block-container {
        padding-top: 1.5rem;
        padding-bottom: 3.5rem;
        max-width: 950px;
    }

    /* Enforce High Contrast Text for all standard tags */
    p, span, label, li {
        color: #e2e8f0 !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
        color: #ffffff !important;
        font-family: 'Outfit', sans-serif !important;
    }

    /* Enterprise Header Hero */
    .tech-hero {
        position: relative;
        background: linear-gradient(135deg, #111e38 0%, #0d172b 100%);
        border: 1px solid #29406b;
        border-radius: 14px;
        padding: 1.8rem 2.2rem;
        margin-bottom: 1.6rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }

    .tech-hero::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #34d399 100%);
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #38bdf8 !important;
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.35);
        padding: 4px 12px;
        border-radius: 20px;
        margin-bottom: 0.8rem;
    }

    .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #10b981;
        box-shadow: 0 0 10px #10b981;
    }

    .hero-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.85rem;
        font-weight: 700;
        color: #ffffff !important;
        margin: 0;
        line-height: 1.25;
    }

    .hero-desc {
        color: #94a3b8 !important;
        font-size: 0.95rem;
        margin-top: 0.5rem;
        line-height: 1.5;
        max-width: 720px;
    }

    /* KPI Status Strip */
    .kpi-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.2rem;
        padding-top: 1rem;
        border-top: 1px solid #1e2e4a;
    }

    .kpi-item {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        color: #e2e8f0 !important;
        background: #0d182e;
        border: 1px solid #23385d;
        border-radius: 8px;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .kpi-item b {
        color: #38bdf8 !important;
    }

    /* Prompt Suggestion Card Chips */
    .prompt-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.76rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #94a3b8 !important;
        margin-bottom: 0.6rem;
        margin-top: 0.5rem;
    }

    /* Source Citation Cards */
    .source-card {
        background: #0f1c33 !important;
        border: 1px solid #253d66 !important;
        border-left: 4px solid #38bdf8 !important;
        border-radius: 10px;
        padding: 0.9rem 1.15rem;
        margin-bottom: 0.65rem;
        font-size: 0.88rem;
        line-height: 1.55;
    }

    .source-card div {
        color: #e2e8f0 !important;
    }

    .badge-pill {
        display: inline-flex;
        align-items: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 6px;
        margin-right: 6px;
    }

    .badge-txt {
        background: #0369a1 !important;
        color: #ffffff !important;
        border: 1px solid #38bdf8;
    }

    .badge-xlsx {
        background: #047857 !important;
        color: #ffffff !important;
        border: 1px solid #34d399;
    }

    .badge-chunk {
        background: #334155 !important;
        color: #f1f5f9 !important;
        border: 1px solid #475569;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background: #090e1a !important;
        border-right: 1px solid #1e293b !important;
    }

    /* Buttons */
    .stButton > button {
        background: #172542 !important;
        border: 1px solid #2d4673 !important;
        color: #f8fafc !important;
        font-size: 0.82rem;
        font-weight: 500;
        border-radius: 8px;
        padding: 0.5rem 0.8rem;
        transition: all 0.2s ease;
    }

    .stButton > button:hover {
        background: #0284c7 !important;
        border-color: #38bdf8 !important;
        color: #ffffff !important;
        transform: translateY(-1px);
    }

    /* Chat Input Bar */
    .stChatInput textarea {
        background: #101c33 !important;
        color: #ffffff !important;
        font-size: 0.95rem !important;
    }

    /* Chat Message Bubbles */
    div[data-testid="stChatMessage"] {
        background: #101b30 !important;
        border: 1px solid #22375b !important;
        border-radius: 12px !important;
        padding: 1.1rem 1.35rem !important;
        margin-bottom: 0.9rem !important;
    }

    div[data-testid="stChatMessage"] p {
        color: #f1f5f9 !important;
        font-size: 0.96rem !important;
        line-height: 1.65 !important;
    }

    div[data-testid="stChatMessage"] li {
        color: #f1f5f9 !important;
        font-size: 0.95rem !important;
        line-height: 1.6 !important;
    }

    .latency-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.74rem;
        color: #34d399 !important;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        border-radius: 12px;
        padding: 3px 9px;
        margin-top: 8px;
    }
</style>
""", unsafe_allow_html=True)


# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []

if "provider" not in st.session_state:
    st.session_state.provider = "Gemini"

gemini_env_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
if "gemini_api_key" not in st.session_state:
    st.session_state.gemini_api_key = gemini_env_key

if "openai_api_key" not in st.session_state:
    st.session_state.openai_api_key = os.getenv("OPENAI_API_KEY", "")

if "pending_query" not in st.session_state:
    st.session_state.pending_query = None


# Cached Vector Store Loader
@st.cache_resource(show_spinner=False)
def load_and_index_data(api_key: str, provider: str = "gemini", data_dir: str = "data"):
    """
    Loads company documents, chunks them, and builds a FAISS index once at startup.
    """
    raw_docs = rag.load_documents(data_dir=data_dir)
    if not raw_docs:
        raise ValueError(f"No documents could be loaded from '{data_dir}'.")

    chunks = rag.chunk_documents(raw_docs, chunk_size=500, chunk_overlap=50)
    vectorstore = rag.build_vectorstore(chunks, api_key=api_key, provider=provider)
    
    file_summary = {}
    for doc in raw_docs:
        src = doc.metadata.get("source", "unknown")
        ftype = doc.metadata.get("file_type", "File")
        file_summary[src] = ftype

    return vectorstore, len(raw_docs), len(chunks), file_summary


# ==========================================
# SIDEBAR CONTROLS
# ==========================================
with st.sidebar:
    st.markdown("### ⚡ System Core")

    # Engine Provider Selection
    provider_choice = st.radio(
        "Inference & Embedding Engine",
        options=["Gemini (Ultra Fast)", "OpenAI"],
        index=0 if "gemini" in st.session_state.provider.lower() else 1,
        help="Google Gemini is configured as the high-speed primary engine."
    )
    selected_provider = "gemini" if "gemini" in provider_choice.lower() else "openai"
    st.session_state.provider = selected_provider

    if selected_provider == "gemini":
        key_input = st.text_input(
            "Gemini API Key",
            value=st.session_state.gemini_api_key,
            type="password",
            placeholder="AQ.Ab8...",
            help="Preloaded from environment."
        )
        if key_input != st.session_state.gemini_api_key:
            st.session_state.gemini_api_key = key_input
            st.cache_resource.clear()
            st.rerun()

        active_key = st.session_state.gemini_api_key.strip()

        # Fast Gemini models with gemini-3.5-flash-lite as default
        model_map = {
            "⚡ gemini-3.5-flash-lite (Ultra Fast)": "models/gemini-3.5-flash-lite",
            "🚀 gemini-flash-latest (Balanced)": "models/gemini-flash-latest",
            "🧠 gemini-3.8-flash (High Precision)": "models/gemini-3.8-flash"
        }
        model_display = st.selectbox("Model Selector", list(model_map.keys()), index=0)
        active_model = model_map[model_display]

    else:
        key_input = st.text_input(
            "OpenAI API Key",
            value=st.session_state.openai_api_key,
            type="password",
            placeholder="sk-proj-...",
            help="OpenAI API Key for GPT models."
        )
        if key_input != st.session_state.openai_api_key:
            st.session_state.openai_api_key = key_input
            st.cache_resource.clear()
            st.rerun()

        active_key = st.session_state.openai_api_key.strip()
        model_map = {
            "⚡ gpt-4o-mini (Fast)": "gpt-4o-mini",
            "🧠 gpt-4o (Max Reasoning)": "gpt-4o",
            "📦 gpt-3.5-turbo (Legacy)": "gpt-3.5-turbo"
        }
        model_display = st.selectbox("Model Selector", list(model_map.keys()), index=0)
        active_model = model_map[model_display]

    # Connection Status Beacon
    if active_key:
        st.success(f"🟢 {selected_provider.upper()} Connected", icon="✅")
    else:
        st.warning(f"🟡 {selected_provider.upper()} Key Required", icon="⚠️")

    st.markdown("---")

    # Hyperparameters
    st.markdown("### 🎛️ Retrieval Tuning")
    retrieval_k = st.slider("Top Chunks Retrieved (k)", min_value=1, max_value=6, value=3, step=1)
    temperature = st.slider("Temperature (0 = Strict Facts)", min_value=0.0, max_value=0.5, value=0.0, step=0.05)

    st.markdown("---")

    # Local Knowledge Base Specs
    st.markdown("### 🗄️ Enterprise Data Sources")
    st.markdown("""
    - **Policy**: `data/company_info.txt`
    - **Catalog**: `data/products.xlsx`
    - **Chunk Splitting**: `500 chars (50 overlap)`
    - **Vector Architecture**: `FAISS In-Memory`
    """)

    st.markdown("---")

    # Control Actions
    col_act1, col_act2 = st.columns(2)
    with col_act1:
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.session_state.pending_query = None
            st.rerun()
    with col_act2:
        if st.button("🔄 Rebuild Index", use_container_width=True):
            st.cache_resource.clear()
            st.rerun()


# ==========================================
# MAIN INTERFACE
# ==========================================

# Enterprise Hero Section
st.markdown(f"""
<div class="tech-hero">
    <div class="hero-badge">
        <span class="pulse-dot"></span>
        TechMart Core // Agentic RAG Pipeline v2.5
    </div>
    <h1 class="hero-title">Enterprise AI Knowledge Assistant</h1>
    <p class="hero-desc">
        Deterministic, real-time knowledge retrieval answering queries strictly from internal corporate policies (.txt) and product databases (.xlsx).
    </p>
    <div class="kpi-strip">
        <div class="kpi-item">🟢 Engine: <b>{selected_provider.upper()}</b></div>
        <div class="kpi-item">⚡ Latency: <b>Ultra-Low Streaming</b></div>
        <div class="kpi-item">🛡️ Guardrails: <b>Strict Ground-Truth</b></div>
        <div class="kpi-item">📑 Chunks: <b>11 Vectors Loaded</b></div>
    </div>
</div>
""", unsafe_allow_html=True)


# Verify API Key
if not active_key:
    st.info(f"""
    ### 🔑 API Key Required
    
    Please ensure your **{selected_provider.upper()} API Key** is active in the sidebar or specified in `.env`.
    """)
    st.stop()


# Load & Index Vector Store
vectorstore = None
with st.spinner(f"⚡ Initializing FAISS Vector Cache with {selected_provider.upper()} embeddings..."):
    try:
        vectorstore, doc_count, chunk_count, file_summary = load_and_index_data(
            api_key=active_key,
            provider=selected_provider,
            data_dir="data"
        )
    except Exception as e:
        st.error(f"❌ Failed to initialize Vector Store: {str(e)}")
        st.info("Check your API Key and verify that files exist in the `data/` directory.")
        st.stop()


# Quick Interaction Hub (Sample Questions)
st.markdown('<div class="prompt-label">⚡ Rapid Inquiry Prompts:</div>', unsafe_allow_html=True)
col_q1, col_q2, col_q3, col_q4, col_q5 = st.columns(5)

sample_actions = [
    (col_q1, "💻 MacBook M3 Stock", "What is the price and stock of MacBook Air M3?"),
    (col_q2, "📦 Return Policy", "What is the return policy for electronics?"),
    (col_q3, "🚚 Express Shipping", "How much does express shipping cost and how long does it take?"),
    (col_q4, "🛡️ Laptop Warranty", "What is the warranty coverage for laptops?"),
    (col_q5, "🔒 Out-of-Domain", "Who is the president of France?")
]

for col, label, query_text in sample_actions:
    with col:
        if st.button(label, use_container_width=True, key=f"quick_{label}"):
            st.session_state.pending_query = query_text
            st.rerun()

st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)


# Render Chat History
for message in st.session_state.messages:
    role = message["role"]
    avatar = "👤" if role == "user" else "⚡"
    with st.chat_message(role, avatar=avatar):
        st.markdown(message["content"])

        # Display latency pill if available
        if message.get("latency"):
            st.markdown(f'<div class="latency-pill">⚡ Streamed in {message["latency"]:.2f}s</div>', unsafe_allow_html=True)

        # Display retrieved sources if available
        if message.get("sources"):
            with st.expander(f"🔍 Verified Knowledge Citations ({len(message['sources'])} Chunks Retrieved)", expanded=False):
                for idx, src_doc in enumerate(message["sources"], 1):
                    file_name = src_doc.metadata.get("source", "Unknown")
                    file_type = src_doc.metadata.get("file_type", "File")
                    badge_class = "badge-xlsx" if "xls" in file_name.lower() else "badge-txt"

                    st.markdown(f"""
                    <div class="source-card">
                        <div>
                            <span class="badge-pill {badge_class}">[{file_type.upper()}] {file_name}</span>
                            <span class="badge-pill badge-chunk">Chunk #{idx}</span>
                            <span style="color: #94a3b8; font-size: 0.75rem;">({len(src_doc.page_content)} chars)</span>
                        </div>
                        <div style="margin-top: 8px; color: #e2e8f0; font-family: 'Inter', sans-serif;">{src_doc.page_content}</div>
                    </div>
                    """, unsafe_allow_html=True)


# Handle Prompt Input (either typed or clicked from prompt chips)
user_prompt = st.chat_input("Ask a question about products, specs, stock, return or shipping policies...")

if st.session_state.pending_query:
    user_prompt = st.session_state.pending_query
    st.session_state.pending_query = None

if user_prompt:
    # 1. Display User Message
    st.session_state.messages.append({"role": "user", "content": user_prompt})
    with st.chat_message("user", avatar="👤"):
        st.markdown(user_prompt)

    # 2. Stream Assistant Response with Ultra-Low Latency
    with st.chat_message("assistant", avatar="⚡"):
        start_time = time.time()
        try:
            stream_gen, retrieved_docs, _ = rag.stream_question(
                question=user_prompt,
                vectorstore=vectorstore,
                api_key=active_key,
                provider=selected_provider,
                k=retrieval_k,
                model_name=active_model,
                temperature=temperature
            )

            # Stream tokens live into UI with native typing effect
            full_response = st.write_stream(stream_gen)
            elapsed_time = time.time() - start_time

            # Display latency badge
            st.markdown(f'<div class="latency-pill">⚡ Streamed in {elapsed_time:.2f}s</div>', unsafe_allow_html=True)

            # Display sources
            if retrieved_docs:
                with st.expander(f"🔍 Verified Knowledge Citations ({len(retrieved_docs)} Chunks Retrieved)", expanded=False):
                    for idx, src_doc in enumerate(retrieved_docs, 1):
                        file_name = src_doc.metadata.get("source", "Unknown")
                        file_type = src_doc.metadata.get("file_type", "File")
                        badge_class = "badge-xlsx" if "xls" in file_name.lower() else "badge-txt"

                        st.markdown(f"""
                        <div class="source-card">
                            <div>
                                <span class="badge-pill {badge_class}">[{file_type.upper()}] {file_name}</span>
                                <span class="badge-pill badge-chunk">Chunk #{idx}</span>
                                <span style="color: #94a3b8; font-size: 0.75rem;">({len(src_doc.page_content)} chars)</span>
                            </div>
                            <div style="margin-top: 8px; color: #e2e8f0; font-family: 'Inter', sans-serif;">{src_doc.page_content}</div>
                        </div>
                        """, unsafe_allow_html=True)

            # Record in session state
            st.session_state.messages.append({
                "role": "assistant",
                "content": full_response,
                "sources": retrieved_docs,
                "latency": elapsed_time
            })

        except Exception as e:
            error_msg = f"⚠️ Inference Error: {str(e)}"
            st.error(error_msg)
            st.session_state.messages.append({
                "role": "assistant",
                "content": error_msg,
                "sources": [],
                "latency": 0
            })
