// server.js

const http = require('http');
const express = require('express');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Define routes BEFORE static file serving
// Test route to verify server is working
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Simple game version (working version)
app.get('/simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'simple-game.html'));
});

// Serve static files from dist folder (built files)
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Handle other routes (for room links) - serve the built index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // Use environment variable or default to all origins
    methods: ["GET", "POST"]
  }
});

// --- Game Constants (Copied from frontend) ---
const GRAVITY = 0.6;
const JUMP_FORCE = 12;
const MOVE_SPEED = 3;
const STICKMAN_HEALTH = 200; // More health so players need more hits to die
const STICKMAN_MAX_MANA = 100;
const ATTACK_MANA_COST = 20;
const MANA_REGEN_RATE = 1.0;
const STICKMAN_RADIUS = 10;
const ATTACK_RANGE = 60;
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN = 8; // Much faster attack cooldown
const ATTACK_ANIMATION_DURATION = 4; // Very quick animation
const HIT_DURATION = 10;
const OBSTACLE_COUNT = 0;
const OBSTACLE_MIN_SIZE = 20;
const OBSTACLE_MAX_SIZE = 70;
const HAMMER_SPAWN_INTERVAL = 300; // 5 seconds at 60fps
const HAMMER_DURATION = 600; // 10 seconds at 60fps
const HAMMER_DAMAGE_MULTIPLIER = 2.5;
const POWERUP_PICKUP_RADIUS = 25;
const GROUND_WIDTH = 500;
const GROUND_DEPTH = 500;

const PLAYER_CONTROLS = {
    player1: { up: 'w', down: 's', left: 'a', right: 'd', jump: 'enter', attack: ' ' },
    player2: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', jump: 'enter', attack: ' ' }
};

const GameState = { Home: 0, Lobby: 1, Countdown: 2, Playing: 3, GameOver: 4 };
const ObstacleType = { Rock: 'rock', Tire: 'tire', Box: 'box', Wall: 'wall' };


// --- Server State Management ---
const rooms = {};

// --- Helper Functions (Game Logic) ---

// Isometric coordinate transformation functions
function worldToIso(x, y) {
    return {
        x: (x - y) * Math.cos(Math.PI / 6),
        y: (x + y) * Math.sin(Math.PI / 6)
    };
}

function isoToWorld(isoX, isoY) {
    // Inverse transformation
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    
    return {
        x: (isoX / cos30 + isoY / sin30) / 2,
        y: (isoY / sin30 - isoX / cos30) / 2
    };
}

// Accurate collision detection for isometric perspective
function checkObstacleCollision(x, y, z, obstacles) {
    for (const obstacle of obstacles) {
        const dx = Math.abs(x - obstacle.x);
        const dy = Math.abs(y - obstacle.y);
        const halfWidth = obstacle.width / 2;
        const halfDepth = (obstacle.depth || obstacle.width) / 2;
        
        // Reduced collision boundaries for better movement
        const collisionBuffer = STICKMAN_RADIUS * 0.8; // Slightly smaller collision area
        const collisionX = dx < collisionBuffer + halfWidth;
        const collisionY = dy < collisionBuffer + halfDepth;
        const collisionZ = z < obstacle.height;
        
        if (collisionX && collisionY && collisionZ) {
            return obstacle; // Return the colliding obstacle
        }
    }
    return null; // No collision
}

function findSafeSpawnPosition(teamId, obstacles) {
    const baseX = teamId === 'teamA' ? -GROUND_WIDTH / 3 : GROUND_WIDTH / 3;
    const baseY = 0;
    
    // Add some random variation to spawn position
    const x = baseX + (Math.random() - 0.5) * 50;
    const y = baseY + (Math.random() - 0.5) * 50;
    
    console.log(`🎯 Spawn position for ${teamId}: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    return { x, y };
}

function createStickman(id, teamId, controls, obstacles = []) {
    const { x: startX, y: startY } = findSafeSpawnPosition(teamId, obstacles);
    console.log(`👤 Created Player ${id} (${teamId}) at spawn position: (${startX.toFixed(1)}, ${startY.toFixed(1)})`);
    return {
        id,
        teamId,
        controls,
        x: startX,
        y: startY,
        z: 0, vx: 0, vy: 0, vz: 0,
        health: STICKMAN_HEALTH,
        mana: STICKMAN_MAX_MANA,
        isJumping: false,
        attackTimer: 0,
        hitTimer: 0,
        kills: 0,
        facingDirection: teamId === 'teamA' ? 'up-right' : 'down-left',
        state: 'idle',
        powerUp: null,
        powerUpTimer: 0,
    };
}

function generateObstacles() {
    const newObstacles = [];
    const types = Object.values(ObstacleType);
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        let width = OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE);
        let depth = OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE);
        let height = OBSTACLE_MIN_SIZE + Math.random() * (OBSTACLE_MAX_SIZE - OBSTACLE_MIN_SIZE);
        if (type === ObstacleType.Tire) {
            height = 15; // Tires are shorter
            width = depth = 30; // Tires are round
        }
        if (type === ObstacleType.Box) {
            height = 30; // Boxes are medium height
            width = Math.max(width, 30); // Boxes are square-ish
            depth = Math.max(depth, 30);
        }
        if (type === ObstacleType.Wall) {
            height = 50; // Walls are tall
            width = Math.max(width, 60); // Walls are long
            depth = Math.min(depth, 20); // Walls are thin
        }
        if (type === ObstacleType.Rock) {
            // Rocks keep random size
        }
        const obstacle = { id: i, type, x: (Math.random() - 0.5) * (GROUND_WIDTH * 1.5), y: (Math.random() - 0.5) * (GROUND_DEPTH * 1.5), width, depth, height };
        console.log(`🏗️ Generated ${type} obstacle #${i} at (${obstacle.x.toFixed(1)}, ${obstacle.y.toFixed(1)}) size: ${width.toFixed(1)}x${depth.toFixed(1)}x${height.toFixed(1)}`);
        console.log(`    Collision bounds: X=[${(obstacle.x - width/2).toFixed(1)} to ${(obstacle.x + width/2).toFixed(1)}], Y=[${(obstacle.y - depth/2).toFixed(1)} to ${(obstacle.y + depth/2).toFixed(1)}]`);
        newObstacles.push(obstacle);
    }
    return newObstacles;
}


// --- Core Game Loop (Runs on Server) ---
function runGameLoopForRoom(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== GameState.Playing) return;

    // Power-up Spawning
    if (!room.powerUp) {
        room.hammerSpawnTimer--;
        if (room.hammerSpawnTimer <= 0) {
            room.powerUp = {
                id: `hammer-${Date.now()}`, type: 'hammer',
                x: (Math.random() - 0.5) * GROUND_WIDTH, y: (Math.random() - 0.5) * GROUND_DEPTH,
                z: 0, isVisible: true,
            };
        }
    }

    const damageToApply = new Map();
    let killEvents = [];
    let powerUpPickedUpBy = null;

    // Update each stickman
    room.stickmen.forEach(s => {
        if (s.state === 'dead') return;

        // Update timers and mana
        if (s.powerUpTimer > 0) s.powerUpTimer--; else if (s.powerUp) s.powerUp = null;
        if (s.mana < STICKMAN_MAX_MANA) s.mana = Math.min(STICKMAN_MAX_MANA, s.mana + MANA_REGEN_RATE);
        if (s.hitTimer > 0) s.hitTimer--; else if (s.state === 'hit') s.state = 'idle';
        if (s.attackTimer > 0) s.attackTimer--;
        // Keep attacking state visible for animation duration
        if (s.state === 'attacking' && s.attackTimer <= (ATTACK_COOLDOWN - ATTACK_ANIMATION_DURATION)) {
            console.log(`🔄 Player ${s.id} attack animation ended - Timer: ${s.attackTimer}, switching to idle`);
            s.state = 'idle';
        }
        
        // Attack state management (debug removed)
        
        const input = room.playerInputs[s.id] || { keys: {}, attackKeys: [] };
        
        // Process Movement & Actions - WITH DIAGONAL SUPPORT
        if(s.state !== 'hit' && s.state !== 'attacking') {
            // Reset velocity first
            s.vx = 0; s.vy = 0;
            
            // Debug: Log key presses for diagonal movement
            const activeKeys = [];
            if (input.keys[s.controls.up]) activeKeys.push('UP');
            if (input.keys[s.controls.down]) activeKeys.push('DOWN');
            if (input.keys[s.controls.left]) activeKeys.push('LEFT');
            if (input.keys[s.controls.right]) activeKeys.push('RIGHT');
            
            if (activeKeys.length > 1 && Math.random() < 0.1) {
                console.log(`🎮 Player ${s.id} pressing: ${activeKeys.join(' + ')}`);
            }
            
            // Check for movement inputs - allow multiple directions for diagonal movement
            let isMoving = false;
            if (input.keys[s.controls.up]) {
                s.vy = -MOVE_SPEED;
                isMoving = true;
            }
            if (input.keys[s.controls.down]) {
                s.vy = MOVE_SPEED;
                isMoving = true;
            }
            if (input.keys[s.controls.left]) {
                s.vx = -MOVE_SPEED;
                isMoving = true;
            }
            if (input.keys[s.controls.right]) {
                s.vx = MOVE_SPEED;
                isMoving = true;
            }
            
            // Normalize diagonal movement speed (optional - makes diagonal same speed as cardinal)
            if (s.vx !== 0 && s.vy !== 0) {
                const diagonalSpeed = MOVE_SPEED / Math.sqrt(2);
                s.vx = s.vx > 0 ? diagonalSpeed : -diagonalSpeed;
                s.vy = s.vy > 0 ? diagonalSpeed : -diagonalSpeed;
                
                // Log diagonal direction clearly
                let direction = '';
                if (s.vx > 0 && s.vy < 0) direction = 'UP-RIGHT ↗️';
                else if (s.vx < 0 && s.vy < 0) direction = 'UP-LEFT ↖️';
                else if (s.vx > 0 && s.vy > 0) direction = 'DOWN-RIGHT ↘️';
                else if (s.vx < 0 && s.vy > 0) direction = 'DOWN-LEFT ↙️';
                
                if (Math.random() < 0.2) console.log(`🎯 Player ${s.id} moving ${direction} (vx=${s.vx.toFixed(1)}, vy=${s.vy.toFixed(1)}) at pos (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`);
            }
            
            // Jumping
            if (input.keys[s.controls.jump] && !s.isJumping) {
                s.vz = JUMP_FORCE; s.isJumping = true; s.state = 'jumping';
                if (Math.random() < 0.1) console.log(`🦘 Player ${s.id} JUMPING`);
            }
            
            // Attacking
            if (input.attackKeys.length > 0 && s.attackTimer <= 0 && s.mana >= ATTACK_MANA_COST) {
                s.attackTimer = ATTACK_COOLDOWN; s.state = 'attacking'; s.mana -= ATTACK_MANA_COST;
                console.log(`⚔️ Player ${s.id} ATTACKING! State: ${s.state}, Timer: ${s.attackTimer}, Mana: ${s.mana}`);
            } else if (input.attackKeys.length > 0) {
                if (Math.random() < 0.1) console.log(`❌ Player ${s.id} attack blocked - Timer: ${s.attackTimer}, Mana: ${s.mana}/${ATTACK_MANA_COST}`);
            }
            
            // Update state based on movement
            if (s.state !== 'attacking' && s.state !== 'hit') {
                if (isMoving) s.state = 'moving'; 
                else if (!s.isJumping) s.state = 'idle';
            }
        }
        if (input.attackKeys.length > 0) input.attackKeys = [];

        // Apply Physics & Movement - NO OBSTACLES
        // Apply movement directly
        const oldPosX = s.x;
        const oldPosY = s.y;
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;
        s.vz -= GRAVITY;
        
        // Debug: Log actual position changes for diagonal movement
        if ((s.vx !== 0 && s.vy !== 0) && Math.random() < 0.1) {
            console.log(`📍 Player ${s.id} position: (${oldPosX.toFixed(1)}, ${oldPosY.toFixed(1)}) → (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) | Δx=${(s.x - oldPosX).toFixed(1)}, Δy=${(s.y - oldPosY).toFixed(1)}`);
        }

        // Improved boundary collision - keep players within playground
        const mapBoundary = GROUND_WIDTH * 0.9; // Slightly smaller than visual boundary
        const mapDepthBoundary = GROUND_DEPTH * 0.9;
        
        if (s.x < -mapBoundary) {
            s.x = -mapBoundary;
            s.vx = 0;
            if (Math.random() < 0.1) console.log(`🚧 Player ${s.id} hit left boundary`);
        }
        if (s.x > mapBoundary) {
            s.x = mapBoundary;
            s.vx = 0;
            if (Math.random() < 0.1) console.log(`🚧 Player ${s.id} hit right boundary`);
        }
        if (s.y < -mapDepthBoundary) {
            s.y = -mapDepthBoundary;
            s.vy = 0;
            if (Math.random() < 0.1) console.log(`🚧 Player ${s.id} hit top boundary`);
        }
        if (s.y > mapDepthBoundary) {
            s.y = mapDepthBoundary;
            s.vy = 0;
            if (Math.random() < 0.1) console.log(`🚧 Player ${s.id} hit bottom boundary`);
        }

        // Ground collision
        if (s.z < 0) { s.z = 0; s.vz = 0; s.isJumping = false; if (s.state === 'jumping') s.state = 'idle';}

        // No obstacle collision checks needed anymore

        // Player-to-player collision (pushing)
        room.stickmen.forEach(other => {
            if (other.id !== s.id && other.state !== 'dead') {
                const dx = s.x - other.x;
                const dy = s.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = STICKMAN_RADIUS * 2;
                
                if (distance < minDistance && distance > 0) {
                    // Push players apart
                    const pushForce = (minDistance - distance) / 2;
                    const pushX = (dx / distance) * pushForce;
                    const pushY = (dy / distance) * pushForce;
                    
                    s.x += pushX;
                    s.y += pushY;
                    other.x -= pushX;
                    other.y -= pushY;
                    
                    // Push logging disabled to reduce spam
                    // console.log(`👥 Player ${s.id} pushing Player ${other.id}`);
                }
            }
        }); 

        // Power-up pickup check
        if (room.powerUp?.isVisible && Math.sqrt(Math.pow(s.x - room.powerUp.x, 2) + Math.pow(s.y - room.powerUp.y, 2)) < POWERUP_PICKUP_RADIUS) {
            powerUpPickedUpBy = s.id;
        }
    });

    // Handle power-up pickup
    if (powerUpPickedUpBy !== null) {
        room.stickmen.forEach(s => { if (s.id === powerUpPickedUpBy) { s.powerUp = 'hammer'; s.powerUpTimer = HAMMER_DURATION; }});
        room.powerUp = null;
        room.hammerSpawnTimer = HAMMER_SPAWN_INTERVAL;
    }

    // Process Attacks
    room.stickmen.forEach(attacker => {
        // Attack processing (removed debug spam)
        if (attacker.state === 'attacking' && attacker.attackTimer === ATTACK_COOLDOWN) {
            console.log(`🗡️ Processing attack from Player ${attacker.id} - Timer: ${attacker.attackTimer}, State: ${attacker.state}`);
            room.stickmen.forEach(target => {
                if (target.id !== attacker.id && target.teamId !== attacker.teamId && target.state !== 'dead') {
                    const distance = Math.sqrt(Math.pow(attacker.x - target.x, 2) + Math.pow(attacker.y - target.y, 2) + Math.pow(attacker.z - target.z, 2));
                    console.log(`🎯 Checking attack on Player ${target.id} - Distance: ${distance.toFixed(1)}, Range: ${ATTACK_RANGE}`);
                    if (distance < ATTACK_RANGE) {
                        const damage = attacker.powerUp === 'hammer' ? ATTACK_DAMAGE * HAMMER_DAMAGE_MULTIPLIER : ATTACK_DAMAGE;
                        const currentDamage = damageToApply.get(target.id) || 0;
                        damageToApply.set(target.id, currentDamage + damage);
                        console.log(`💥 HIT! Player ${attacker.id} hits Player ${target.id} for ${damage} damage (Health: ${target.health} -> ${target.health - (currentDamage + damage)})`);
                        if (target.health - (currentDamage + damage) <= 0) {
                            killEvents.push({ attackerId: attacker.id, targetId: target.id });
                            console.log(`💀 KILL! Player ${target.id} will be killed by Player ${attacker.id}`);
                        }
                    }
                }
            });
        }
    });

    
    // Apply Damage & Kills
    room.stickmen.forEach(s => {
        const damage = damageToApply.get(s.id);
        if (damage) {
            const oldHealth = s.health;
            s.health = Math.max(0, s.health - damage);
            console.log(`🩸 Applying ${damage} damage to Player ${s.id}: ${oldHealth} -> ${s.health}`);
            if (s.health > 0) {
                s.state = 'hit'; s.hitTimer = HIT_DURATION;
                console.log(`😵 Player ${s.id} is HIT! State: ${s.state}, Timer: ${s.hitTimer}`);
            } else {
                s.state = 'dead';
                console.log(`💀 Player ${s.id} is DEAD!`);
            }
        }
    });
    killEvents.forEach(kill => {
        room.stickmen.forEach(s => { if (s.id === kill.attackerId) s.kills++; });
    });

    // Check for game over
    const aliveTeamA = room.stickmen.some(s => s.teamId === 'teamA' && s.state !== 'dead');
    const aliveTeamB = room.stickmen.some(s => s.teamId === 'teamB' && s.state !== 'dead');
    if (!aliveTeamA || !aliveTeamB) {
        room.gameState = GameState.GameOver;
        room.winner = aliveTeamA ? room.teams.teamA : (aliveTeamB ? room.teams.teamB : null);
        clearInterval(room.gameLoopInterval);
        room.gameLoopInterval = null;
    }

    // Debug: Log attacking players before sending state
    const attackingPlayers = room.stickmen.filter(s => s.state === 'attacking');
    if (attackingPlayers.length > 0) {
        console.log(`📡 Sending game state with attacking players:`, attackingPlayers.map(s => `Player ${s.id} (state: ${s.state}, timer: ${s.attackTimer})`));
    }

    // Broadcast the final state for this frame
    io.to(roomId).emit('gameStateSync', room);
}


// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('createRoom', ({ roomId, teams }) => {
        socket.join(roomId);
        rooms[roomId] = {
            stickmen: [],
            obstacles: generateObstacles(),
            powerUp: null,
            gameState: GameState.Lobby,
            countdown: 5,
            winner: null,
            teams,
            playerInputs: {},
            gameLoopInterval: null,
            hammerSpawnTimer: HAMMER_SPAWN_INTERVAL,
            nextPlayerId: 0,
        };
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRequest', ({ roomId, sessionId, teamId, teamDetails }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('roomError', 'Room not found');
            return;
        }
        
        if (room.stickmen.find(p => p.socketId === socket.id)) {
            socket.emit('roomError', 'Already joined this room');
            return;
        }

        socket.join(roomId);
        const teamPlayers = room.stickmen.filter(s => s.teamId === teamId).length;
        if (teamPlayers >= 4) {
            const teamName = teamId === 'teamA' ? room.teams.teamA.name : room.teams.teamB.name;
            socket.emit('roomError', `${teamName} is full (4/4 players)`);
            return;
        }

        const controls = room.stickmen.length === 0 ? PLAYER_CONTROLS.player1 : PLAYER_CONTROLS.player2;
        const newPlayer = createStickman(room.nextPlayerId++, teamId, controls, room.obstacles);
        newPlayer.socketId = socket.id; // Associate socket with player
        room.stickmen.push(newPlayer);
        
        if (teamId === 'teamA') room.teams.teamA = teamDetails; else room.teams.teamB = teamDetails;

        socket.emit('playerAssigned', { sessionId, player: newPlayer, teams: room.teams });

        // Start game when both teams have at least 1 player (minimum 2 players total)
        const teamACount = room.stickmen.filter(s => s.teamId === 'teamA').length;
        const teamBCount = room.stickmen.filter(s => s.teamId === 'teamB').length;
        if (teamACount >= 1 && teamBCount >= 1 && !room.gameLoopInterval) {
            room.gameState = GameState.Countdown;
            const countdownInterval = setInterval(() => {
                room.countdown--;
                io.to(roomId).emit('gameStateSync', room);
                if (room.countdown < 0) {
                    clearInterval(countdownInterval);
                    room.gameState = GameState.Playing;
                    room.gameLoopInterval = setInterval(() => runGameLoopForRoom(roomId), 1000 / 60);
                }
            }, 1000);
        }

        io.to(roomId).emit('gameStateSync', room);
    });

    socket.on('playerInput', ({ roomId, playerId, keys, attackKeys }) => {
        console.log(`🎮 Server received input - Player ${playerId}:`, keys, 'Attacks:', attackKeys);
        const room = rooms[roomId];
        if (room && room.playerInputs) {
            if (!room.playerInputs[playerId]) room.playerInputs[playerId] = { keys: {}, attackKeys: [] };
            room.playerInputs[playerId].keys = keys;
            if(attackKeys.length > 0) room.playerInputs[playerId].attackKeys.push(...attackKeys);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Find the room the player was in and remove them
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.stickmen.findIndex(p => p.socketId === socket.id);
            if (playerIndex > -1) {
                const disconnectedPlayer = room.stickmen[playerIndex];
                delete room.playerInputs[disconnectedPlayer.id];
                room.stickmen.splice(playerIndex, 1);
                
                // If the game is running, end it and declare the other player the winner
                if (room.gameLoopInterval) {
                    clearInterval(room.gameLoopInterval);
                    room.gameLoopInterval = null;
                    room.gameState = GameState.GameOver;
                    if(room.stickmen.length > 0) {
                        const winningTeamId = room.stickmen[0].teamId;
                        room.winner = room.teams[winningTeamId];
                    } else {
                        // Handle case where both disconnect or it's a draw
                        room.winner = null; 
                    }
                }
                 // If the room is now empty, delete it
                if (room.stickmen.length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} is now empty and has been deleted.`);
                } else {
                    io.to(roomId).emit('gameStateSync', room);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});
