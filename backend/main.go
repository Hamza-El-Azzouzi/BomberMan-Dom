package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Message struct {
	Type      string       `json:"type"`
	Nickname  string       `json:"nickname,omitempty"`
	Message   string       `json:"message,omitempty"`
	Timestamp int64        `json:"timestamp,omitempty"`
	Count     int          `json:"count,omitempty"`
	Seconds   int          `json:"seconds,omitempty"`
	RoomID    string       `json:"roomId,omitempty"`
	Players   []PlayerInfo `json:"players,omitempty"`
}

type PlayerInfo struct {
	Nickname string `json:"nickname"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

type Client struct {
	conn       *websocket.Conn
	nickname   string
	registered bool
}

type RoomStatus int

const (
	Waiting RoomStatus = iota
	InGame
)

type Room struct {
	clients   map[*Client]bool
	mutex     sync.Mutex
	timer     *time.Timer
	countdown *time.Ticker
	status    RoomStatus
	id        string
	messages  []Message 
}

type RoomManager struct {
	rooms map[string]*Room
	mutex sync.Mutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) findAvailableRoom() *Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	log.Printf("Looking for available room. Total rooms: %d", len(rm.rooms))

	for _, room := range rm.rooms {
		room.mutex.Lock()
		count := 0
		for client := range room.clients {
			if client.registered {
				count++
			}
		}
		status := room.status
		room.mutex.Unlock()

		log.Printf("Room %s: players=%d, status=%v", room.id, count, status)

		if count < 4 && status == Waiting {
			log.Printf("Found available room: %s", room.id)
			return room
		}
	}

	room := &Room{
		clients: make(map[*Client]bool),
		status:  Waiting,
		id:      fmt.Sprintf("room_%d", len(rm.rooms)),
	}
	rm.rooms[room.id] = room
	log.Printf("Created new room: %s", room.id)
	return room
}

func main() {
	roomManager := NewRoomManager()

	server := &http.Server{
		Addr: ":8080",
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			room := roomManager.findAvailableRoom()
			room.wsHandler(w, r)
		}),
	}

	log.Println("Starting server on :8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}

	roomManager.mutex.Lock()
	defer roomManager.mutex.Unlock()
	for _, room := range roomManager.rooms {
		room.mutex.Lock()
		for client := range room.clients {
			client.conn.Close()
			delete(room.clients, client)
		}
		room.mutex.Unlock()
	}

	if err := server.Close(); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}
}

func (r *Room) wsHandler(w http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	client := &Client{conn: conn, registered: false}
	r.mutex.Lock()
	r.clients[client] = true
	r.mutex.Unlock()

	log.Printf("New client connected to room %s", r.id)

	defer func() {
		r.mutex.Lock()
		delete(r.clients, client)
		r.mutex.Unlock()
		r.broadcastPlayerCount()
		r.checkAutoStart()
	}()

	for {
		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			break
		}
		switch msg.Type {
		case "register":
			if r.isNicknameTaken(msg.Nickname) {
				conn.WriteJSON(Message{Type: "nickname_taken"})
				return
			}
			client.nickname = msg.Nickname
			client.registered = true

			for _, msg := range r.messages {
				client.conn.WriteJSON(msg)
			}

			r.broadcastPlayerCount()
			r.checkAutoStart()
		case "chat":
			chatMsg := Message{
				Type:      "chat",
				Nickname:  client.nickname,
				Message:   msg.Message,
				Timestamp: time.Now().UnixMilli(),
				RoomID:    r.id,
			}
			r.messages = append(r.messages, chatMsg)
			r.broadcastChatMessage(chatMsg)
		}
	}
}

func (r *Room) broadcastPlayerCount() {
	r.mutex.Lock()
	count := 0
	for client := range r.clients {
		if client.registered {
			count++
		}
	}
	r.mutex.Unlock()

	msg := Message{
		Type:   "player_count",
		Count:  count,
		RoomID: r.id,
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()
	for client := range r.clients {
		if err := client.conn.WriteJSON(msg); err != nil {
			log.Printf("Error sending player count: %v", err)
			delete(r.clients, client)
		}
	}

	go r.checkAutoStart()
}

func (r *Room) broadcastChatMessage(msg Message) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	for client := range r.clients {
		if err := client.conn.WriteJSON(msg); err != nil {
			log.Printf("Error sending chat message: %v", err)
		}
	}
}

func (r *Room) checkAutoStart() {
	r.mutex.Lock()
	if r.status == InGame {
		r.mutex.Unlock()
		return
	}
	count := 0
	for client := range r.clients {
		if client.registered {
			count++
		}
	}
	r.mutex.Unlock()

	if count >= 2 && count < 4 {
		r.startCountdown(20)
	} else if count == 4 {
		r.startCountdown(10)
	}
}

func (r *Room) startCountdown(seconds int) {
	r.mutex.Lock()
	if r.countdown != nil {
		r.countdown.Stop()
	}
	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}
	r.countdown = time.NewTicker(time.Second)
	r.mutex.Unlock()

	countdown := seconds
	go func() {
		defer func() {
			r.mutex.Lock()
			if r.countdown != nil {
				r.countdown.Stop()
				r.countdown = nil
			}
			r.mutex.Unlock()
		}()

		for range r.countdown.C {
			r.mutex.Lock()
			if r.countdown == nil {
				r.mutex.Unlock()
				return
			}
			countdown--
			r.mutex.Unlock()

			msg := Message{
				Type:    "countdown",
				Seconds: countdown,
			}

			r.mutex.Lock()
			for client := range r.clients {
				if err := client.conn.WriteJSON(msg); err != nil {
					log.Printf("Error sending countdown: %v", err)
				}
			}
			r.mutex.Unlock()

			if countdown <= 0 {
				r.startGame()
				return
			}
		}
	}()
}

func (r *Room) startGame() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.status = InGame

	positions := [][2]int{{1, 1}, {13, 11}, {13, 1}, {1, 11}}
	playerInfos := make([]PlayerInfo, 0)
	i := 0

	for client := range r.clients {
		if client.registered {
			playerInfos = append(playerInfos, PlayerInfo{
				Nickname: client.nickname,
				X:        positions[i][0] * 50, 
				Y:        positions[i][1] * 50,
			})
			i++
		}
	}

	msg := Message{
		Type:    "start_game",
		Players: playerInfos,
	}

	for client := range r.clients {
		if err := client.conn.WriteJSON(msg); err != nil {
			log.Printf("Error sending game start: %v", err)
		}
	}
}

func (r *Room) isNicknameTaken(nickname string) bool {
	for client := range r.clients {
		if client.registered && client.nickname == nickname {
			return true
		}
	}
	return false
}
