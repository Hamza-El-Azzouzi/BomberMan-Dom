package main

import (
	"log"
	"net/http"
)

type RoomStatus int

const (
	Waiting RoomStatus = iota
	InGame
)

func main() {
	roomManager := NewRoomManager()

	server := &http.Server{
		Addr: ":8080",
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			room := roomManager.findAvailableRoom()
			room.Upgrader = roomManager.Upgrader
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
