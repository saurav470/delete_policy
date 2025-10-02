# Healthcare Insurance Full-Stack Application

## Overview
This project is a full-stack healthcare insurance application featuring a React frontend, a FastAPI backend, and a Go voice agent. It provides a premium UI for chatbot and voice interactions, enhanced with RAG (Retrieval Augmented Generation) capabilities to deliver accurate and relevant insurance information. The application aims to streamline user engagement with insurance services through intuitive interfaces and advanced AI-driven communication.

## User Preferences
- I prefer simple language and clear, concise explanations.
- I want to see iterative development with frequent, small updates.
- Please ask for my approval before implementing any major architectural changes or new features.
- I appreciate detailed explanations of the code and architectural decisions.
- All responses should be under 2 sentences (max 280 characters) for voice interactions.
- I expect warm, empathetic, and conversational interactions from the AI.
- The AI should use natural speech patterns, avoiding bullet points, HTML, or complex formatting.
- The AI should speak directly and clearly, prioritizing the most important point if an answer is complex.

## System Architecture

### UI/UX Decisions
The frontend features a premium React UI built with Vite, designed with a dark theme and purple/blue gradient accents. It includes dedicated interfaces for ChatBot and VoiceAgent interactions. Vite proxies are configured for seamless integration with the backend and voice agent services.

### Technical Implementations
- **Frontend**: React with Vite, running on port 5000.
- **Backend**: FastAPI (Python 3.12), running on port 8000. It handles API endpoints for chat, insurance policies, and session management.
- **Voice Agent**: Go WebRTC/SFU implementation (Go 1.24), running on port 8080. It uses Pion WebRTC with a custom Selective Forwarding Unit (SFU) for media forwarding, WebSocket-based signaling, and integrates with ElevenLabs for TTS and OpenAI for STT/LLM. The voice pipeline is optimized for ultra-low latency, incorporating prompt engineering best practices for concise and conversational AI responses using GPT-4-mini.
- **Vector Database**: Qdrant in-memory mode by default for development, with an option for persistent storage.
- **LLM Integration**: OpenAI GPT-4 for core RAG functionality, with Helicone monitoring. Gemini 2.0 Flash is optionally used for session title generation.
- **Document Ingestion**: A dedicated pipeline for ingesting insurance policy documents.
- **Configuration**: Centralized environment variable management using Replit Secrets for API keys and service configurations.

### Feature Specifications
- **Insurance Chatbot**: Core functionality for answering policy questions using RAG.
- **Chat History**: Manages chat sessions, allowing users to list, create, and retrieve session details.
- **Voice Interaction**: Enables voice calls with the insurance assistant, including WebRTC peer connection, STT (Web Speech API), and TTS (window.speechSynthesis for user-side, ElevenLabs for agent-side).
- **Voice Optimized Streaming**: Implements a voice-optimized streaming endpoint for low-latency responses, with prompt engineering limiting responses to two sentences (max 280 characters).

### System Design Choices
The application is designed for a multi-service architecture, deployed on Replit VM. The frontend acts as the entry point (port 5000) and proxies requests to the backend and voice agent. The system prioritizes low-latency voice interactions and leverages in-memory Qdrant for rapid development. Code style guidelines emphasize snake_case, PascalCase, type hints, docstrings, and centralized error handling.

## External Dependencies
- **OpenAI API**: For GPT-4 (LLM), embeddings, chat, and voice STT.
- **ElevenLabs API**: For voice Text-to-Speech (TTS) in the voice agent.
- **Gemini API**: Optional, for session title generation.
- **AWS S3**: Optional, for document storage.
- **Qdrant**: Vector database (in-memory by default).
- **Helicone**: For monitoring OpenAI GPT-4 interactions.
- **Pion WebRTC**: Go library for WebRTC implementation in the voice agent.