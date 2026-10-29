"""
rag.py - High-Performance RAG Pipeline Module for TechMart AI Assistant

Optimized for:
- Ultra-low latency streaming (< 500ms first-token)
- Multi-source loading (TextLoader for .txt, UnstructuredExcelLoader for .xlsx)
- RecursiveCharacterTextSplitter with strict chunking
- FAISS In-Memory Vectorstore with Gemini / OpenAI embeddings
- Strict ground-truth prompt guardrails ("I don't know based on the provided company data.")
"""

import os
import glob
import logging
from typing import List, Dict, Any, Tuple, Generator
from dotenv import load_dotenv

# Suppress noisy library warnings
import warnings
warnings.filterwarnings("ignore")
os.environ["UNSTRUCTURED_DISABLE_NOTICE"] = "1"

# LangChain Document Loading & Splitting
from langchain_community.document_loaders import TextLoader, UnstructuredExcelLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# LLMs and Embeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load environment variables from .env file
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Strict Grounding Prompt Template
SYSTEM_PROMPT = """You are the internal AI Assistant for TechMart Online Store.
Your task is to answer user inquiries strictly and accurately using ONLY the provided verified company context.

Operational Guardrails:
1. Ground every answer ONLY in the provided context below.
2. If the context does not contain enough information to answer the question, or if you do not know the answer, you MUST state exactly:
   "I don't know based on the provided company data."
3. Never fabricate prices, specifications, or policies.
4. Keep answers crisp, professional, and well-structured using markdown bullet points.

Context:
{context}
"""


def load_documents(data_dir: str = "data") -> List[Document]:
    """
    Load company documents from local .txt and .xlsx files.
    - Uses TextLoader for .txt files
    - Uses UnstructuredExcelLoader for .xlsx files
    - Combines all documents into a single list
    """
    if not os.path.exists(data_dir):
        logger.warning(f"Data directory '{data_dir}' not found.")
        return []

    combined_documents: List[Document] = []

    # 1. Load all .txt files
    txt_files = glob.glob(os.path.join(data_dir, "**", "*.txt"), recursive=True)
    for txt_path in txt_files:
        try:
            logger.info(f"Loading TXT document: {txt_path}")
            loader = TextLoader(txt_path, encoding="utf-8")
            loaded = loader.load()
            for doc in loaded:
                doc.metadata["source"] = os.path.basename(txt_path)
                doc.metadata["file_type"] = "TXT"
            combined_documents.extend(loaded)
        except Exception as e:
            logger.error(f"Error loading {txt_path}: {e}")

    # 2. Load all .xlsx files
    xlsx_files = glob.glob(os.path.join(data_dir, "**", "*.xlsx"), recursive=True)
    for xlsx_path in xlsx_files:
        try:
            logger.info(f"Loading Excel document: {xlsx_path}")
            loader = UnstructuredExcelLoader(xlsx_path, mode="elements")
            loaded = loader.load()
            for doc in loaded:
                doc.metadata["source"] = os.path.basename(xlsx_path)
                doc.metadata["file_type"] = "Excel"
            combined_documents.extend(loaded)
        except Exception as e:
            logger.error(f"Error loading {xlsx_path}: {e}")

    logger.info(f"Total raw documents loaded: {len(combined_documents)}")
    return combined_documents


def chunk_documents(
    documents: List[Document],
    chunk_size: int = 500,
    chunk_overlap: int = 50
) -> List[Document]:
    """
    Split combined documents into chunks using RecursiveCharacterTextSplitter.
    Default: chunk_size=500, chunk_overlap=50
    """
    if not documents:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_documents(documents)
    logger.info(f"Split {len(documents)} document(s) into {len(chunks)} chunk(s).")
    return chunks


def build_vectorstore(
    chunks: List[Document],
    api_key: str | None = None,
    provider: str = "gemini"
) -> FAISS:
    """
    Embed document chunks and store them in an in-memory FAISS vector store.
    Supports provider="gemini" (default) or "openai".
    """
    if provider == "gemini":
        gemini_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            raise ValueError("Gemini API key not found. Please provide it or set GEMINI_API_KEY in .env.")
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=gemini_key
        )
    else:
        openai_key = api_key or os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OpenAI API key not found. Please provide it or set OPENAI_API_KEY in .env.")
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=openai_key
        )

    vectorstore = FAISS.from_documents(chunks, embeddings)
    logger.info(f"FAISS vector store successfully created with {len(chunks)} entries using {provider}.")
    return vectorstore


def get_retriever(vectorstore: FAISS, k: int = 3):
    """
    Create a retriever from the FAISS vector store that retrieves top-k relevant chunks.
    """
    return vectorstore.as_retriever(search_kwargs={"k": k})


def stream_question(
    question: str,
    vectorstore: FAISS,
    api_key: str | None = None,
    provider: str = "gemini",
    k: int = 3,
    model_name: str | None = None,
    temperature: float = 0.0
) -> Tuple[Generator[str, None, None], List[Document], str]:
    """
    High-performance streaming RAG query.
    Returns:
    - token_generator: Generator yielding token chunks as they arrive from the LLM
    - retrieved_docs: List of source documents retrieved from FAISS
    - context_text: Raw context passed to LLM
    """
    retriever = get_retriever(vectorstore, k=k)
    retrieved_docs = retriever.invoke(question)

    # Format context cleanly
    context_text = "\n\n---\n\n".join([doc.page_content for doc in retrieved_docs])

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}")
    ])

    if provider == "gemini":
        gemini_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            raise ValueError("Gemini API key not configured.")
        target_model = model_name or "models/gemini-3.5-flash-lite"
        llm = ChatGoogleGenerativeAI(
            model=target_model,
            temperature=temperature,
            google_api_key=gemini_key,
            max_retries=1
        )
    else:
        openai_key = api_key or os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OpenAI API key not configured.")
        target_model = model_name or "gpt-4o-mini"
        llm = ChatOpenAI(
            model=target_model,
            temperature=temperature,
            openai_api_key=openai_key
        )

    rag_chain = prompt | llm | StrOutputParser()

    def token_generator():
        for chunk in rag_chain.stream({"context": context_text, "question": question}):
            if chunk:
                yield str(chunk)

    return token_generator(), retrieved_docs, context_text


def ask_question(
    question: str,
    vectorstore: FAISS,
    api_key: str | None = None,
    provider: str = "gemini",
    k: int = 3,
    model_name: str | None = None,
    temperature: float = 0.0
) -> Dict[str, Any]:
    """
    Non-streaming query wrapper for synchronous calls and benchmarks.
    """
    stream_gen, retrieved_docs, context_text = stream_question(
        question=question,
        vectorstore=vectorstore,
        api_key=api_key,
        provider=provider,
        k=k,
        model_name=model_name,
        temperature=temperature
    )

    full_answer = "".join(list(stream_gen))

    return {
        "answer": full_answer.strip(),
        "sources": retrieved_docs,
        "context": context_text
    }
