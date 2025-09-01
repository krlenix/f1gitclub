import React, { useRef, useEffect, useState } from 'react';
import { Stickman, Team, Obstacle, ObstacleType, PowerUp } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_WIDTH, GROUND_DEPTH, STICKMAN_HEIGHT, STICKMAN_HEALTH, STICKMAN_MAX_MANA } from '../constants';

interface GameCanvasProps {
  stickmen: Stickman[];
  teams: { teamA: Team, teamB: Team };
  obstacles: Obstacle[];
  powerUp: PowerUp | null;
}

// Function to project 3D world coordinates to 2D screen coordinates (isometric)
const worldToScreen = (x: number, y: number, z: number) => {
  // Proper isometric projection at 45 degrees
  const screenX = (x - y) * Math.cos(Math.PI / 6) + CANVAS_WIDTH / 2;
  const screenY = (x + y) * Math.sin(Math.PI / 6) - z + CANVAS_HEIGHT / 2.5;
  
  return { x: screenX, y: screenY };
};

const drawHammer = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    const { x: screenX, y: screenY } = worldToScreen(powerUp.x, powerUp.y, powerUp.z);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 10, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handle
    ctx.fillStyle = '#854d0e'; // brown
    ctx.fillRect(screenX - 2, screenY - 20, 4, 20);

    // Head
    ctx.fillStyle = '#a1a1aa'; // stone
    ctx.fillRect(screenX - 10, screenY - 30, 20, 10);
}

const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    const { type, x, y, width, depth, height } = obstacle;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    const { x: shadowX, y: shadowY } = worldToScreen(x, y, 0);
    const shadowWidth = (width + depth) / 2.5;
    const shadowHeight = shadowWidth / 2;
    ctx.ellipse(shadowX, shadowY + STICKMAN_HEIGHT / 2.2, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    switch(type) {
        case ObstacleType.Box:
        case ObstacleType.Wall:
            const topColor = '#a16207'; // yellow-700
            const sideColor1 = '#854d0e'; // yellow-800
            const sideColor2 = '#713f12'; // yellow-900

            const w_half = width / 2;
            const d_half = depth / 2;

            const p = [
                worldToScreen(x - w_half, y - d_half, 0),
                worldToScreen(x + w_half, y - d_half, 0),
                worldToScreen(x + w_half, y + d_half, 0),
                worldToScreen(x - w_half, y + d_half, 0),
                worldToScreen(x - w_half, y - d_half, height),
                worldToScreen(x + w_half, y - d_half, height),
                worldToScreen(x + w_half, y + d_half, height),
                worldToScreen(x - w_half, y + d_half, height),
            ];

            // Side 1
            ctx.fillStyle = sideColor1;
            ctx.beginPath();
            ctx.moveTo(p[1].x, p[1].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[2].x, p[2].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[6].x, p[6].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[5].x, p[5].y + STICKMAN_HEIGHT / 2.2);
            ctx.closePath();
            ctx.fill();
            
            // Side 2
            ctx.fillStyle = sideColor2;
            ctx.beginPath();
            ctx.moveTo(p[2].x, p[2].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[3].x, p[3].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[7].x, p[7].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[6].x, p[6].y + STICKMAN_HEIGHT / 2.2);
            ctx.closePath();
            ctx.fill();
            
            // Top
            ctx.fillStyle = topColor;
            ctx.beginPath();
            ctx.moveTo(p[4].x, p[4].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[5].x, p[5].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[6].x, p[6].y + STICKMAN_HEIGHT / 2.2);
            ctx.lineTo(p[7].x, p[7].y + STICKMAN_HEIGHT / 2.2);
            ctx.closePath();
            ctx.fill();
            break;
        
        case ObstacleType.Rock:
            const { x: rockX, y: rockY } = worldToScreen(x, y, 0);
            ctx.fillStyle = '#78716c'; // stone-500
            ctx.strokeStyle = '#57534e'; // stone-600
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(rockX, rockY + STICKMAN_HEIGHT/2.2 - height/3, width * 0.7, depth * 0.7, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;

        case ObstacleType.Tire:
             const { x: tireX, y: tireY } = worldToScreen(x, y, 0);
             ctx.fillStyle = '#262626'; // neutral-800
             ctx.beginPath();
             ctx.ellipse(tireX, tireY + STICKMAN_HEIGHT/2.2, width/2, depth/2, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.fillStyle = '#111827'; // background color
             ctx.beginPath();
             ctx.ellipse(tireX, tireY + STICKMAN_HEIGHT/2.2, width/4, depth/4, 0, 0, Math.PI * 2);
             ctx.fill();
             break;
    }
}


const drawStickman = (ctx: CanvasRenderingContext2D, stickman: Stickman, teams: { teamA: Team, teamB: Team }, teamImages: { teamA: HTMLImageElement | null, teamB: HTMLImageElement | null }) => {
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
  const { x: shadowX, y: shadowY } = worldToScreen(x, y, 0); // Shadow is on the ground (z=0)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(shadowX, shadowY + 35, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (custom image or circle)
  if (teamImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(screenX, screenY, headRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(teamImage, screenX - headRadius, screenY - headRadius, headRadius * 2, headRadius * 2);
      ctx.restore();
       ctx.beginPath();
      ctx.arc(screenX, screenY, headRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(screenX, screenY, headRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Body
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + headRadius);
  ctx.lineTo(screenX, screenY + headRadius + bodyLength);
  ctx.stroke();

  // Arms
  if (state === 'attacking') {
    if (hasHammer) {
        ctx.strokeStyle = '#854d0e'; // brown handle
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY + headRadius + 10, limbLength * 1.2, -Math.PI / 2.5, 0.2);
        ctx.stroke();

        const hammerX = screenX + limbLength * 1.2 * Math.cos(0.2);
        const hammerY = screenY + headRadius + 10 + limbLength * 1.2 * Math.sin(0.2);
        ctx.fillStyle = '#a1a1aa'; // stone head
        ctx.fillRect(hammerX - 8, hammerY - 12, 16, 24);

        // Other arm for balance
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + headRadius + 10);
        ctx.lineTo(screenX - limbLength, screenY + headRadius + 10);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + headRadius + 10);
        ctx.lineTo(screenX + limbLength, screenY + headRadius);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + headRadius + 10);
        ctx.lineTo(screenX - limbLength, screenY + headRadius + 10);
        ctx.stroke();
    }
  } else {
    if (hasHammer) {
        // Left arm
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + headRadius + 10);
        ctx.lineTo(screenX - limbLength, screenY + headRadius + 20);
        ctx.stroke();
        
        // Right arm with hammer
        const hammerHandX = screenX + 5;
        const hammerHandY = screenY + headRadius + 15;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + headRadius + 10);
        ctx.lineTo(hammerHandX, hammerHandY);
        ctx.stroke();
        
        ctx.strokeStyle = '#854d0e'; // Handle
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hammerHandX, hammerHandY);
        ctx.lineTo(hammerHandX + 5, hammerHandY - 20);
        ctx.stroke();
        ctx.fillStyle = '#a1a1aa'; // Head
        ctx.fillRect(hammerHandX, hammerHandY - 30, 10, 10);

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
  ctx.fillStyle = '#4b5563'; // gray-600 for background
  ctx.fillRect(screenX - barWidth / 2, healthBarY, barWidth, barHeight);
  ctx.fillStyle = '#22c55e'; // green-500 for health
  ctx.fillRect(screenX - barWidth / 2, healthBarY, barWidth * healthPercentage, barHeight);

  // Mana bar
  const manaPercentage = mana / STICKMAN_MAX_MANA;
  ctx.fillStyle = '#4b5563'; // gray-600 for background
  ctx.fillRect(screenX - barWidth / 2, manaBarY, barWidth, barHeight);
  ctx.fillStyle = '#3b82f6'; // blue-500 for mana
  ctx.fillRect(screenX - barWidth / 2, manaBarY, barWidth * manaPercentage, barHeight);
};

const GameCanvas: React.FC<GameCanvasProps> = ({ stickmen, teams, obstacles, powerUp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [teamImages, setTeamImages] = useState<{teamA: HTMLImageElement | null, teamB: HTMLImageElement | null}>({ teamA: null, teamB: null });

  useEffect(() => {
    const loadImage = (src: string | null, teamKey: 'teamA' | 'teamB') => {
      if (!src) {
        setTeamImages(prev => ({...prev, [teamKey]: null}));
        return;
      };
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
    
    context.moveTo(topCorner.x, topCorner.y+30);
    context.lineTo(rightCorner.x, rightCorner.y+30);
    context.lineTo(bottomCorner.x, bottomCorner.y+30);
    context.lineTo(leftCorner.x, leftCorner.y+30);
    context.closePath();
    
    context.fillStyle = '#374151';
    context.fill();
    context.strokeStyle = '#4b5563';
    context.lineWidth = 5;
    context.stroke();
    context.restore();

    const drawableItems: ((Stickman & { drawableType: 'stickman' }) | (Obstacle & { drawableType: 'obstacle' }) | (PowerUp & { drawableType: 'powerup' }))[] = [
        ...stickmen.map(s => ({ ...s, drawableType: 'stickman' as const })),
        ...obstacles.map(o => ({ ...o, drawableType: 'obstacle' as const }))
    ];
    if (powerUp?.isVisible) {
        drawableItems.push({ ...powerUp, drawableType: 'powerup' as const });
    }


    // Depth sort items so those "behind" are drawn first
    drawableItems.sort((a, b) => (a.y + a.x) - (b.y + b.x));

    // Draw all items
    drawableItems.forEach(item => {
        if (item.drawableType === 'stickman') {
            drawStickman(context, item, teams, teamImages);
        } else if (item.drawableType === 'obstacle') {
            drawObstacle(context, item);
        } else if (item.drawableType === 'powerup') {
            drawHammer(context, item);
        }
    });

  }, [stickmen, teams, teamImages, obstacles, powerUp]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-lg shadow-2xl" />;
};

export default GameCanvas;
