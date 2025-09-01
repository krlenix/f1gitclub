export interface Team {
  name: string;
  image: string | null; // base64 encoded image
  color: string;
}

export enum GameState {
  Home,
  Lobby,
  Countdown,
  Playing,
  GameOver,
}

export interface PlayerControls {
  up: string;
  down: string;
  left: string;
  right: string;
  jump: string;
  attack: string;
}

export interface Stickman {
  id: number;
  x: number; // Ground-plane position
  y: number; // Ground-plane position (depth)
  z: number; // Height off the ground
  vx: number; // Velocity x
  vy: number; // velocity y
  vz: number; // velocity z (for jumping)
  health: number;
  mana: number;
  teamId: 'teamA' | 'teamB';
  controls: PlayerControls;
  isJumping: boolean;
  attackTimer: number;
  hitTimer: number; // for hit animation
  kills: number;
  facingDirection: 'up-left' | 'up-right' | 'down-left' | 'down-right';
  state: 'idle' | 'moving' | 'attacking' | 'jumping' | 'hit' | 'dead';
  powerUp: 'hammer' | null;
  powerUpTimer: number;
}

export enum ObstacleType {
  Box = 'box',
  Rock = 'rock',
  Tire = 'tire',
  Wall = 'wall',
}

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number; // center x
  y: number; // center y
  width: number; // along x-axis
  depth: number; // along y-axis
  height: number;
}

export interface PowerUp {
    id: string;
    type: 'hammer';
    x: number;
    y: number;
    z: number;
    isVisible: boolean;
}

// --- Multiplayer Types ---

export interface GameSyncPayload {
  stickmen: Stickman[];
  obstacles: Obstacle[];
  powerUp: PowerUp | null;
  gameState: GameState;
  countdown: number;
  winner: Team | null;
  teams: { teamA: Team, teamB: Team };
  roundScores?: { teamA: number, teamB: number };
  roundWinner?: Team | null;
}

export interface JoinRequestPayload {
  roomId: string;
  sessionId: string;
  teamId: 'teamA' | 'teamB';
  teamDetails: Team;
}

export interface PlayerInputPayload {
  roomId: string;
  playerId: number;
  keys: { [key: string]: boolean };
  attackKeys: string[];
}

export interface PlayerAssignedPayload {
    sessionId: string;
    player: Stickman;
    teams: { teamA: Team, teamB: Team };
}
