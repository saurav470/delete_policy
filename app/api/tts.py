"""
Text-to-Speech API endpoints using ElevenLabs.
"""

import logging
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from elevenlabs.client import ElevenLabs
from elevenlabs import stream

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/tts", tags=["text-to-speech"])

# Initialize ElevenLabs client
elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
if not elevenlabs_api_key:
    logger.warning("ELEVENLABS_API_KEY not found in environment variables")
    client = None
else:
    client = ElevenLabs(api_key=elevenlabs_api_key)


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "1qEiC6qsybMkmnNdVMbK"  # Default voice ID
    model_id: str = "eleven_flash_v2_5"


@router.post("/generate")
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using ElevenLabs TTS.
    Returns audio/mpeg stream.
    """
    try:
        if not client:
            raise HTTPException(
                status_code=500,
                detail="ElevenLabs API key not configured"
            )
        
        logger.info(f"Generating TTS for text: {request.text[:50]}...")
        
        # Generate audio stream
        audio_stream = client.text_to_speech.convert(
            voice_id=request.voice_id,
            text=request.text,
            model_id=request.model_id,
        )
        
        def audio_generator():
            for chunk in audio_stream:
                yield chunk
        
        return StreamingResponse(
            audio_generator(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "no-cache",
            }
        )
    
    except Exception as e:
        logger.error(f"TTS generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )
