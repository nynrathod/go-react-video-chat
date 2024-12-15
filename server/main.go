package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"log"
	"math/rand"
	"sync"
	"time"
)

var roomPeers = make(map[string][]*websocket.Conn)
var roomLock sync.Mutex

// Generate a random Room ID
func generateRoomID() string {
	rand.Seed(time.Now().UnixNano())
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	length := 8
	roomID := make([]byte, length)
	for i := range roomID {
		roomID[i] = charset[rand.Intn(len(charset))]
	}
	return string(roomID)
}

func main() {
	app := fiber.New()
	app.Use(cors.New())

	// Endpoint to create a new room
	app.Get("/create-room", func(c *fiber.Ctx) error {
		roomID := generateRoomID()
		return c.JSON(fiber.Map{"roomID": roomID})
	})

	// WebSocket signaling route
	app.Get("/ws/:roomID", websocket.New(func(c *websocket.Conn) {
		roomID := c.Params("roomID")

		// Add user to the room
		roomLock.Lock()
		roomPeers[roomID] = append(roomPeers[roomID], c)
		roomLock.Unlock()

		defer func() {
			// Remove user from the room on disconnect
			roomLock.Lock()
			for i, conn := range roomPeers[roomID] {
				if conn == c {
					roomPeers[roomID] = append(roomPeers[roomID][:i], roomPeers[roomID][i+1:]...)
					break
				}
			}
			roomLock.Unlock()
		}()

		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				break
			}

			// Broadcast signaling data to other peers in the room
			roomLock.Lock()
			for _, conn := range roomPeers[roomID] {
				if conn != c {
					_ = conn.WriteMessage(websocket.TextMessage, message)
				}
			}
			roomLock.Unlock()
		}
	}))

	log.Fatal(app.Listen(":8080"))
}
