// Polyfill for Web APIs (required for LangChain and QdrantDB)
if (!global.ReadableStream) {
  const {
    ReadableStream,
    WritableStream,
    TransformStream,
  } = require("web-streams-polyfill/ponyfill");
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

// Polyfill Headers for QdrantDB client
if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = {};
      if (init) {
        if (typeof init === "object") {
          // Handle Headers instance
          if (init instanceof Headers) {
            init.forEach((value, key) => {
              this.headers[key.toLowerCase()] = value;
            });
          }
          // Handle array of [key, value] pairs
          else if (Array.isArray(init)) {
            for (const [key, value] of init) {
              this.headers[key.toLowerCase()] = value;
            }
          }
          // Handle object
          else {
            for (const [key, value] of Object.entries(init)) {
              this.headers[key.toLowerCase()] = value;
            }
          }
        }
      }
    }

    set(name, value) {
      this.headers[name.toLowerCase()] = String(value);
    }

    get(name) {
      return this.headers[name.toLowerCase()] || null;
    }

    has(name) {
      return name.toLowerCase() in this.headers;
    }

    delete(name) {
      delete this.headers[name.toLowerCase()];
    }

    append(name, value) {
      const existing = this.get(name);
      if (existing) {
        this.set(name, existing + ", " + value);
      } else {
        this.set(name, value);
      }
    }

    keys() {
      return Object.keys(this.headers)[Symbol.iterator]();
    }

    values() {
      return Object.values(this.headers)[Symbol.iterator]();
    }

    entries() {
      return Object.entries(this.headers)[Symbol.iterator]();
    }

    forEach(callback, thisArg) {
      for (const [key, value] of Object.entries(this.headers)) {
        callback.call(thisArg, value, key, this);
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Polyfill fetch for Gemini AI client
if (!global.fetch) {
  global.fetch = require("node-fetch");
}

// Polyfill FormData for QdrantDB client
if (!global.FormData) {
  global.FormData = class FormData {
    constructor() {
      this.data = [];
    }

    append(name, value, filename) {
      this.data.push({ name, value, filename });
    }

    delete(name) {
      this.data = this.data.filter((item) => item.name !== name);
    }

    get(name) {
      const item = this.data.find((item) => item.name === name);
      return item ? item.value : null;
    }

    getAll(name) {
      return this.data
        .filter((item) => item.name === name)
        .map((item) => item.value);
    }

    has(name) {
      return this.data.some((item) => item.name === name);
    }

    set(name, value, filename) {
      this.delete(name);
      this.append(name, value, filename);
    }

    entries() {
      return this.data
        .map((item) => [item.name, item.value])
        [Symbol.iterator]();
    }

    keys() {
      return this.data.map((item) => item.name)[Symbol.iterator]();
    }

    values() {
      return this.data.map((item) => item.value)[Symbol.iterator]();
    }

    forEach(callback, thisArg) {
      this.data.forEach((item) => {
        callback.call(thisArg, item.value, item.name, this);
      });
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const app = express();

const config = {
  port: process.env.PORT || 5000,
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  geminiApiKey: process.env.GEMINI_API_KEY,
  uploadDir: process.env.UPLOAD_DIR || "uploads/",
  chunkSize: parseInt(process.env.CHUNK_SIZE) || 2000,
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
};

const PORT = config.port;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true }); //nested folders allowed
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

let vectorStore = null;
let chatModel = null;
let embeddings = null;

const initializeAI = async () => {
  try {
    if (!config.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined. Please add your API key to backend/.env file"
      );
    }
    if (!embeddings) {
      embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: config.geminiApiKey,
        model: "embedding-001",
      });
    }
    if (!chatModel) {
      chatModel = new ChatGoogleGenerativeAI({
        apiKey: config.geminiApiKey,
        model: "gemini-1.5-flash",
        temperature: 0.7,
      });
    }
    return { embeddings, chatModel };
  } catch (error) {
    console.error("Error initializing AI models:", error.message);
    throw error;
  }
};

app.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
  //multer attaches pdf file to req.file
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }
    vectorStore = null;
    await initializeAI();
    const loader = new PDFLoader(req.file.path); //loads the pdf from that path create a loader instance
    const docs = await loader.load(); //extracts text line by line and returns in langchain compitable document
    //text chunking utility from langchain
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
    // new array of smaller chunks each still in Document format each have metadata
    const splitDocs = await textSplitter.splitDocuments(docs);
    const collectionName = `pdf_vectors_${Date.now()}`;

    //fromDocuments-> Creates and stores vectors from raw documents in one step.
    //embeddings->	Converts text → vectors
    vectorStore = await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: config.qdrantUrl,
      collectionName: collectionName,
      clientOptions: {
        checkCompatibility: false,
      },
    });
    fs.unlinkSync(req.file.path);

    res.json({
      message: "PDF processed successfully!",
      chunks: splitDocs.length,
      filename: req.file.originalname,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    if (!vectorStore) {
      return res.status(400).json({
        error: "No PDF has been processed yet. Please upload a PDF first.",
      });
    }

    await initializeAI();

    const comprehensiveKeywords = [
      "exam",
      "test ",
      "quiz ",
      "whole pdf",
      "entire document",
      "complete document",
      "summarize everything",
      "all topics",
      "comprehensive",
      "all chapters",
      "all lessons",
      "full content",
    ];

    const isComprehensiveQuery = comprehensiveKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );

    const chunkCount = isComprehensiveQuery ? 100 : 20;
    const relevantDocs = await vectorStore.similaritySearch(query, chunkCount);
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");


    const prompt = `
      You are an intelligent, helpful, and context-aware AI assistant that answers user questions using only the content retrieved from a PDF document. This document has been parsed and chunked, with each chunk associated with its corresponding page number.

      Your primary goals are:
      1. Accurately answer the user's question based solely on the given context.
      2. Cite page numbers wherever relevant to help the user locate the exact source.
      3. Avoid speculation or generating information not found in the context.
      
      ${
        isComprehensiveQuery
          ? `
      SPECIAL INSTRUCTIONS FOR COMPREHENSIVE QUERIES:
      - The user is asking for comprehensive analysis (exam questions, full summary, etc.)
      - You have access to extensive content from the document
      - Create detailed, thoughtful responses that utilize the full scope of available content
      - For exam questions: Create challenging questions that test deep understanding of multiple concepts
      - Draw connections between different sections and topics
      `
          : ""
      }
      
      - Only use the information present in the "Context" section.
      - If the context contains multiple relevant pieces from different pages, synthesize them into a coherent answer and cite all relevant page numbers.
      - If the answer is **not** in the provided context, respond with:
        "I'm sorry, the provided document does not contain enough information to answer that question."
      - If the user asks a very broad question and only partial information is available, answer what you can and recommend the most relevant page(s) for further reading.
      - Use a professional and informative tone in all answers.
      - Mention "See page X" to explicitly direct users to the document for more details.

      Context retrieved from the PDF (${
        relevantDocs.length
      } chunks from multiple pages):
      ${context}
      Question:
      ${query}

      Your Answer (strictly based on the context above):
      `;
    //Sends the prompt to the model and waits for the generated response
    const response = await chatModel.invoke(prompt);

    res.json({
      answer: response.content,
      relevantChunks: relevantDocs.length,
    });
  } catch (error) {
    console.error("Error processing chat query:", error);
    res.status(500).json({ error: "Failed to process query" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}`);
  console.log("Make sure QdrantDB is running: docker-compose up -d");
});
