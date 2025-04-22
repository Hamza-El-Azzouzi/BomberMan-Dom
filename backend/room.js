export class Room {
  constructor(id, gameMap) {
    this.id = id;
    this.clients = new Map();
    this.status = "waiting";
    this.messages = [];
    this.gameMap = gameMap;
    this.countdown = null;
  }

  handleConnection(ws) {
    const client = { ws, registered: false };
    this.clients.set(ws, client);

    console.log(`New client connected to room ${this.id}`);

    ws.on("close", () => {
      this.clients.delete(ws);
      this.broadcastPlayerCount();
      this.checkAutoStart();
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(client, msg);
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    });
  }

  handleMessage(client, msg) {
    switch (msg.type) {
      case "register":
        if (this.isNicknameTaken(msg.nickname)) {
          client.ws.send(JSON.stringify({ type: "nickname_taken" }));
          return;
        }
        client.nickname = msg.nickname;
        client.registered = true;

        this.messages.forEach((message) => {
          client.ws.send(JSON.stringify(message));
        });

        this.broadcastPlayerCount();
        this.checkAutoStart();
        break;

      case "chat":
        const chatMsg = {
          type: "chat",
          nickname: client.nickname,
          message: msg.message,
          timestamp: Date.now(),
          roomId: this.id,
        };
        this.messages.push(chatMsg);
        this.broadcastChatMessage(chatMsg);
        break;

      case "player_move":
        this.broadcastPlayerMove(msg);
        break;
      case "ability":
        this.broadcastAbility(msg);
        break;
      case "bomb_placed":
        this.broadcastBombExplosion(msg);
        break;
      case "explosion":
        this.broadcastBombExplosion(msg);
        break;
    }
  }

  broadcastBombExplosion(msg) {
    for (const [ws, client] of this.clients) {
      if (client.nickname !== msg.nickname) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  broadcastPlayerCount() {
    const count = this.getRegisteredPlayersCount();
    const msg = {
      type: "player_count",
      count: count,
      roomId: this.id,
    };
    this.broadcast(msg);
    this.checkAutoStart();
  }

  broadcastChatMessage(msg) {
    this.broadcast(msg);
  }

  broadcastPlayerMove(msg) {
    for (const [ws, client] of this.clients) {
      if (client.nickname !== msg.nickname) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  broadcastAbility(msg) {
    for (const [ws, client] of this.clients) {
      if (client.nickname !== msg.nickname) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  getRegisteredPlayersCount() {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.registered) count++;
    }
    return count;
  }

  isNicknameTaken(nickname) {
    for (const client of this.clients.values()) {
      if (client.registered && client.nickname === nickname) {
        return true;
      }
    }
    return false;
  }

  broadcast(msg) {
    const message = JSON.stringify(msg);
    for (const [ws] of this.clients) {
      ws.send(message);
    }
  }

  checkAutoStart() {
    if (this.status === "ingame") return;

    const count = this.getRegisteredPlayersCount();
    if (count >= 2 && count < 4) {
      this.startCountdown(2);
    } else if (count === 4) {
      this.startCountdown(10);
    }
  }

  startCountdown(seconds) {
    if (this.countdown) {
      clearInterval(this.countdown);
    }

    let countdown = seconds;
    this.countdown = setInterval(() => {
      this.broadcast({
        type: "countdown",
        seconds: countdown,
      });

      if (countdown <= 0) {
        clearInterval(this.countdown);
        this.startGame();
        return;
      }
      countdown--;
    }, 1000);
  }

  startGame() {
    this.status = "ingame";
    const positions = [
      [1, 1],
      [13, 11],
      [13, 1],
      [1, 11],
    ];
    const playerInfos = [];
    let i = 0;

    for (const client of this.clients.values()) {
      if (client.registered) {
        playerInfos.push({
          nickname: client.nickname,
          x: positions[i][0] * 50,
          y: positions[i][1] * 50,
          col: positions[i][0],
          row: positions[i][1],
        });
        i++;
      }
    }

    this.broadcast({
      type: "start_game",
      players: playerInfos,
      map: this.gameMap,
    });
  }
}
