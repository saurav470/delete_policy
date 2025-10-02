# Healthcare Insurance Full-Stack Application

## Overview
Full-stack healthcare insurance application with React frontend, FastAPI backend, and Go voice agent. Features premium UI for chatbot and voice interactions with RAG (Retrieval Augmented Generation) capabilities.

## Project Status
- **Last Updated**: October 2, 2025
- **Status**: Fully configured and running on Replit (GitHub import completed)
- **Frontend Port**: 5000 (React with Vite)
- **Backend Port**: 8000 (FastAPI)
- **Voice Agent Port**: 8080 (Go WebRTC)
- **Environment**: Development

## Recent Changes
- October 2, 2025: GitHub import setup and configuration
  - Installed all dependencies (npm, pip, go modules)
  - Fixed frontend Vite config to use port 5000 with HMR support
  - Configured all three workflows (Frontend, Backend, VoiceAgent)
  - Set up VM deployment with multi-service startup script
  - Verified all services running successfully
  - All components now fully functional in Replit environment

- October 1, 2025: Complete application setup
  - **Backend**: Reconfigured FastAPI to run on 0.0.0.0:8000
  - **Frontend**: Created premium React UI with Vite on port 5000
  - **UI Components**: Built ChatBot and VoiceAgent interfaces with gradient design
  - **Integration**: Connected frontend to backend APIs via Vite proxy
  - **Styling**: Implemented dark theme with purple/blue gradients
  - **Voice Agent**: Go WebRTC/SFU implementation on port 8080 with proxy setup
  - **Qdrant Fix**: Fixed in-memory mode initialization (use `location` param instead of `url`)
  - Installed Python 3.12, Node.js 20, and Go 1.24
  - Set up Qdrant in-memory mode for vector database
  - Made Gemini API key optional (falls back gracefully)
  - Configured Vite proxies for `/api` (backend) and `/voice` (voice agent)

## Architecture

### Core Technologies
- **Framework**: FastAPI 0.116.1
- **Python**: 3.12
- **Vector Database**: Qdrant (in-memory mode by default)
- **LLM Integration**: OpenAI GPT-4 with Helicone monitoring
- **Session Titles**: Gemini 2.0 Flash (optional)
- **Storage**: AWS S3 for document storage (optional)

### Project Structure
```
app/
├── api/              # API endpoints (FastAPI)
│   ├── chat_history.py
│   ├── health.py
│   └── insurance.py
├── models/           # Pydantic schemas
├── services/         # Business logic
│   ├── insurance_service.py
│   ├── session_service.py
│   ├── gemini_services.py
│   └── llm_services/
├── utils/            # Helper functions
├── config.py         # Configuration management
└── main.py          # FastAPI application

voice-agent/          # Go WebRTC/SFU Voice Agent
├── main.go          # Entry point & HTTP handlers
├── config/          # Configuration
├── signaling/       # WebSocket signaling server
├── sfu/             # Custom SFU implementation
├── tts/             # ElevenLabs TTS integration
├── stt/             # OpenAI STT/LLM integration
├── room/            # Room management
└── models/          # Data structures

ingestion/           # Document ingestion pipeline
Insurance/           # Policy documents and data
```

### Key Services
- **InsuranceService**: Core chatbot functionality with RAG search
- **SessionService**: Session management with SQLAlchemy
- **GeminiService**: Title generation (optional)
- **LLM Services**: OpenAI GPT integration with Helicone

## Configuration

### Environment Variables
Required API keys should be set as Replit Secrets:
- `OPENAI_API_KEY`: OpenAI API key for embeddings, chat, and voice STT (required)
- `ELEVENLABS_API_KEY`: ElevenLabs API key for voice TTS (required for voice agent)
- `GEMINI_API_KEY`: Gemini API key for session title generation (optional)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`: AWS S3 credentials (optional)
- `VOICE_AGENT_PORT`: Port for voice agent server (default: 8080)

### Default Configuration
- **Frontend**: 0.0.0.0:5000 (React with Vite)
- **Backend**: 0.0.0.0:8000 (FastAPI)
- **Voice Agent**: 0.0.0.0:8080 (Go)
- **Qdrant**: :memory: (in-memory mode)
- **Collection**: healthcare_insurance
- **Chunk Size**: 1000
- **Chunk Overlap**: 200

## API Endpoints

### Health & Info
- `GET /` - API information and available endpoints
- `GET /api/v1/health` - Health check endpoint

### Insurance Chatbot
- `POST /api/v1/insurance/chat` - Chat with insurance assistant
- `GET /api/v1/insurance/policies` - List available policies

### Chat History
- `GET /api/v1/chat/sessions` - List chat sessions
- `POST /api/v1/chat/sessions` - Create new session
- `GET /api/v1/chat/sessions/{session_id}` - Get session details

### Voice Agent (Go - Port 8080)
- `POST /api/voice/start` - Start voice session with phone number
- `GET /api/voice/ws` - WebSocket signaling endpoint
- `POST /api/voice/offer` - WebRTC offer endpoint
- `POST /api/voice/answer` - WebRTC answer endpoint
- `POST /api/voice/ice-candidate` - ICE candidate exchange
- `GET /health` - Voice agent health check

## Development

### Running Locally
The server automatically runs on port 5000 when the Replit starts. The workflow is configured to:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

### Document Ingestion
To ingest insurance policy documents:
```bash
bash run_ingestion.sh
```

### Testing
- Health check: `GET /api/v1/health`
- API docs: Not available in production mode (debug=False)

## Deployment
Configured for Replit VM deployment:
- **Type**: vm (stateful, always-on for multi-service architecture)
- **Command**: `bash start_all_services.sh`
- **Services**: Frontend (5000), Backend (8000), Voice Agent (8080)
- **Entry Port**: 5000 (Frontend with proxying to other services)

## Code Style
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Type Hints**: Required for all function parameters and returns
- **Documentation**: Triple-quoted docstrings for all classes/functions
- **Error Handling**: Custom exception handlers in main.py, HTTPException for API errors
- **Configuration**: Centralized in config.py using pydantic-settings

## Known Limitations
- Gemini API key is optional; title generation will be disabled without it
- OpenAI API key required for full RAG functionality
- S3 storage is optional; PDF uploads will be skipped without credentials
- Qdrant runs in-memory mode by default (data not persisted)

## Dependencies
See `requirements_new.txt` for full list. Key packages:
- fastapi==0.116.1
- uvicorn==0.35.0
- langchain==0.3.27
- qdrant-client==1.15.1
- openai==1.107.2
- SQLAlchemy==2.0.43

## Voice Agent Architecture (Updated Oct 2, 2025)

### Current Implementation
Built using Pion WebRTC (Go) with custom SFU, inspired by LiveKit architecture:

**Components:**
- **SFU (Selective Forwarding Unit)**: Custom media forwarding logic
- **Signaling Server**: WebSocket-based WebRTC signaling
- **ICE/TURN**: NAT traversal configuration with public STUN/TURN servers
- **Room Management**: Multi-participant room handling
- **Data Channels**: Transcript and metadata synchronization

**Current Voice Pipeline:**
1. Phone number collection via `/voice/start` endpoint
2. WebRTC peer connection establishment
3. Browser-based STT (Web Speech API) for user input
4. Backend streaming endpoint (`/api/v1/insurance/chat/voice-stream`) for LLM responses
5. Browser-based TTS (window.speechSynthesis) for agent output
6. Go backend has ElevenLabs TTS integration (partial - not fully connected to WebRTC audio tracks)

**Implemented Improvements (Oct 2, 2025):**
- ✅ Voice-optimized streaming endpoint for ultra-low latency responses
- ✅ Improved prompt engineering based on LiveKit/Vapi best practices:
  - Responses limited to 2 sentences (max 280 chars)
  - Conversational, crisp, and concise
  - Natural speech patterns
  - Clear instructions for tool usage
- ✅ GPT-4-mini for faster streaming responses
- ✅ Optimized system prompts in both Python backend and Go voice agent

### Running Voice Agent
```bash
cd voice-agent
go run main.go
```

## Research Findings & Future Roadmap

### LiveKit Architecture Insights (Research Oct 2025)

**Key Learnings:**
1. **5-Layer Stack** for sub-500ms latency:
   - STT Layer: Deepgram Nova-3 (fastest), AssemblyAI
   - LLM Layer: OpenAI GPT-4o-mini, Anthropic Claude
   - TTS Layer: Cartesia (ultra-low latency), ElevenLabs, OpenAI TTS
   - Media Transport: WebRTC over UDP with NACK/FEC error correction
   - Orchestration: Agent framework for pipeline management

2. **Ultra-Low Latency Techniques:**
   - Deploy services in same VPC/region (single-digit ms internal latency)
   - Parallel SLM + LLM execution (SLM for fast initial reply, LLM for quality)
   - Streaming STT/TTS (start playback before complete response)
   - Preemptive generation (start generating response before user finishes)
   - Turn detection using transformer models (reduces interruptions by 30%)

3. **Production Metrics:**
   - End-to-end latency: 200-500ms (achievable)
   - Cost per minute: ~$0.03 (Deepgram + OpenAI + Cartesia)
   - Target TTFB: Sub-236ms for natural conversation flow

### WHIP/WHEP Protocols (WebRTC Streaming)

**What are WHIP/WHEP?**
- **WHIP** (WebRTC-HTTP Ingestion Protocol): Client → Server streaming (publishing)
- **WHEP** (WebRTC-HTTP Egress Protocol): Server → Client streaming (playback)
- **Key Benefit**: HTTP-based signaling replaces complex WebSocket servers
- **Latency**: Sub-second (200-500ms) vs. HLS/DASH (3-30s)

**Advantages for Our Use Case:**
- ✅ Standardized HTTP signaling (simpler than custom WebSocket)
- ✅ Stateless (easier scaling)
- ✅ Firewall-friendly
- ✅ Built-in E2E encryption (DTLS/SRTP)
- ✅ Dynamic codec support (H.264, VP8/9, AV1)

**Implementation Options:**
1. **Hosted Services:**
   - Cloudflare Stream (WHIP/WHEP endpoints)
   - Dolby.io/Millicast
   - Metered.ca

2. **Self-Hosted:**
   - Janus Gateway (C) - VideoRoom + Streaming plugins
   - Nimble Streamer
   - Pion WebRTC (Go) - has WHIP/WHEP examples

**Future Integration Plan:**
```
Phase 1: Replace custom WebSocket signaling with WHIP/WHEP
Phase 2: Use Cloudflare Stream for production scaling
Phase 3: Self-host with Janus Gateway for cost optimization
```

### Mem0 (Self-Hosted Memory Layer)

**What is Mem0?**
- Intelligent memory layer for AI agents enabling persistent, contextual memory
- Official integration with OpenAI Agents SDK for voice applications
- Self-hostable with Docker + Qdrant for full data control

**Architecture:**
```
┌─────────────────────────────────────────┐
│  Voice Agent (Go/Python)                │
│  └─ Mem0 Client                         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Mem0 API Server (Docker)               │
│  ├─ FastAPI backend                     │
│  ├─ PostgreSQL (metadata)               │
│  └─ Qdrant (vector search)              │
└─────────────────────────────────────────┘
```

**Docker Setup (Planned):**
```yaml
services:
  mem0-qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"

  mem0-api:
    image: mem0/mem0:latest
    env_file: .env
    ports:
      - "8765:8765"
    depends_on:
      - mem0-qdrant
```

**Voice Agent Memory Operations:**
```python
from mem0 import Memory

# Initialize with self-hosted Qdrant
config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {"host": "localhost", "port": 6333}
    }
}
memory = Memory.from_config(config)

# Add conversation memory
memory.add(
    messages=[{"role": "user", "content": "I prefer aisle seats"}],
    user_id="user_123"
)

# Search memories (semantic)
results = memory.search(query="seating preferences", user_id="user_123")

# Build context for voice agent
context = "\n".join([m['memory'] for m in results])
```

**Benefits for Voice Agent:**
- ✅ Remember user preferences across calls
- ✅ Maintain conversation context over sessions
- ✅ Personalized policy recommendations
- ✅ Full data ownership (self-hosted)

**Implementation Timeline:**
```
Phase 1: Local Mem0 setup with Docker
Phase 2: Integrate memory retrieval in voice pipeline
Phase 3: Add memory updates after each call
Phase 4: Implement forgetting strategy (expire old memories)
```

### Prompt Engineering Best Practices (Implemented)

**Research Sources:**
- LiveKit Agents documentation
- Vapi.ai prompting guide
- Retell AI best practices
- ElevenLabs conversational AI guide

**Key Principles (Now Applied):**
1. **Response Length**: Under 2 sentences (max 280 chars) for voice
2. **Structure**: 6-section prompts (Identity, Environment, Tone, Goal, Guardrails, Tools)
3. **Natural Speech**: Use fillers ("uh," "well"), pauses (ellipses)
4. **Clarity**: Precise, unambiguous language - no generalities
5. **Tool Instructions**: Specify exact conditions for function calls

**Our Implementation:**
```python
# Voice-optimized system prompt (app/services/insurance_service.py)
voice_system_prompt = """You are a helpful insurance assistant in a voice call.

## Style Guardrails
- Keep ALL responses under 2 sentences (max 280 characters)
- Be warm, empathetic, and conversational
- Use natural speech - no bullet points, no HTML, no formatting
- Speak directly and clearly
- If the answer is complex, give the most important point first

## Goal
Answer policy questions quickly and accurately.
"""
```

## Notes
- The application gracefully handles missing API keys where possible
- In-memory Qdrant is used by default for development
- For production with persistent Qdrant, set QDRANT_URL environment variable
- Voice agent uses Pion WebRTC for custom SFU implementation
- Go 1.24 compilation can be slow for first run due to WebRTC library size
