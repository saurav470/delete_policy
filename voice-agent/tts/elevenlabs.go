package tts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type ElevenLabs struct {
	apiKey string
	client *http.Client
}

type TTSRequest struct {
	Text          string                 `json:"text"`
	ModelID       string                 `json:"model_id"`
	VoiceSettings map[string]interface{} `json:"voice_settings,omitempty"`
}

func NewElevenLabs(apiKey string) *ElevenLabs {
	return &ElevenLabs{
		apiKey: apiKey,
		client: &http.Client{},
	}
}

func (e *ElevenLabs) StreamSpeech(text, voiceID string) (io.ReadCloser, error) {
	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s/stream", "1qEiC6qsybMkmnNdVMbK")

	payload := TTSRequest{
		Text:    text,
		ModelID: "eleven_flash_v2_5",
		VoiceSettings: map[string]interface{}{
			"stability":        0.5,
			"similarity_boost": 0.75,
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "audio/mpeg")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("ElevenLabs API error: %s", string(body))
	}

	return resp.Body, nil
}

func (e *ElevenLabs) GenerateSpeech(text, voiceID string) ([]byte, error) {
	url := fmt.Sprintf("https://api.elevenlabs.io/v1/text-to-speech/%s", "1qEiC6qsybMkmnNdVMbK")

	payload := TTSRequest{
		Text:    text,
		ModelID: "eleven_flash_v2_5",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "audio/mpeg")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ElevenLabs API error: %s", string(body))
	}

	return io.ReadAll(resp.Body)
}

type Voice struct {
	VoiceID string `json:"voice_id"`
	Name    string `json:"name"`
}

func (e *ElevenLabs) GetVoices() ([]Voice, error) {
	req, err := http.NewRequest("GET", "https://api.elevenlabs.io/v1/voices", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("xi-api-key", e.apiKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Voices []Voice `json:"voices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Voices, nil
}
