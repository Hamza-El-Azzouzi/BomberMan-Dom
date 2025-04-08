package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: map[string]*Room{},
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
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

	room := rm.createRoom()
	rm.rooms[room.id] = room
	log.Printf("Created new room: %s", room.id)
	return room
}

func (rm *RoomManager) createRoom() *Room {
	roomID := fmt.Sprintf("room_%d", len(rm.rooms))
	room := &Room{
		clients:  make(map[*Client]bool),
		status:   Waiting,
		id:       roomID,
		messages: make([]Message, 0),
		gameMap:  generateMap(),
	}
	return room
}
