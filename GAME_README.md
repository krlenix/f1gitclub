# 🥊 Stickman Battle Online

A real-time multiplayer stickman fighting game where players battle in teams with shareable room links!

## 🎮 Features

- **Real-time multiplayer** - Battle against friends online
- **Shareable room links** - Create a room and share the link with anyone
- **Team customization** - Upload team logos and customize team names
- **Power-ups** - Collect hammers for extra damage
- **Isometric 3D graphics** - Beautiful pseudo-3D battlefield
- **Responsive controls** - Smooth movement and combat system

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   - Go to `http://localhost:3001`
   - Create a room
   - Share the room link with a friend
   - Battle it out!

### Controls

**Player 1:**
- Movement: W/A/S/D
- Jump: Spacebar
- Attack: F

**Player 2:**
- Movement: Arrow Keys
- Jump: Enter
- Attack: Shift

## 🌐 Deploy Online

Your game is ready to deploy! Check out `deploy.md` for detailed deployment instructions for various platforms including:

- Railway (Free tier available)
- Render (Free tier available)
- Heroku
- DigitalOcean

## 🎯 How to Play

1. **Create a Room**: Customize your teams and click "Create Room"
2. **Share the Link**: Copy the room URL and send it to your friend
3. **Join Teams**: Each player joins a different team
4. **Battle**: Fight until one team is eliminated!

## 🛠️ Technical Details

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.IO
- **Real-time Communication**: WebSocket connections
- **Graphics**: HTML5 Canvas with custom isometric rendering

## 📁 Project Structure

```
stickman/
├── App.tsx              # Main React component
├── components/
│   └── GameCanvas.tsx   # Game rendering component
├── server.js            # WebSocket server
├── types.ts             # TypeScript definitions
├── constants.ts         # Game constants
└── deploy.md           # Deployment guide
```

## 🔧 Configuration

Environment variables (optional):
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode
- `CORS_ORIGIN`: CORS origin setting

## 🤝 Contributing

Feel free to fork this project and add your own features:
- New power-ups
- Different game modes
- Enhanced graphics
- Mobile support

## 📜 License

MIT License - Feel free to use this code for your own projects!
