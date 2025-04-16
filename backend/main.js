import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { RoomManager } from './room_manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

const server = createServer(async (req, res) => {
    try {
        let filePath = join(__dirname, '../frontend', req.url === '/' ? 'index.html' : req.url);
        const ext = extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(500);
            res.end('Server error: ' + err.code);
        }
    }
});

const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
    const room = roomManager.findAvailableRoom();
    room.handleConnection(ws);
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
