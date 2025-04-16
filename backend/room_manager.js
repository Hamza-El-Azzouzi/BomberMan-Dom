import { Room } from './room.js';
import { generateMap } from './map_generator.js';

export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    findAvailableRoom() {
        console.log(`Looking for available room. Total rooms: ${this.rooms.size}`);

        for (const [id, room] of this.rooms.entries()) {
            const count = room.getRegisteredPlayersCount();
            console.log(`Room ${id}: players=${count}, status=${room.status}`);

            if (count < 4 && room.status === 'waiting') {
                console.log(`Found available room: ${id}`);
                return room;
            }
        }

        const room = this.createRoom();
        this.rooms.set(room.id, room);
        console.log(`Created new room: ${room.id}`);
        return room;
    }

    createRoom() {
        const roomId = `room_${this.rooms.size}`;
        return new Room(roomId, generateMap());
    }
}