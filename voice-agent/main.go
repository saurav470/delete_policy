package main

import (
        "encoding/json"
        "fmt"
        "log"
        "net/http"
        "voice-agent/config"
        "voice-agent/models"
        "voice-agent/room"
        "voice-agent/sfu"
        "voice-agent/signaling"
        "voice-agent/stt"
        "voice-agent/tts"

        "github.com/google/uuid"
        "github.com/pion/webrtc/v4"
)

type Server struct {
        config          *config.Config
        roomManager     *room.Manager
        sfuServer       *sfu.SFU
        signalingServer *signaling.SignalingServer
        ttsClient       *tts.ElevenLabs
        sttClient       *stt.OpenAISTT
}

func main() {
        cfg := config.Load()
        
        server := &Server{
                config:          cfg,
                roomManager:     room.NewManager(),
                sfuServer:       sfu.NewSFU(cfg),
                signalingServer: signaling.NewSignalingServer(),
                ttsClient:       tts.NewElevenLabs(cfg.ElevenLabsKey),
                sttClient:       stt.NewOpenAISTT(cfg.OpenAIKey),
        }

        http.HandleFunc("/api/voice/start", server.handleStartVoiceSession)
        http.HandleFunc("/api/voice/ws", server.handleWebSocket)
        http.HandleFunc("/api/voice/offer", server.handleOffer)
        http.HandleFunc("/api/voice/answer", server.handleAnswer)
        http.HandleFunc("/api/voice/ice-candidate", server.handleICECandidate)
        http.HandleFunc("/health", server.handleHealth)

        addr := fmt.Sprintf(":%s", cfg.ServerPort)
        log.Printf("Voice agent server starting on %s", addr)
        log.Fatal(http.ListenAndServe(addr, nil))
}

func (s *Server) handleStartVoiceSession(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        var req models.PhoneNumberRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, "Invalid request body", http.StatusBadRequest)
                return
        }

        if req.PhoneNumber == "" {
                http.Error(w, "Phone number is required", http.StatusBadRequest)
                return
        }

        newRoom := s.roomManager.CreateRoom()
        sessionID := uuid.New().String()

        userParticipant := &models.Participant{
                ID:          sessionID,
                PhoneNumber: req.PhoneNumber,
                IsAgent:     false,
        }

        if err := s.sfuServer.SetupParticipantConnection(userParticipant, newRoom); err != nil {
                http.Error(w, fmt.Sprintf("Failed to setup connection: %v", err), http.StatusInternalServerError)
                return
        }

        newRoom.AddParticipant(userParticipant)

        agentParticipant := &models.Participant{
                ID:      uuid.New().String(),
                IsAgent: true,
        }

        if err := s.sfuServer.SetupParticipantConnection(agentParticipant, newRoom); err != nil {
                http.Error(w, fmt.Sprintf("Failed to setup agent: %v", err), http.StatusInternalServerError)
                return
        }

        newRoom.AddParticipant(agentParticipant)

        go s.runVoiceAgent(newRoom, agentParticipant, userParticipant)

        response := models.PhoneNumberResponse{
                SessionID: sessionID,
                RoomID:    newRoom.ID,
                Token:     sessionID,
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
        s.signalingServer.HandleWebSocket(w, r)
}

func (s *Server) handleOffer(w http.ResponseWriter, r *http.Request) {
        var msg struct {
                SessionID string                     `json:"session_id"`
                RoomID    string                     `json:"room_id"`
                Offer     *webrtc.SessionDescription `json:"offer"`
        }

        if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        room, exists := s.roomManager.GetRoom(msg.RoomID)
        if !exists {
                http.Error(w, "Room not found", http.StatusNotFound)
                return
        }

        var participant *models.Participant
        for _, p := range room.GetParticipants() {
                if p.ID == msg.SessionID {
                        participant = p
                        break
                }
        }

        if participant == nil {
                http.Error(w, "Participant not found", http.StatusNotFound)
                return
        }

        answer, err := s.sfuServer.CreateAnswer(participant.PeerConnection, *msg.Offer)
        if err != nil {
                http.Error(w, fmt.Sprintf("Failed to create answer: %v", err), http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "answer": answer,
        })
}

func (s *Server) handleAnswer(w http.ResponseWriter, r *http.Request) {
        var msg struct {
                SessionID string                     `json:"session_id"`
                RoomID    string                     `json:"room_id"`
                Answer    *webrtc.SessionDescription `json:"answer"`
        }

        if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        room, exists := s.roomManager.GetRoom(msg.RoomID)
        if !exists {
                http.Error(w, "Room not found", http.StatusNotFound)
                return
        }

        var participant *models.Participant
        for _, p := range room.GetParticipants() {
                if p.ID == msg.SessionID {
                        participant = p
                        break
                }
        }

        if participant == nil {
                http.Error(w, "Participant not found", http.StatusNotFound)
                return
        }

        if err := participant.PeerConnection.SetRemoteDescription(*msg.Answer); err != nil {
                http.Error(w, fmt.Sprintf("Failed to set answer: %v", err), http.StatusInternalServerError)
                return
        }

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleICECandidate(w http.ResponseWriter, r *http.Request) {
        var msg struct {
                SessionID string                   `json:"session_id"`
                RoomID    string                   `json:"room_id"`
                Candidate *webrtc.ICECandidateInit `json:"candidate"`
        }

        if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
                http.Error(w, "Invalid request", http.StatusBadRequest)
                return
        }

        room, exists := s.roomManager.GetRoom(msg.RoomID)
        if !exists {
                http.Error(w, "Room not found", http.StatusNotFound)
                return
        }

        var participant *models.Participant
        for _, p := range room.GetParticipants() {
                if p.ID == msg.SessionID {
                        participant = p
                        break
                }
        }

        if participant == nil {
                http.Error(w, "Participant not found", http.StatusNotFound)
                return
        }

        if err := s.sfuServer.AddICECandidate(participant.PeerConnection, *msg.Candidate); err != nil {
                http.Error(w, fmt.Sprintf("Failed to add ICE candidate: %v", err), http.StatusInternalServerError)
                return
        }

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
                "status": "healthy",
                "service": "voice-agent",
        })
}

func (s *Server) runVoiceAgent(room *models.Room, agent *models.Participant, user *models.Participant) {
        log.Printf("Voice agent started for room %s", room.ID)

        systemPrompt := `You are a helpful insurance policy assistant. 
        You help users understand their healthcare insurance policies.
        Keep responses concise and clear. Ask clarifying questions when needed.
        Always be professional and empathetic.`

        conversationHistory := []stt.Message{}
        
        _ = systemPrompt
        _ = conversationHistory

        greetingText := fmt.Sprintf("Hello! I'm your insurance assistant. I see you're calling from %s. How can I help you with your insurance policy today?", 
                user.PhoneNumber)

        if agent.DataChannel != nil {
                transcriptMsg := models.TranscriptMessage{
                        Type:    "transcript",
                        Speaker: "agent",
                        Text:    greetingText,
                }
                data, _ := json.Marshal(transcriptMsg)
                agent.DataChannel.SendText(string(data))
        }

        audioStream, err := s.ttsClient.StreamSpeech(greetingText, "21m00Tcm4TlvDq8ikWAM")
        if err != nil {
                log.Printf("TTS error: %v", err)
                return
        }
        defer audioStream.Close()

        log.Printf("Voice agent running for room %s", room.ID)
}
