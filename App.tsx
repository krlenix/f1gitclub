import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stickman, Team, GameState, PlayerControls, Obstacle, ObstacleType, PowerUp, GameSyncPayload, JoinRequestPayload, PlayerAssignedPayload } from './types';
import {
  PLAYER_CONTROLS,
} from './constants';
import GameCanvas from './components/GameCanvas';

// FIX: Make io available in the component from the global scope.
declare const io: any;



// --- Helper Components ---
const TeamCustomizer: React.FC<{ team: Team, setTeam: (team: Team) => void, defaultColor: string }> = ({ team, setTeam, defaultColor }) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTeam({ ...team, image: event.target?.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="w-full p-4 bg-gray-700 rounded-lg">
      <h3 className={`text-2xl font-bold mb-3`} style={{ color: team.color }}>{team.name || 'Team Name'}</h3>
      <input
        type="text"
        placeholder="Enter Team Name"
        value={team.name}
        onChange={(e) => setTeam({ ...team, name: e.target.value })}
        className="w-full bg-gray-800 text-white p-2 rounded mb-3"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500"
      />
      {team.image && <img src={team.image} alt="team logo" className="w-20 h-20 rounded-full mx-auto mt-3 object-cover" />}
    </div>
  );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Home);
  const [stickmen, setStickmen] = useState<Stickman[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [teams, setTeams] = useState<{ teamA: Team, teamB: Team }>({
    teamA: { name: 'Team A', image: null, color: '#3b82f6' },
    teamB: { name: 'Team B', image: null, color: '#ef4444' }
  });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [winner, setWinner] = useState<Team | null>(null);
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [socket, setSocket] = useState<any | null>(null); // Using 'any' for socket.io client
  const [roundScores, setRoundScores] = useState<{ teamA: number, teamB: number }>({ teamA: 0, teamB: 0 });
  const [roundWinner, setRoundWinner] = useState<Team | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const attackKeysToProcess = useRef<Set<string>>(new Set());
  const sessionId = useRef(Math.random().toString(36).substring(2, 9));

  // --- Game Setup & Room Logic (Multiplayer) ---
  useEffect(() => {
    // Connect to the WebSocket server.
    // Use environment-based URL for development vs production
    const SERVER_URL = process.env.NODE_ENV === 'production' 
      ? window.location.origin // Railway serves both frontend and backend from same URL
      : "http://localhost:3004";
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('roomId');
    if (roomIdFromUrl) {
      setRoomId(roomIdFromUrl);
      newSocket.emit('joinRoom', roomIdFromUrl); // Auto-join room if ID is in URL
      setGameState(GameState.Lobby);
    }
    
    return () => {
        newSocket.disconnect();
    };
  }, []);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (!socket) return;
    
    socket.on('gameStateSync', (payload: GameSyncPayload) => {
        setStickmen(payload.stickmen);
        setObstacles(payload.obstacles);
        setPowerUp(payload.powerUp);
        setGameState(payload.gameState);
        setCountdown(payload.countdown);
        setWinner(payload.winner);
        setTeams(payload.teams);
        if (payload.roundScores) {
            setRoundScores(payload.roundScores);
        }
        if (payload.roundWinner !== undefined) {
            setRoundWinner(payload.roundWinner);
        }
    });

    socket.on('playerAssigned', (payload: PlayerAssignedPayload) => {
        if (payload.sessionId === sessionId.current) {
            setMyPlayerId(payload.player.id);
            setTeams(payload.teams);
        }
    });

    socket.on('roomCreated', (newRoomId: string) => {
        setRoomId(newRoomId);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('roomId', newRoomId);
            window.history.pushState({}, '', url);
        } catch (e) {
            console.warn("Could not update URL with pushState. This is expected in sandboxed environments.");
        }
        setGameState(GameState.Lobby);
    });

    // Handle connection errors
    socket.on('connect_error', (error: any) => {
        console.error('Connection failed:', error);
    });

    socket.on('disconnect', (reason: string) => {
        console.log('Disconnected:', reason);
        if (reason === 'io server disconnect') {
            // The disconnection was initiated by the server, reconnect manually
            socket.connect();
        }
    });

    socket.on('roomError', (error: string) => {
        console.error('Room error:', error);
        alert(`Room error: ${error}`);
    });

    return () => {
        socket.off('gameStateSync');
        socket.off('playerAssigned');
        socket.off('roomCreated');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('roomError');
    }
  }, [socket]);


  const createRoom = () => {
    const updatedTeamA = { ...teams.teamA, name: teams.teamA.name.trim() || 'Team A' };
    const updatedTeamB = { ...teams.teamB, name: teams.teamB.name.trim() || 'Team B' };
    setTeams({ teamA: updatedTeamA, teamB: updatedTeamB });
    const newRoomId = Math.random().toString(36).substring(2, 9);
    
    // Tell the server to create a new room
    socket?.emit('createRoom', { roomId: newRoomId, teams: { teamA: updatedTeamA, teamB: updatedTeamB } });
  };

  const joinTeam = (teamId: 'teamA' | 'teamB') => {
      if (myPlayerId !== null || !roomId) return; // Already joined or no room to join
      const myTeamDetails = teamId === 'teamA' ? teams.teamA : teams.teamB;
      const payload: Omit<JoinRequestPayload, 'roomId'> = { sessionId: sessionId.current, teamId, teamDetails: myTeamDetails };
      
      // Send join request to the server
      socket?.emit('joinRequest', { roomId, ...payload });
  }

  const resetGame = () => {
    window.location.href = window.location.pathname;
  }
  
  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!myPlayerId === null || !roomId || !socket) return;
      const key = e.key.toLowerCase();
      if(keysPressed.current[key]) return; // prevent repeats
      keysPressed.current[key] = true;
      
      const isAttackKey = Object.values(PLAYER_CONTROLS).some(c => c.attack.toLowerCase() === key);
      if (isAttackKey && !e.repeat) {
          attackKeysToProcess.current.add(key);
      }
      
      const attacks = Array.from(attackKeysToProcess.current);
      socket.emit('playerInput', { roomId, playerId: myPlayerId, keys: { ...keysPressed.current }, attackKeys: attacks });

      if(attacks.length > 0){
        attackKeysToProcess.current.clear();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (myPlayerId === null || !roomId || !socket) return;
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      socket.emit('playerInput', { roomId, playerId: myPlayerId, keys: { ...keysPressed.current }, attackKeys: [] });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, myPlayerId, roomId]);

  const scores = stickmen.reduce((acc, s) => {
      if (s.teamId === 'teamA') acc.teamA += s.kills;
      else acc.teamB += s.kills;
      return acc;
  }, { teamA: 0, teamB: 0 });

  // --- Render Logic ---
  const renderOverlayContent = () => {
    switch (gameState) {
      case GameState.Home:
        return (
          <div className="text-center bg-gray-800 bg-opacity-90 p-10 rounded-lg shadow-xl backdrop-blur-sm w-full max-w-4xl">
            <h1 className="text-6xl font-bold text-white mb-6 tracking-wider">Stickman Battle</h1>
            <p className="text-xl text-gray-300 mb-8">Create your own teams and fight for glory!</p>
            <div className="flex gap-8 justify-center items-start">
              <TeamCustomizer team={teams.teamA} setTeam={(t) => setTeams(p => ({ ...p, teamA: t }))} defaultColor="#3b82f6" />
              <div className="self-center text-4xl font-bold text-gray-400">VS</div>
              <TeamCustomizer team={teams.teamB} setTeam={(t) => setTeams(p => ({ ...p, teamB: t }))} defaultColor="#ef4444" />
            </div>
            <button onClick={createRoom} className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg text-2xl transition-transform transform hover:scale-105">
              Create Room
            </button>
          </div>
        );
      case GameState.Lobby:
      case GameState.Countdown:
        const lobbyUrl = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;
        const hasJoined = myPlayerId !== null;
        
        // Check if this is between rounds (has round scores)
        const isBetweenRounds = roundScores.teamA > 0 || roundScores.teamB > 0;
        
        return (
          <div className="text-center bg-gray-800 bg-opacity-90 p-10 rounded-lg shadow-xl backdrop-blur-sm w-full max-w-4xl">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-wider">
              {isBetweenRounds ? 'NEXT ROUND' : 'BATTLE LOBBY'}
            </h1>
            
            {/* Show round scores if between rounds */}
            {isBetweenRounds && (
              <div className="mb-6">
                <div className="text-3xl font-bold mb-2">
                  <span style={{color: teams.teamA.color}}>{teams.teamA.name}: {roundScores.teamA}</span>
                  <span className="text-gray-400 mx-4">-</span>
                  <span style={{color: teams.teamB.color}}>{teams.teamB.name}: {roundScores.teamB}</span>
                </div>
                {roundWinner && (
                  <p className="text-2xl mb-4" style={{color: roundWinner.color}}>
                    🏆 {roundWinner.name} won the round!
                  </p>
                )}
                <p className="text-gray-300">First to 3 rounds wins the match!</p>
              </div>
            )}
            {roomId && (
                <div className="mb-4">
                    <p className="text-gray-300">Share this link with a friend:</p>
                    <input type="text" readOnly value={lobbyUrl} className="w-full max-w-md bg-gray-900 text-yellow-300 p-2 rounded mt-1 text-center" onClick={(e) => (e.target as HTMLInputElement).select()} />
                </div>
            )}
            <div className="flex justify-around items-start mt-6">
                <div className="w-1/2 p-4 text-center">
                    <h2 className="text-3xl mb-4 font-bold" style={{color: teams.teamA.color}}>{teams.teamA.name}</h2>
                    {stickmen.filter(s => s.teamId === 'teamA').map(s => <p key={s.id} className="text-lg">Player {s.id + 1} {s.id === myPlayerId ? '(You)' : ''} (Ready)</p>)}
                    {stickmen.filter(s => s.teamId === 'teamA').length < 1 && !hasJoined &&
                     <button onClick={() => joinTeam('teamA')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105">Join</button>
                    }
                </div>
                <div className="w-1/2 p-4 border-l-2 border-gray-600 text-center">
                     <h2 className="text-3xl mb-4 font-bold" style={{color: teams.teamB.color}}>{teams.teamB.name}</h2>
                     {stickmen.filter(s => s.teamId === 'teamB').map(s => <p key={s.id} className="text-lg">Player {s.id + 1} {s.id === myPlayerId ? '(You)' : ''} (Ready)</p>)}
                     {stickmen.filter(s => s.teamId === 'teamB').length < 1 && !hasJoined &&
                        <button onClick={() => joinTeam('teamB')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105">Join</button>
                    }
                </div>
            </div>
            {gameState === GameState.Countdown && (
                 <div className="mt-8">
                    <p className="text-2xl text-yellow-400">Game starting in...</p>
                    <p className="text-6xl font-bold">{countdown}</p>
                </div>
            )}
             <div className="mt-8 text-gray-400 text-sm">
                <p><span className="font-bold text-white">Controls for All Players:</span> W/A/S/D or Arrow Keys (Move), Enter (Jump), Space (Attack)</p>
            </div>
          </div>
        );
      case GameState.GameOver:
        return (
          <div className="text-center bg-gray-800 bg-opacity-80 p-10 rounded-lg shadow-xl backdrop-blur-sm">
            {winner ? (
              <h1 className={`text-6xl font-bold mb-4`} style={{ color: winner.color }}>🏆 {winner.name} Wins the Match!</h1>
            ) : (
              <h1 className="text-6xl font-bold mb-4 text-white">Match Draw!</h1>
            )}
            
            {/* Show final match scores */}
            <div className="mb-6">
              <p className="text-3xl font-bold mb-2">Final Score</p>
              <div className="text-4xl font-bold">
                <span style={{color: teams.teamA.color}}>{teams.teamA.name}: {roundScores.teamA}</span>
                <span className="text-gray-400 mx-4">-</span>
                <span style={{color: teams.teamB.color}}>{teams.teamB.name}: {roundScores.teamB}</span>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 mb-8">Total Kills This Match - {teams.teamA.name}: {scores.teamA} | {teams.teamB.name}: {scores.teamB}</p>
            <button onClick={resetGame} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-4 px-8 rounded-lg text-xl transition-transform transform hover:scale-105">
              New Match
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-white font-sans bg-gray-900">
      <div className="relative flex items-center justify-center">
        {gameState !== GameState.Playing && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20">
            {renderOverlayContent()}
          </div>
        )}
        {gameState === GameState.Playing && (
          <div className="z-10 absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-40 rounded-t-lg">
            {/* Round Scores */}
            <div className="text-center mb-2">
              <div className="text-2xl font-bold">
                <span style={{color: teams.teamA.color}}>{teams.teamA.name}: {roundScores.teamA}</span>
                <span className="text-gray-400 mx-3">-</span>
                <span style={{color: teams.teamB.color}}>{teams.teamB.name}: {roundScores.teamB}</span>
              </div>
              <p className="text-sm text-gray-300">Rounds (First to 3 wins)</p>
            </div>
            
            {/* Kill Scores */}
            <div className="text-xl font-bold flex items-center justify-center gap-6">
               <span style={{color: teams.teamA.color}}>Kills: {scores.teamA}</span>
               <span className="text-gray-400">VS</span>
               <span style={{color: teams.teamB.color}}>Kills: {scores.teamB}</span>
            </div>
          </div>
        )}
        <GameCanvas stickmen={stickmen} teams={teams} obstacles={obstacles} powerUp={powerUp} />
      </div>
    </div>
  );
};
export default App;
