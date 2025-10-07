# Deployment Guide for Custom Forms

This application consists of a React frontend and Node.js/Express backend with MongoDB. Here's how to deploy it to production.

## Architecture Overview

- **Frontend**: React + Vite (can be deployed to Vercel, Netlify, or any static hosting)
- **Backend**: Node.js + Express + MongoDB (requires a server environment)
- **Database**: MongoDB (MongoDB Atlas recommended for production)

## Option 1: Deploy Frontend to Vercel + Backend to Render/Railway

### Frontend Deployment (Vercel)

1. **Connect GitHub Repository to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect the configuration from `vercel.json`

2. **Configure Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.com/api`

3. **Deploy**
   - Vercel will automatically deploy on push to main branch

### Backend Deployment (Render.com)

1. **Create a MongoDB Atlas Database**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string

2. **Deploy Backend to Render**
   - Sign up at [Render](https://render.com)
   - Create a new Web Service
   - Connect your GitHub repository
   - Configure:
     ```
     Build Command: cd backend && npm install
     Start Command: cd backend && npm start
     ```
   - Add Environment Variables:
     - `MONGODB_URI` = Your MongoDB Atlas connection string
     - `CLIENT_URL` = Your Vercel frontend URL
     - `PORT` = 5000 (or leave for Render to assign)

3. **Update Frontend Environment Variable**
   - In Vercel, update `VITE_API_URL` to your Render backend URL

## Option 2: Deploy to Railway (Full Stack)

Railway can host both frontend and backend together:

1. **Sign up at [Railway](https://railway.app)**

2. **Create New Project from GitHub**
   - Connect your repository
   - Railway will detect the monorepo structure

3. **Configure Services**
   - Create two services: frontend and backend
   - For Backend service:
     ```
     Root Directory: /backend
     Start Command: npm start
     ```
   - For Frontend service:
     ```
     Root Directory: /frontend
     Build Command: npm run build
     Start Command: npm run preview
     ```

4. **Add MongoDB**
   - Add MongoDB plugin or use MongoDB Atlas
   - Set environment variables

## Option 3: Deploy to Heroku

1. **Create `Procfile` in root directory:**
   ```
   web: cd backend && npm start
   ```

2. **Update `package.json` in root:**
   ```json
   {
     "scripts": {
       "heroku-postbuild": "cd frontend && npm install && npm run build"
     }
   }
   ```

3. **Configure Heroku:**
   ```bash
   heroku create your-app-name
   heroku config:set MONGODB_URI="your-mongodb-uri"
   heroku config:set CLIENT_URL="https://your-app-name.herokuapp.com"
   git push heroku main
   ```

## Environment Variables Required

### Backend (.env)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/custom-forms
CLIENT_URL=https://your-frontend-url.com
PORT=5000
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.com/api
```

## CORS Configuration

Make sure your backend CORS configuration in `backend/src/server.js` includes your frontend URL:

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```

## Post-Deployment Checklist

- [ ] Test form creation
- [ ] Test form submission
- [ ] Test response viewing
- [ ] Test CSV export
- [ ] Check CORS is working
- [ ] Verify MongoDB connection
- [ ] Test file upload size limits
- [ ] Check responsive design on mobile

## Troubleshooting

### 404 Error on Vercel
- Make sure `vercel.json` is present and properly configured
- Check that the build output directory is correct
- Verify rewrites are set up for client-side routing

### CORS Errors
- Ensure `CLIENT_URL` environment variable matches your frontend URL
- Check that backend is running and accessible
- Verify API endpoints are using the correct URL

### MongoDB Connection Issues
- Whitelist your backend server IP in MongoDB Atlas
- Check connection string format
- Ensure database user has correct permissions

### Build Failures
- Check Node.js version compatibility (16.x or higher recommended)
- Verify all dependencies are listed in package.json
- Check for case-sensitive file imports (important for Linux deployments)

## Recommended Production Setup

For best performance and reliability:

1. **Frontend**: Vercel (free tier available)
2. **Backend**: Render.com or Railway (free tier available)
3. **Database**: MongoDB Atlas (free tier with 512MB storage)
4. **File Storage**: Consider adding AWS S3 for markdown file storage if needed

## Security Considerations

1. Use environment variables for all sensitive data
2. Enable rate limiting on API endpoints
3. Implement user authentication if needed
4. Use HTTPS for all production URLs
5. Regularly update dependencies
6. Consider adding input validation and sanitization
7. Implement proper error logging (consider Sentry or LogRocket)