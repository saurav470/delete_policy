package models

import (
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
)

type Room struct {
	ID           string
	Participants map[string]*Participant
	mutex        sync.RWMutex
	CreatedAt    time.Time
}

type Participant struct {
	ID              string
	PhoneNumber     string
	PeerConnection  *webrtc.PeerConnection
	DataChannel     *webrtc.DataChannel
	AudioTrack      *webrtc.TrackLocalStaticRTP
	RemoteAudioTrack *webrtc.TrackRemote
	IsAgent         bool
	JoinedAt        time.Time
	mutex           sync.RWMutex
}

type SignalMessage struct {
	Type      string                    `json:"type"`
	RoomID    string                    `json:"room_id,omitempty"`
	SDP       *webrtc.SessionDescription `json:"sdp,omitempty"`
	Candidate *webrtc.ICECandidateInit  `json:"candidate,omitempty"`
	Error     string                    `json:"error,omitempty"`
	Data      interface{}               `json:"data,omitempty"`
}

type PhoneNumberRequest struct {
	PhoneNumber string `json:"phone_number"`
}

type PhoneNumberResponse struct {
	SessionID string `json:"session_id"`
	RoomID    string `json:"room_id"`
	Token     string `json:"token"`
}

type TranscriptMessage struct {
	Type      string    `json:"type"`
	Speaker   string    `json:"speaker"`
	Text      string    `json:"text"`
	Timestamp time.Time `json:"timestamp"`
}

func NewRoom(id string) *Room {
	return &Room{
		ID:           id,
		Participants: make(map[string]*Participant),
		CreatedAt:    time.Now(),
	}
}

func (r *Room) AddParticipant(p *Participant) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	r.Participants[p.ID] = p
}

func (r *Room) RemoveParticipant(id string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	delete(r.Participants, id)
}

func (r *Room) GetParticipants() []*Participant {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	participants := make([]*Participant, 0, len(r.Participants))
	for _, p := range r.Participants {
		participants = append(participants, p)
	}
	return participants
}
