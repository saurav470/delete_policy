package room

import (
	"sync"
	"voice-agent/models"

	"github.com/google/uuid"
)

type Manager struct {
	rooms map[string]*models.Room
	mutex sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*models.Room),
	}
}

func (m *Manager) CreateRoom() *models.Room {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	roomID := uuid.New().String()
	room := models.NewRoom(roomID)
	m.rooms[roomID] = room
	return room
}

func (m *Manager) GetRoom(id string) (*models.Room, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	room, exists := m.rooms[id]
	return room, exists
}

func (m *Manager) DeleteRoom(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	delete(m.rooms, id)
}

func (m *Manager) GetAllRooms() []*models.Room {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	rooms := make([]*models.Room, 0, len(m.rooms))
	for _, room := range m.rooms {
		rooms = append(rooms, room)
	}
	return rooms
}
