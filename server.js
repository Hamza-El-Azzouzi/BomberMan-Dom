import { createServer } from 'http';
import { readFile } from 'fs';
import { extname as _extname } from 'path';
import { WebSocketServer } from 'ws';

// Mime types for serving static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

// Game constants
const TILE_TYPES = {
    EMPTY: 0,
    WALL: 1,
    BREAKABLE: 2,
    BOMB_POWERUP: 3,
    FLAME_POWERUP: 4,
    SPEED_POWERUP: 5,
    BOMB: 6
};

// Game state
let players = {};
let waitingPlayers = {};
let games = {};
let activeSessions = {};

// Create HTTP server for static files
const server = createServer((req, res) => {
    // Get file path
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './frontend/test/index.html';
    } else if (!filePath.includes('.')) {
        filePath = `./frontend/test${req.url}/index.html`;
    } else {
        filePath = `./frontend${req.url}`;
    }

    // Get file extension
    const extname = String(_extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Read and serve file
    readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');

    let playerData = {
        nickname: null,
        ws: ws,
        gameId: null,
        lives: 3,
        position: { x: 0, y: 0 },
        // Add more player properties as needed
    };

    // Message handler
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);

            switch (data.type) {
                case 'register':
                    handlePlayerRegistration(playerData, data);
                    break;

                case 'chat':
                    handleChatMessage(playerData, data);
                    break;

                case 'player_move':
                    handlePlayerMove(playerData, data);
                    break;

                case 'bomb_placed':
                    handleBombPlaced(playerData, data);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        handlePlayerDisconnect(playerData);
    });
});

// Player registration handler
function handlePlayerRegistration(playerData, data) {
    const { nickname } = data;

    // Check if nickname is already taken
    if (isNicknameTaken(nickname)) {
        sendMessage(playerData.ws, {
            type: 'nickname_taken'
        });
        return;
    }

    // Set player nickname
    playerData.nickname = nickname;

    // Add player to waiting room
    waitingPlayers[nickname] = playerData;

    // Update player count for all waiting players
    broadcastWaitingRoomUpdate();

    // Check if we should start countdown
    checkGameStart();
}

// Check if nickname is already taken
function isNicknameTaken(nickname) {
    return Object.keys(players).includes(nickname) ||
        Object.keys(waitingPlayers).includes(nickname);
}

// Broadcast waiting room update to all waiting players
function broadcastWaitingRoomUpdate() {
    const playerCount = Object.keys(waitingPlayers).length;

    Object.values(waitingPlayers).forEach(player => {
        sendMessage(player.ws, {
            type: 'player_count',
            count: playerCount
        });
    });
}

// Check if game should start
function checkGameStart() {
    const playerCount = Object.keys(waitingPlayers).length;

    // Start game if 4 players or if more than 2 players and timer elapsed
    if (playerCount >= 2) {
        if (playerCount === 4) {
            startGameCountdown(10); // Start 10 second countdown immediately
        } else {
            // Wait 20 seconds, then start 10 second countdown if we still have enough players
            setTimeout(() => {
                if (Object.keys(waitingPlayers).length >= 2) {
                    startGameCountdown(10);
                }
            }, 20000);
        }
    }
}

// Start game countdown
function startGameCountdown(seconds) {
    let countdown = seconds;

    const interval = setInterval(() => {
        // Broadcast countdown to all waiting players
        Object.values(waitingPlayers).forEach(player => {
            sendMessage(player.ws, {
                type: 'countdown',
                seconds: countdown
            });
        });

        countdown--;

        if (countdown < 0) {
            clearInterval(interval);
            startGame();
        }
    }, 1000);
}

// Start the game
function startGame() {
    const gameId = generateGameId();
    const gamePlayers = { ...waitingPlayers };
    waitingPlayers = {}; // Clear waiting room

    // Create game
    games[gameId] = {
        id: gameId,
        players: gamePlayers,
        map: generateMap(),
        bombs: [],
        explosions: [],
        startTime: Date.now(),
        gameState: 'active'
    };

    // Assign starting positions
    const positions = getStartingPositions();
    let posIndex = -1;

    // Update players and send game start message
    Object.values(gamePlayers).forEach(player => {
        // Assign game ID
        player.gameId = gameId;

        // Set starting position
        player.position = positions[posIndex++];

        // Add to active players
        players[player.nickname] = player;

        // Send game start message
        sendMessage(player.ws, {
            type: 'start_game',
            map: games[gameId].map,
            players: Object.values(gamePlayers).map(p => ({
                nickname: p.nickname,
                x: p.position.x,
                y: p.position.y,
                direction: 'down',
                frame: 0
            }))
        });
    });
}

// Generate a unique game ID
function generateGameId() {
    return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get starting positions for players (in the four corners)
function getStartingPositions() {
    const tileSize = 50;
    return [
        { x: tileSize, y: tileSize },                      // Top-left
        { x: tileSize * 13, y: tileSize },                 // Top-right
        { x: tileSize, y: tileSize * 11 },                 // Bottom-left
        { x: tileSize * 13, y: tileSize * 11 }             // Bottom-right
    ];
}

// Generate a random game map
function generateMap() {
    const width = 15;
    const height = 13;
    const map = Array(height).fill().map(() => Array(width).fill(TILE_TYPES.EMPTY));

    // Add walls in a grid pattern (every other row/column)
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (row === 0 || col === 0 || row === height - 1 || col === width - 1) {
                // Border walls
                map[row][col] = TILE_TYPES.WALL;
            } else if (row % 2 === 0 && col % 2 === 0) {
                // Interior walls in grid pattern
                map[row][col] = TILE_TYPES.WALL;
            } else if (
                // Keep corners clear for players (3x3 area in each corner)
                !(
                    (row <= 2 && col <= 2) || // Top-left
                    (row <= 2 && col >= width - 3) || // Top-right
                    (row >= height - 3 && col <= 2) || // Bottom-left
                    (row >= height - 3 && col >= width - 3) // Bottom-right
                )
            ) {
                // Randomly place breakable blocks (70% chance)
                if (Math.random() < 0.7) {
                    map[row][col] = TILE_TYPES.BREAKABLE;
                }
            }
        }
    }

    return map;
}

// Handle chat message
function handleChatMessage(playerData, data) {
    if (!playerData.nickname) return;

    const messageData = {
        type: 'chat',
        nickname: playerData.nickname,
        message: data.message,
        timestamp: Date.now()
    };

    // If player is in waiting room, broadcast to waiting players
    if (playerData.gameId === null) {
        Object.values(waitingPlayers).forEach(player => {
            sendMessage(player.ws, messageData);
        });
    }
    // If player is in a game, broadcast to game players
    else if (games[playerData.gameId]) {
        Object.values(games[playerData.gameId].players).forEach(player => {
            sendMessage(player.ws, messageData);
        });
    }
}

// Handle player movement
function handlePlayerMove(playerData, data) {
    if (!playerData.nickname || !playerData.gameId) return;

    // Update player position
    playerData.position = data.position;

    // Broadcast to other players in the game
    const gameId = playerData.gameId;
    if (games[gameId]) {
        Object.values(games[gameId].players).forEach(player => {
            if (player.nickname !== playerData.nickname) {
                sendMessage(player.ws, {
                    type: 'player_move',
                    nickname: playerData.nickname,
                    position: data.position
                });
            }
        });
    }
}

// Handle bomb placement
function handleBombPlaced(playerData, data) {
    if (!playerData.nickname || !playerData.gameId) return;

    const gameId = playerData.gameId;
    if (!games[gameId]) return;

    // Add bomb to game state
    const bomb = {
        id: Date.now() + '_' + Math.random(),
        row: data.position.row,
        col: data.position.col,
        range: data.position.range,
        owner: playerData.nickname,
        placedAt: Date.now()
    };

    games[gameId].bombs.push(bomb);

    // Update map
    games[gameId].map[data.position.row][data.position.col] = TILE_TYPES.BOMB;

    // Broadcast to other players
    Object.values(games[gameId].players).forEach(player => {
        if (player.nickname !== playerData.nickname) {
            sendMessage(player.ws, {
                type: 'bomb_placed',
                nickname: playerData.nickname,
                position: data.position
            });
        }
    });

    // Schedule explosion
    setTimeout(() => {
        handleBombExplosion(gameId, bomb);
    }, 1500); // 1.5 seconds
}

// Handle bomb explosion
function handleBombExplosion(gameId, bomb) {
    const game = games[gameId];
    if (!game) return;

    // Remove bomb from game state
    game.bombs = game.bombs.filter(b => b.id !== bomb.id);

    // Reset bomb tile
    game.map[bomb.row][bomb.col] = TILE_TYPES.EMPTY;

    // Calculate explosion area
    const explosions = calculateExplosion(bomb.row, bomb.col, bomb.range, game.map);

    // Process explosions
    explosions.forEach(explosion => {
        // Check if explosion hits a block
        if (game.map[explosion.row][explosion.col] === TILE_TYPES.BREAKABLE) {
            // Destroy block
            game.map[explosion.row][explosion.col] = TILE_TYPES.EMPTY;

            // Random chance for powerup
            if (Math.random() < 0.3) {
                // Select random powerup
                const powerupTypes = [
                    TILE_TYPES.BOMB_POWERUP,
                    TILE_TYPES.FLAME_POWERUP,
                    TILE_TYPES.SPEED_POWERUP
                ];
                game.map[explosion.row][explosion.col] = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            }

            // Broadcast block destruction
            Object.values(game.players).forEach(player => {
                sendMessage(player.ws, {
                    type: 'block_destroyed',
                    position: {
                        row: explosion.row,
                        col: explosion.col,
                        newTile: game.map[explosion.row][explosion.col]
                    }
                });
            });
        }

        // Check if explosion hits players
        Object.values(game.players).forEach(player => {
            const playerRow = Math.round(player.position.y / 50);
            const playerCol = Math.round(player.position.x / 50);

            if (playerRow === explosion.row && playerCol === explosion.col) {
                // Player hit by explosion
                handlePlayerHit(player);
            }
        });
    });
}

// Calculate explosion area
function calculateExplosion(row, col, range, map) {
    const explosions = [{ row, col, direction: 'center' }];
    const directions = [
        { dr: -1, dc: 0, name: 'up' },
        { dr: 1, dc: 0, name: 'down' },
        { dr: 0, dc: -1, name: 'left' },
        { dr: 0, dc: 1, name: 'right' }
    ];

    directions.forEach(dir => {
        for (let i = 1; i <= range; i++) {
            const newRow = row + (dir.dr * i);
            const newCol = col + (dir.dc * i);

            // Check if out of bounds
            if (newRow < 0 || newRow >= map.length ||
                newCol < 0 || newCol >= map[0].length) {
                break;
            }

            // Check if hit wall
            if (map[newRow][newCol] === TILE_TYPES.WALL) {
                break;
            }

            // Add explosion
            explosions.push({
                row: newRow,
                col: newCol,
                direction: dir.name
            });

            // Stop if hit breakable block
            if (map[newRow][newCol] === TILE_TYPES.BREAKABLE) {
                break;
            }
        }
    });

    return explosions;
}

// Handle player hit by explosion
function handlePlayerHit(player) {
    player.lives--;

    // Broadcast player hit
    Object.values(games[player.gameId].players).forEach(p => {
        sendMessage(p.ws, {
            type: 'player_hit',
            nickname: player.nickname
        });
    });

    // Check if player is eliminated
    if (player.lives <= 0) {
        handlePlayerElimination(player);
    }
}

// Handle player elimination
function handlePlayerElimination(player) {
    const gameId = player.gameId;
    if (!games[gameId]) return;

    // Remove player from game
    delete games[gameId].players[player.nickname];
    delete players[player.nickname];

    // Check if game is over (one player left)
    const remainingPlayers = Object.keys(games[gameId].players);
    if (remainingPlayers.length === 1) {
        // Game over, declare winner
        const winner = games[gameId].players[remainingPlayers[0]];

        sendMessage(winner.ws, {
            type: 'game_over',
            winner: winner.nickname
        });

        // Clean up game
        delete games[gameId];
    }
}

// Handle player disconnect
function handlePlayerDisconnect(playerData) {
    if (!playerData.nickname) return;

    // Remove from waiting room if present
    if (waitingPlayers[playerData.nickname]) {
        delete waitingPlayers[playerData.nickname];
        broadcastWaitingRoomUpdate();
    }

    // Remove from active game if present
    if (playerData.gameId && games[playerData.gameId]) {
        handlePlayerElimination(playerData);
    }

    // Remove from players list
    if (players[playerData.nickname]) {
        delete players[playerData.nickname];
    }
}

// Helper function to send WebSocket message
function sendMessage(ws, data) {
    if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});