package main

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Message struct {
	Type      string          `json:"type"`
	Nickname  string          `json:"nickname,omitempty"`
	Message   string          `json:"message,omitempty"`
	Timestamp int64           `json:"timestamp,omitempty"`
	Count     int             `json:"count,omitempty"`
	Seconds   int             `json:"seconds,omitempty"`
	RoomID    string          `json:"roomId,omitempty"`
	Players   []PlayerInfo    `json:"players,omitempty"`
	Map       [][]int         `json:"map,omitempty"`
	Position  *PlayerPosition `json:"position,omitempty"`
	
}

type PlayerInfo struct {
	Nickname string `json:"nickname"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

type PlayerPosition struct {
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Direction string `json:"direction"`
	Frame     int    `json:"frame"`
}

type Client struct {
	conn       *websocket.Conn
	nickname   string
	registered bool
}

type Room struct {
	clients   map[*Client]bool
	mutex     sync.Mutex
	timer     *time.Timer
	countdown *time.Ticker
	status    RoomStatus
	id        string
	messages  []Message
	gameMap   [][]int
	Upgrader websocket.Upgrader
	
}

type RoomManager struct {
	rooms map[string]*Room
	mutex sync.Mutex
	Upgrader websocket.Upgrader
}
