package sfu

import (
	"fmt"
	"io"
	"log"
	"voice-agent/config"
	"voice-agent/models"

	"github.com/pion/webrtc/v4"
)

type SFU struct {
	config *config.Config
}

func NewSFU(cfg *config.Config) *SFU {
	return &SFU{config: cfg}
}

func (s *SFU) CreatePeerConnection() (*webrtc.PeerConnection, error) {
	iceServers := make([]webrtc.ICEServer, 0)

	for _, stun := range s.config.STUNServers {
		iceServers = append(iceServers, webrtc.ICEServer{
			URLs: []string{stun},
		})
	}

	for _, turn := range s.config.TURNServers {
		iceServers = append(iceServers, webrtc.ICEServer{
			URLs:       turn.URLs,
			Username:   turn.Username,
			Credential: turn.Credential,
		})
	}

	peerConfig := webrtc.Configuration{
		ICEServers: iceServers,
	}

	mediaEngine := &webrtc.MediaEngine{}
	if err := mediaEngine.RegisterDefaultCodecs(); err != nil {
		return nil, err
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(mediaEngine))
	return api.NewPeerConnection(peerConfig)
}

func (s *SFU) HandleTrack(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver, room *models.Room, sourceParticipant *models.Participant) {
	log.Printf("Track received: kind=%s, id=%s", track.Kind(), track.ID())

	for {
		rtpPacket, _, err := track.ReadRTP()
		if err != nil {
			if err == io.EOF {
				return
			}
			log.Printf("RTP read error: %v", err)
			return
		}

		participants := room.GetParticipants()
		for _, p := range participants {
			if p.ID != sourceParticipant.ID && p.AudioTrack != nil {
				if err := p.AudioTrack.WriteRTP(rtpPacket); err != nil {
					log.Printf("Write RTP error: %v", err)
				}
			}
		}
	}
}

func (s *SFU) SetupParticipantConnection(participant *models.Participant, room *models.Room) error {
	pc, err := s.CreatePeerConnection()
	if err != nil {
		return fmt.Errorf("failed to create peer connection: %w", err)
	}

	participant.PeerConnection = pc

	audioTrack, err := webrtc.NewTrackLocalStaticRTP(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio",
		"voice-agent-audio",
	)
	if err != nil {
		return fmt.Errorf("failed to create audio track: %w", err)
	}

	participant.AudioTrack = audioTrack

	if _, err = pc.AddTrack(audioTrack); err != nil {
		return fmt.Errorf("failed to add track: %w", err)
	}

	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		participant.RemoteAudioTrack = track
		go s.HandleTrack(track, receiver, room, participant)
	})

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("Participant %s ICE connection state: %s", participant.ID, state.String())
		
		if state == webrtc.ICEConnectionStateFailed || state == webrtc.ICEConnectionStateClosed {
			room.RemoveParticipant(participant.ID)
		}
	})

	return nil
}

func (s *SFU) CreateOffer(pc *webrtc.PeerConnection) (*webrtc.SessionDescription, error) {
	offer, err := pc.CreateOffer(nil)
	if err != nil {
		return nil, err
	}

	if err = pc.SetLocalDescription(offer); err != nil {
		return nil, err
	}

	return &offer, nil
}

func (s *SFU) CreateAnswer(pc *webrtc.PeerConnection, offer webrtc.SessionDescription) (*webrtc.SessionDescription, error) {
	if err := pc.SetRemoteDescription(offer); err != nil {
		return nil, err
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		return nil, err
	}

	if err = pc.SetLocalDescription(answer); err != nil {
		return nil, err
	}

	return &answer, nil
}

func (s *SFU) AddICECandidate(pc *webrtc.PeerConnection, candidate webrtc.ICECandidateInit) error {
	return pc.AddICECandidate(candidate)
}
