package signaling

import (
        "log"
        "net/http"
        "sync"
        "voice-agent/models"

        "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
        CheckOrigin: func(r *http.Request) bool {
                return true
        },
}

type SignalingServer struct {
        clients map[string]*Client
        mutex   sync.RWMutex
}

type Client struct {
        ID   string
        Conn *websocket.Conn
        Send chan *models.SignalMessage
}

func NewSignalingServer() *SignalingServer {
        return &SignalingServer{
                clients: make(map[string]*Client),
        }
}

func (s *SignalingServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
        conn, err := upgrader.Upgrade(w, r, nil)
        if err != nil {
                log.Printf("WebSocket upgrade error: %v", err)
                return
        }

        clientID := r.URL.Query().Get("client_id")
        if clientID == "" {
                conn.Close()
                return
        }

        client := &Client{
                ID:   clientID,
                Conn: conn,
                Send: make(chan *models.SignalMessage, 256),
        }

        s.mutex.Lock()
        s.clients[clientID] = client
        s.mutex.Unlock()

        go s.writePump(client)
        go s.readPump(client)
}

func (s *SignalingServer) readPump(client *Client) {
        defer func() {
                s.mutex.Lock()
                delete(s.clients, client.ID)
                s.mutex.Unlock()
                client.Conn.Close()
        }()

        for {
                var msg models.SignalMessage
                err := client.Conn.ReadJSON(&msg)
                if err != nil {
                        if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                                log.Printf("WebSocket error: %v", err)
                        }
                        break
                }

                s.handleSignalMessage(client, &msg)
        }
}

func (s *SignalingServer) writePump(client *Client) {
        defer client.Conn.Close()

        for msg := range client.Send {
                err := client.Conn.WriteJSON(msg)
                if err != nil {
                        log.Printf("Write error: %v", err)
                        return
                }
        }
}

func (s *SignalingServer) handleSignalMessage(client *Client, msg *models.SignalMessage) {
        log.Printf("Received signal from %s: type=%s", client.ID, msg.Type)
}

func (s *SignalingServer) SendToClient(clientID string, msg *models.SignalMessage) error {
        s.mutex.RLock()
        client, exists := s.clients[clientID]
        s.mutex.RUnlock()

        if !exists {
                return nil
        }

        select {
        case client.Send <- msg:
                return nil
        default:
                return nil
        }
}

func (s *SignalingServer) BroadcastToRoom(roomID string, msg *models.SignalMessage, excludeID string) {
        s.mutex.RLock()
        defer s.mutex.RUnlock()

        for id, client := range s.clients {
                if id != excludeID {
                        select {
                        case client.Send <- msg:
                        default:
                        }
                }
        }
}
