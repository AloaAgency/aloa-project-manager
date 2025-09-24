import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import formRoutes from './routes/forms.js';
import responseRoutes from './routes/responses.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/custom-forms')
  .then(() => {

    app.listen(PORT, () => {

    });
  })
  .catch((error) => {

    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {

  res.status(500).json({ error: 'Something went wrong!' });
});