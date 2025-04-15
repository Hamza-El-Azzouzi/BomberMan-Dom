package main

import (
	"log"
	"net/http"
	"time"
)

func (r *Room) wsHandler(w http.ResponseWriter, req *http.Request) {
	conn, err := r.Upgrader.Upgrade(w, req, nil)
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
		case "player_move":
			r.broadcastPlayerMove(msg)
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

func (r *Room) broadcastPlayerMove(msg Message) {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	for client := range r.clients {
		if client.nickname != msg.Nickname {
			if err := client.conn.WriteJSON(msg); err != nil {
				log.Printf("Error sending player move: %v", err)
			}
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

	if count >= 1 && count < 4 {
		r.startCountdown(0)
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
		Map:     r.gameMap,
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
