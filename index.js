// Convert the TypeScript React code to plain JavaScript for browser compatibility
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Import types (we'll define them inline for simplicity)
const GameState = {
  Home: 0,
  Lobby: 1,
  Countdown: 2,
  Playing: 3,
  GameOver: 4
};

const PLAYER_CONTROLS = {
  player1: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', jump: 'Enter', attack: ' ' },
  player2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', jump: 'Enter', attack: ' ' }
};

// TeamCustomizer Component
const TeamCustomizer = ({ team, setTeam, defaultColor }) => {
  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTeam({ ...team, image: event.target?.result });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return React.createElement('div', { className: "w-full p-4 bg-gray-700 rounded-lg" },
    React.createElement('h3', { 
      className: "text-2xl font-bold mb-3", 
      style: { color: team.color } 
    }, team.name || 'Team Name'),
    React.createElement('input', {
      type: "text",
      placeholder: "Enter Team Name",
      value: team.name,
      onChange: (e) => setTeam({ ...team, name: e.target.value }),
      className: "w-full bg-gray-800 text-white p-2 rounded mb-3"
    }),
    React.createElement('input', {
      type: "file",
      accept: "image/*",
      onChange: handleImageUpload,
      className: "w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500"
    }),
    team.image && React.createElement('img', {
      src: team.image,
      alt: "team logo",
      className: "w-20 h-20 rounded-full mx-auto mt-3 object-cover"
    })
  );
};

// Constants
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 800;
const GROUND_WIDTH = 500;
const GROUND_DEPTH = 500;
const STICKMAN_HEIGHT = 50;
const STICKMAN_HEALTH = 200;
const STICKMAN_MAX_MANA = 100;

// Function to project 3D world coordinates to 2D screen coordinates
const worldToScreen = (x, y, z) => {
  const screenX = (x - y) * Math.cos(Math.PI / 6) + CANVAS_WIDTH / 2;
  const screenY = (x + y) * Math.sin(Math.PI / 6) - z + CANVAS_HEIGHT / 2.5;
  return { x: screenX, y: screenY };
};

const drawStickman = (ctx, stickman, teams, teamImages) => {
  const { x, y, z, teamId, health, mana, state, powerUp } = stickman;
  
  if (state === 'dead') return;

  const { x: screenX, y: screenY } = worldToScreen(x, y, z);
  const team = teams[teamId];
  const teamImage = teamImages[teamId];
  const hasHammer = powerUp === 'hammer';

  const color = state === 'hit' ? '#ffffff' : (teamId === 'teamA' ? teams.teamA.color : teams.teamB.color);
  const headRadius = 15;
  const bodyLength = 30;
  const limbLength = 20;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;

  // Shadow
  const { x: shadowX, y: shadowY } = worldToScreen(x, y, 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(shadowX, shadowY + 35, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(screenX, screenY, headRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Body
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + headRadius);
  ctx.lineTo(screenX, screenY + headRadius + bodyLength);
  ctx.stroke();

  // Arms
  if (state === 'attacking') {
    // Fast punching pose - one arm extended forward
    ctx.strokeStyle = '#ff4444'; // Bright red for punch
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + headRadius + 8);
    ctx.lineTo(screenX + limbLength * 1.8, screenY + headRadius - 5); // Higher punch
    ctx.stroke();
    
    // Other arm back in defensive position
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + headRadius + 12);
    ctx.lineTo(screenX - limbLength * 0.8, screenY + headRadius + 8);
    ctx.stroke();
    
    // Fist at end of punch (larger, more visible)
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(screenX + limbLength * 1.8, screenY + headRadius - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Impact lines (instead of circle)
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    const fistX = screenX + limbLength * 1.8;
    const fistY = screenY + headRadius - 5;
    
    // Draw impact lines radiating from fist
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fistX, fistY);
      ctx.lineTo(fistX + Math.cos(angle) * 15, fistY + Math.sin(angle) * 15);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + headRadius + 10);
    ctx.lineTo(screenX + limbLength, screenY + headRadius + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + headRadius + 10);
    ctx.lineTo(screenX - limbLength, screenY + headRadius + 20);
    ctx.stroke();
  }

  // Legs
  const legY = screenY + headRadius + bodyLength;
  ctx.beginPath();
  ctx.moveTo(screenX, legY);
  ctx.lineTo(screenX + limbLength / 2, legY + limbLength);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screenX, legY);
  ctx.lineTo(screenX - limbLength / 2, legY + limbLength);
  ctx.stroke();
   
  // Health and Mana bars
  const barWidth = 40;
  const barHeight = 5;
  const barYOffset = 15;
  const healthBarY = screenY - STICKMAN_HEIGHT - barYOffset;
  const manaBarY = healthBarY + barHeight + 2;

  // Health bar
  const healthPercentage = health / STICKMAN_HEALTH;
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(screenX - barWidth / 2, healthBarY, barWidth, barHeight);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(screenX - barWidth / 2, healthBarY, barWidth * healthPercentage, barHeight);

  // Mana bar
  const manaPercentage = mana / STICKMAN_MAX_MANA;
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(screenX - barWidth / 2, manaBarY, barWidth, barHeight);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(screenX - barWidth / 2, manaBarY, barWidth * manaPercentage, barHeight);
};

// Draw obstacle function with different shapes
const drawObstacle = (ctx, obstacle) => {
  const screenPos = worldToScreen(obstacle.x, obstacle.y, obstacle.height / 2);
  
  ctx.save();
  
  // Different shapes based on obstacle type
  switch (obstacle.type) {
    case 'tire':
      drawTire(ctx, screenPos, obstacle);
      break;
    case 'rock':
      drawRock(ctx, screenPos, obstacle);
      break;
    case 'wood':
      drawWood(ctx, screenPos, obstacle);
      break;
    default:
      drawGenericObstacle(ctx, screenPos, obstacle);
  }
  
  ctx.restore();
};

// Draw tire obstacle
const drawTire = (ctx, screenPos, obstacle) => {
  const radius = obstacle.width * 0.8;
  
  // Outer tire
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Bright border for visibility
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Inner tire hole
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Tire treads
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = screenPos.x + Math.cos(angle) * radius * 0.7;
    const y1 = screenPos.y + Math.sin(angle) * radius * 0.7;
    const x2 = screenPos.x + Math.cos(angle) * radius * 0.9;
    const y2 = screenPos.y + Math.sin(angle) * radius * 0.9;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(screenPos.x + 5, screenPos.y + radius + 10, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
};

// Draw rock obstacle
const drawRock = (ctx, screenPos, obstacle) => {
  const size = obstacle.width;
  
  // Main rock body (irregular shape)
  ctx.fillStyle = '#6b7280';
  ctx.beginPath();
  ctx.moveTo(screenPos.x - size * 0.8, screenPos.y);
  ctx.lineTo(screenPos.x - size * 0.3, screenPos.y - size * 0.9);
  ctx.lineTo(screenPos.x + size * 0.4, screenPos.y - size * 0.7);
  ctx.lineTo(screenPos.x + size * 0.9, screenPos.y - size * 0.2);
  ctx.lineTo(screenPos.x + size * 0.6, screenPos.y + size * 0.3);
  ctx.lineTo(screenPos.x - size * 0.2, screenPos.y + size * 0.4);
  ctx.closePath();
  ctx.fill();
  
  // Bright border for visibility
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Rock highlights
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(screenPos.x - size * 0.3, screenPos.y - size * 0.9);
  ctx.lineTo(screenPos.x + size * 0.1, screenPos.y - size * 0.8);
  ctx.lineTo(screenPos.x - size * 0.1, screenPos.y - size * 0.5);
  ctx.closePath();
  ctx.fill();
  
  // Rock cracks
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenPos.x - size * 0.2, screenPos.y - size * 0.6);
  ctx.lineTo(screenPos.x + size * 0.3, screenPos.y - size * 0.1);
  ctx.stroke();
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(screenPos.x + 3, screenPos.y + size * 0.5, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
};

// Draw wood obstacle
const drawWood = (ctx, screenPos, obstacle) => {
  const width = obstacle.width;
  const height = obstacle.height;
  
  // Main log body
  ctx.fillStyle = '#92400e';
  ctx.fillRect(screenPos.x - width/2, screenPos.y - height/2, width, height * 0.8);
  
  // Bright border for visibility
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(screenPos.x - width/2, screenPos.y - height/2, width, height * 0.8);
  
  // Wood grain lines
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = screenPos.y - height/2 + (i + 1) * height * 0.2;
    ctx.beginPath();
    ctx.moveTo(screenPos.x - width/2, y);
    ctx.lineTo(screenPos.x + width/2, y);
    ctx.stroke();
  }
  
  // Log ends (circular)
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.arc(screenPos.x - width/2, screenPos.y, height * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(screenPos.x + width/2, screenPos.y, height * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Tree rings on ends
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(screenPos.x - width/2, screenPos.y, height * 0.1 * i, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(screenPos.x + width/2, screenPos.y, height * 0.1 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(screenPos.x - width/2 + 5, screenPos.y + height * 0.4, width, height * 0.2);
};

// Draw generic obstacle (fallback)
const drawGenericObstacle = (ctx, screenPos, obstacle) => {
  const width = obstacle.width;
  const height = obstacle.height;
  
  // Simple box
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(screenPos.x - width/2, screenPos.y - height/2, width, height);
  
  // Bright border for visibility
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.strokeRect(screenPos.x - width/2, screenPos.y - height/2, width, height);
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(screenPos.x - width/2 + 3, screenPos.y + height/2, width, height * 0.2);
};

// Draw power-up
const drawPowerUp = (ctx, powerUp) => {
  if (!powerUp.isVisible) return;
  
  const screenPos = worldToScreen(powerUp.x, powerUp.y, 20);
  
  // Glowing effect
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 20;
  
  // Power-up crystal
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(screenPos.x, screenPos.y - 15);
  ctx.lineTo(screenPos.x + 10, screenPos.y - 5);
  ctx.lineTo(screenPos.x + 8, screenPos.y + 10);
  ctx.lineTo(screenPos.x - 8, screenPos.y + 10);
  ctx.lineTo(screenPos.x - 10, screenPos.y - 5);
  ctx.closePath();
  ctx.fill();
  
  // Inner glow
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(screenPos.x, screenPos.y - 10);
  ctx.lineTo(screenPos.x + 5, screenPos.y - 2);
  ctx.lineTo(screenPos.x + 3, screenPos.y + 5);
  ctx.lineTo(screenPos.x - 3, screenPos.y + 5);
  ctx.lineTo(screenPos.x - 5, screenPos.y - 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
};

// GameCanvas Component with full rendering
const GameCanvas = ({ stickmen, teams, obstacles, powerUp }) => {
  const canvasRef = useRef(null);
  const [teamImages, setTeamImages] = useState({ teamA: null, teamB: null });

  useEffect(() => {
    const loadImage = (src, teamKey) => {
      if (!src) {
        setTeamImages(prev => ({ ...prev, [teamKey]: null }));
        return;
      }
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setTeamImages(prev => ({ ...prev, [teamKey]: img }));
      };
    };
    loadImage(teams.teamA.image, 'teamA');
    loadImage(teams.teamB.image, 'teamB');
  }, [teams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.fillStyle = '#111827';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw ground plane (isometric rhombus)
    context.save();
    context.beginPath();
    const topCorner = worldToScreen(-GROUND_WIDTH, -GROUND_DEPTH, 0);
    const rightCorner = worldToScreen(GROUND_WIDTH, -GROUND_DEPTH, 0);
    const bottomCorner = worldToScreen(GROUND_WIDTH, GROUND_DEPTH, 0);
    const leftCorner = worldToScreen(-GROUND_WIDTH, GROUND_DEPTH, 0);
    
    context.moveTo(topCorner.x, topCorner.y + 30);
    context.lineTo(rightCorner.x, rightCorner.y + 30);
    context.lineTo(bottomCorner.x, bottomCorner.y + 30);
    context.lineTo(leftCorner.x, leftCorner.y + 30);
    context.closePath();
    
    context.fillStyle = '#374151';
    context.fill();
    context.strokeStyle = '#4b5563';
    context.lineWidth = 5;
    context.stroke();
    context.restore();

    // Draw obstacles
    obstacles.forEach(obstacle => {
      drawObstacle(context, obstacle);
    });

    // Draw stickmen
    stickmen.forEach(stickman => {
      drawStickman(context, stickman, teams, teamImages);
    });

    // Draw power-up
    if (powerUp && powerUp.isVisible) {
      drawPowerUp(context, powerUp);
    }

    // Draw game info if no players
    if (stickmen.length === 0) {
      context.fillStyle = '#ffffff';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText('Waiting for players to join...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

  }, [stickmen, teams, teamImages, obstacles, powerUp]);

  return React.createElement('canvas', {
    ref: canvasRef,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    className: "rounded-lg shadow-2xl",
    style: { 
      width: '100vw', 
      height: '100vh',
      maxWidth: '100vw', 
      maxHeight: '100vh',
      objectFit: 'contain'
    }
  });
};

// Main App Component
const App = () => {
  const [gameState, setGameState] = useState(GameState.Home);
  const [stickmen, setStickmen] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [teams, setTeams] = useState({
    teamA: { name: 'Team A', image: null, color: '#3b82f6' },
    teamB: { name: 'Team B', image: null, color: '#ef4444' }
  });
  const [roomId, setRoomId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [winner, setWinner] = useState(null);
  const [powerUp, setPowerUp] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [socket, setSocket] = useState(null);

  const keysPressed = useRef({});
  const attackKeysToProcess = useRef(new Set());
  const sessionId = useRef(Math.random().toString(36).substring(2, 9));

  // Socket connection
  useEffect(() => {
    console.log('Initializing socket connection...');
    // Use current origin for production, localhost for development
    const SERVER_URL = window.location.hostname === 'localhost' 
      ? "http://localhost:3004" 
      : window.location.origin;
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('roomId');
    if (roomIdFromUrl) {
      setRoomId(roomIdFromUrl);
      newSocket.emit('joinRoom', roomIdFromUrl);
      setGameState(GameState.Lobby);
    }
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    socket.on('gameStateSync', (payload) => {
      // Debug: Log attacking players when received
      const attackingPlayers = payload.stickmen.filter(s => s.state === 'attacking');
      if (attackingPlayers.length > 0) {
        console.log(`📥 Client received attacking players:`, attackingPlayers.map(s => `Player ${s.id} (state: ${s.state}, timer: ${s.attackTimer})`));
      }
      
      setStickmen(payload.stickmen);
      setObstacles(payload.obstacles);
      setPowerUp(payload.powerUp);
      setGameState(payload.gameState);
      setCountdown(payload.countdown);
      setWinner(payload.winner);
      setTeams(payload.teams);
    });

    socket.on('playerAssigned', (payload) => {
      if (payload.sessionId === sessionId.current) {
        setMyPlayerId(payload.player.id);
        setTeams(payload.teams);
      }
    });

    socket.on('roomCreated', (newRoomId) => {
      setRoomId(newRoomId);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('roomId', newRoomId);
        window.history.pushState({}, '', url);
      } catch (e) {
        console.warn("Could not update URL with pushState.");
      }
      setGameState(GameState.Lobby);
    });

    return () => {
      socket.off('gameStateSync');
      socket.off('playerAssigned');
      socket.off('roomCreated');
    };
  }, [socket]);

  // Simple, reliable input handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('🔽 KEY DOWN:', e.key, 'Player:', myPlayerId, 'GameState:', gameState, 'Room:', roomId, 'Socket:', !!socket);
      
      if (myPlayerId === null || !roomId || !socket || gameState !== GameState.Playing) {
        console.log('❌ Input blocked - Player:', myPlayerId, 'Room:', roomId, 'Socket:', !!socket, 'GameState:', gameState);
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Only track game-relevant keys
      const gameKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', ' '];
      if (!gameKeys.includes(key)) {
        console.log('🚫 Ignoring non-game key:', key);
        return;
      }
      
      if (keysPressed.current[key]) {
        console.log('🔄 Key repeat blocked:', key);
        return; // prevent repeats
      }
      keysPressed.current[key] = true;
      
      // Handle attack key (space) - send it as an attack immediately
      if (key === ' ' && !e.repeat) {
        console.log('⚔️ Attack key pressed - sending attack!');
        socket.emit('playerInput', { 
          roomId, 
          playerId: myPlayerId, 
          keys: { ...keysPressed.current }, 
          attackKeys: [' '] 
        });
        return; // Don't add space to regular keys
      }
      
      // Also handle Enter as jump
      if (key === 'enter' && !e.repeat) {
        console.log('🦘 Jump key pressed:', key);
      }
      
      // Send input immediately for movement keys
      console.log('📤 Sending input - Keys:', keysPressed.current);
      socket.emit('playerInput', { 
        roomId, 
        playerId: myPlayerId, 
        keys: { ...keysPressed.current }, 
        attackKeys: [] 
      });
    };

    const handleKeyUp = (e) => {
      console.log('🔼 KEY UP:', e.key, 'Player:', myPlayerId);
      
      if (myPlayerId === null || !roomId || !socket || gameState !== GameState.Playing) {
        console.log('❌ KeyUp blocked - Player:', myPlayerId, 'Room:', roomId, 'Socket:', !!socket, 'GameState:', gameState);
        return;
      }
      const key = e.key.toLowerCase();
      
      // Only track game-relevant keys
      const gameKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', ' '];
      if (!gameKeys.includes(key)) {
        console.log('🚫 Ignoring non-game key release:', key);
        return;
      }
      
      keysPressed.current[key] = false;
      
      console.log('📤 Sending keyup input - Keys:', keysPressed.current);
      // Send input immediately
      socket.emit('playerInput', { 
        roomId, 
        playerId: myPlayerId, 
        keys: { ...keysPressed.current }, 
        attackKeys: [] 
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, myPlayerId, roomId, gameState]);

  const createRoom = () => {
    const updatedTeamA = { ...teams.teamA, name: teams.teamA.name.trim() || 'Team A' };
    const updatedTeamB = { ...teams.teamB, name: teams.teamB.name.trim() || 'Team B' };
    setTeams({ teamA: updatedTeamA, teamB: updatedTeamB });
    const newRoomId = Math.random().toString(36).substring(2, 9);
    
    socket?.emit('createRoom', { roomId: newRoomId, teams: { teamA: updatedTeamA, teamB: updatedTeamB } });
  };

  const joinTeam = (teamId) => {
    if (myPlayerId !== null || !roomId) return;
    const myTeamDetails = teamId === 'teamA' ? teams.teamA : teams.teamB;
    const payload = { sessionId: sessionId.current, teamId, teamDetails: myTeamDetails };
    
    socket?.emit('joinRequest', { roomId, ...payload });
  };

  const resetGame = () => {
    window.location.href = window.location.pathname;
  };

  const scores = stickmen.reduce((acc, s) => {
    if (s.teamId === 'teamA') acc.teamA += s.kills;
    else acc.teamB += s.kills;
    return acc;
  }, { teamA: 0, teamB: 0 });

  const renderOverlayContent = () => {
    switch (gameState) {
      case GameState.Home:
        return React.createElement('div', { className: "text-center bg-gray-800 bg-opacity-90 p-10 rounded-lg shadow-xl backdrop-blur-sm w-full max-w-4xl" },
          React.createElement('h1', { className: "text-6xl font-bold text-white mb-6 tracking-wider" }, 'Stickman Battle'),
          React.createElement('p', { className: "text-xl text-gray-300 mb-8" }, 'Create your own teams and fight for glory!'),
          React.createElement('div', { className: "flex gap-8 justify-center items-start" },
            React.createElement(TeamCustomizer, { 
              team: teams.teamA, 
              setTeam: (t) => setTeams(p => ({ ...p, teamA: t })), 
              defaultColor: "#3b82f6" 
            }),
            React.createElement('div', { className: "self-center text-4xl font-bold text-gray-400" }, 'VS'),
            React.createElement(TeamCustomizer, { 
              team: teams.teamB, 
              setTeam: (t) => setTeams(p => ({ ...p, teamB: t })), 
              defaultColor: "#ef4444" 
            })
          ),
          React.createElement('button', { 
            onClick: createRoom, 
            className: "mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg text-2xl transition-transform transform hover:scale-105" 
          }, 'Create Room')
        );
      
      case GameState.Lobby:
      case GameState.Countdown:
        const lobbyUrl = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;
        const hasJoined = myPlayerId !== null;
        return React.createElement('div', { className: "text-center bg-gray-800 bg-opacity-90 p-10 rounded-lg shadow-xl backdrop-blur-sm w-full max-w-4xl" },
          React.createElement('h1', { className: "text-5xl font-bold text-white mb-2 tracking-wider" }, 'BATTLE LOBBY'),
          roomId && React.createElement('div', { className: "mb-4" },
            React.createElement('p', { className: "text-gray-300" }, 'Share this link with a friend:'),
            React.createElement('input', { 
              type: "text", 
              readOnly: true, 
              value: lobbyUrl, 
              className: "w-full max-w-md bg-gray-900 text-yellow-300 p-2 rounded mt-1 text-center",
              onClick: (e) => e.target.select()
            })
          ),
          React.createElement('div', { className: "flex justify-around items-start mt-6 gap-8" },
            // Team A Section
            React.createElement('div', { className: "flex-1 p-6 bg-gray-700 bg-opacity-50 rounded-lg border-2", style: { borderColor: teams.teamA.color } },
              React.createElement('h2', { 
                className: "text-3xl mb-4 font-bold text-center", 
                style: { color: teams.teamA.color } 
              }, teams.teamA.name),
              
              // Team A Players List
              React.createElement('div', { className: "mb-4 min-h-[120px]" },
                React.createElement('h3', { className: "text-lg font-semibold text-gray-300 mb-2" }, 
                  `Players (${stickmen.filter(s => s.teamId === 'teamA').length}/4):`
                ),
                stickmen.filter(s => s.teamId === 'teamA').length === 0 ? 
                  React.createElement('p', { className: "text-gray-500 italic" }, 'No players yet...') :
                  React.createElement('div', { className: "space-y-2" },
                    ...stickmen.filter(s => s.teamId === 'teamA').map(s => 
                      React.createElement('div', { 
                        key: s.id, 
                        className: `p-2 rounded border-l-4 ${s.id === myPlayerId ? 'bg-yellow-900 bg-opacity-30 border-yellow-400' : 'bg-gray-600 bg-opacity-30 border-gray-400'}`,
                        style: { borderLeftColor: s.id === myPlayerId ? '#fbbf24' : teams.teamA.color }
                      }, 
                        React.createElement('div', { className: "flex justify-between items-center" },
                          React.createElement('span', { className: "font-medium" }, 
                            `Player ${s.id + 1}${s.id === myPlayerId ? ' (You)' : ''}`
                          ),
                          React.createElement('span', { className: "text-sm text-green-400" }, '✓ Ready')
                        )
                      )
                    )
                  )
              ),
              
              // Team A Join Button
              stickmen.filter(s => s.teamId === 'teamA').length < 4 && !hasJoined ?
              React.createElement('button', { 
                onClick: () => joinTeam('teamA'), 
                className: "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105" 
              }, `Join ${teams.teamA.name}`) :
              stickmen.filter(s => s.teamId === 'teamA').length >= 4 && !hasJoined ?
              React.createElement('div', { className: "w-full bg-gray-600 text-gray-400 font-bold py-3 px-6 rounded-lg text-lg text-center" }, 'Team Full (4/4)') :
              null
            ),
            
            // VS Divider
            React.createElement('div', { className: "self-center text-4xl font-bold text-gray-400 px-4" }, 'VS'),
            
            // Team B Section
            React.createElement('div', { className: "flex-1 p-6 bg-gray-700 bg-opacity-50 rounded-lg border-2", style: { borderColor: teams.teamB.color } },
              React.createElement('h2', { 
                className: "text-3xl mb-4 font-bold text-center", 
                style: { color: teams.teamB.color } 
              }, teams.teamB.name),
              
              // Team B Players List
              React.createElement('div', { className: "mb-4 min-h-[120px]" },
                React.createElement('h3', { className: "text-lg font-semibold text-gray-300 mb-2" }, 
                  `Players (${stickmen.filter(s => s.teamId === 'teamB').length}/4):`
                ),
                stickmen.filter(s => s.teamId === 'teamB').length === 0 ? 
                  React.createElement('p', { className: "text-gray-500 italic" }, 'No players yet...') :
                  React.createElement('div', { className: "space-y-2" },
                    ...stickmen.filter(s => s.teamId === 'teamB').map(s => 
                      React.createElement('div', { 
                        key: s.id, 
                        className: `p-2 rounded border-l-4 ${s.id === myPlayerId ? 'bg-yellow-900 bg-opacity-30 border-yellow-400' : 'bg-gray-600 bg-opacity-30 border-gray-400'}`,
                        style: { borderLeftColor: s.id === myPlayerId ? '#fbbf24' : teams.teamB.color }
                      }, 
                        React.createElement('div', { className: "flex justify-between items-center" },
                          React.createElement('span', { className: "font-medium" }, 
                            `Player ${s.id + 1}${s.id === myPlayerId ? ' (You)' : ''}`
                          ),
                          React.createElement('span', { className: "text-sm text-green-400" }, '✓ Ready')
                        )
                      )
                    )
                  )
              ),
              
              // Team B Join Button
              stickmen.filter(s => s.teamId === 'teamB').length < 4 && !hasJoined ?
              React.createElement('button', { 
                onClick: () => joinTeam('teamB'), 
                className: "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105" 
              }, `Join ${teams.teamB.name}`) :
              stickmen.filter(s => s.teamId === 'teamB').length >= 4 && !hasJoined ?
              React.createElement('div', { className: "w-full bg-gray-600 text-gray-400 font-bold py-3 px-6 rounded-lg text-lg text-center" }, 'Team Full (4/4)') :
              null
            )
          ),
          gameState === GameState.Countdown && React.createElement('div', { className: "mt-8" },
            React.createElement('p', { className: "text-2xl text-yellow-400" }, 'Game starting in...'),
            React.createElement('p', { className: "text-6xl font-bold" }, countdown)
          ),
          React.createElement('div', { className: "mt-8 text-gray-400 text-sm" },
            React.createElement('p', null, 
              React.createElement('span', { className: "font-bold text-white" }, 'Controls for All Players:'), 
              ' Arrow Keys (Move), Enter (Jump), Space (Attack)'
            )
          )
        );
      
      case GameState.GameOver:
        return React.createElement('div', { className: "text-center bg-gray-800 bg-opacity-80 p-10 rounded-lg shadow-xl backdrop-blur-sm" },
          winner ? 
            React.createElement('h1', { 
              className: "text-6xl font-bold mb-4", 
              style: { color: winner.color } 
            }, `${winner.name} Wins!`) :
            React.createElement('h1', { className: "text-6xl font-bold mb-4 text-white" }, "It's a Draw!"),
          React.createElement('p', { className: "text-2xl text-gray-300 mb-8" }, 
            `Final Kills - ${teams.teamA.name}: ${scores.teamA} | ${teams.teamB.name}: ${scores.teamB}`
          ),
          React.createElement('button', { 
            onClick: resetGame, 
            className: "bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-4 px-8 rounded-lg text-xl transition-transform transform hover:scale-105" 
          }, 'Play Again')
        );
      
      default:
        return null;
    }
  };

  return React.createElement('div', { className: "w-screen h-screen flex flex-col items-center justify-center text-white font-sans bg-gray-900", style: { padding: 0, margin: 0 } },
    React.createElement('div', { className: "relative flex items-center justify-center" },
      gameState !== GameState.Playing && React.createElement('div', { className: "absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20" },
        renderOverlayContent()
      ),
      gameState === GameState.Playing && React.createElement('div', { className: "z-10 absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-40 rounded-t-lg flex justify-between items-center" },
        React.createElement('div', { className: "text-3xl font-extrabold flex items-center gap-6" },
          React.createElement('span', { style: { color: teams.teamA.color } }, `${teams.teamA.name.toUpperCase()}: ${scores.teamA}`),
          React.createElement('span', { className: "text-gray-400" }, 'VS'),
          React.createElement('span', { style: { color: teams.teamB.color } }, `${teams.teamB.name.toUpperCase()}: ${scores.teamB}`)
        )
      ),
      React.createElement(GameCanvas, { stickmen, teams, obstacles, powerUp })
    )
  );
};

// Initialize the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));
