package config

import (
	"os"
)

type Config struct {
	ServerPort      string
	OpenAIKey       string
	ElevenLabsKey   string
	STUNServers     []string
	TURNServers     []TURNServer
	SessionTimeout  int
}

type TURNServer struct {
	URLs       []string
	Username   string
	Credential string
}

func Load() *Config {
	return &Config{
		ServerPort:     getEnv("VOICE_AGENT_PORT", "8080"),
		OpenAIKey:      getEnv("OPENAI_API_KEY", ""),
		ElevenLabsKey:  getEnv("ELEVENLABS_API_KEY", ""),
		SessionTimeout: 3600,
		STUNServers: []string{
			"stun:stun.l.google.com:19302",
			"stun:stun1.l.google.com:19302",
		},
		TURNServers: []TURNServer{
			{
				URLs:       []string{"turn:openrelay.metered.ca:80"},
				Username:   "openrelayproject",
				Credential: "openrelayproject",
			},
		},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
