# Deployment Guide for Stickman Battle Online

## Quick Start for Local Testing

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   - Go to `http://localhost:3001`
   - Create a room and share the link with friends

## Production Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

1. **Prepare your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway will automatically detect and deploy your Node.js app
   - Your game will be available at `https://your-app-name.railway.app`

### Option 2: Render (Free Tier Available)

1. **Create account at [render.com](https://render.com)**

2. **Create a new Web Service:**
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `NODE_ENV=production`

### Option 3: Heroku

1. **Install Heroku CLI and login:**
   ```bash
   heroku login
   ```

2. **Create and deploy:**
   ```bash
   heroku create your-stickman-game
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

1. **Create account at [digitalocean.com](https://digitalocean.com)**
2. **Use App Platform to deploy directly from GitHub**

## Environment Variables

Set these environment variables in your hosting platform:

- `PORT`: The port your app runs on (usually set automatically)
- `NODE_ENV`: Set to `production`
- `CORS_ORIGIN`: Set to your domain or `*` for development

## Testing Your Deployment

1. **Open your deployed URL**
2. **Create a room**
3. **Copy the shareable link**
4. **Open the link in a new incognito window or different device**
5. **Join the opposite team and start playing!**

## Troubleshooting

- **Connection issues**: Check that WebSocket connections are allowed by your hosting provider
- **CORS errors**: Make sure CORS_ORIGIN is set correctly
- **Game not loading**: Check browser console for errors

## Custom Domain (Optional)

Most hosting providers allow you to add a custom domain:
1. Purchase a domain from any registrar
2. Add it to your hosting platform
3. Update DNS settings as instructed by your provider
