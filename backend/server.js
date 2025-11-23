import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (Docker) or .env.local (development)
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../.env')
  : path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });
import { initializeSupabase } from './config/supabase.js';
import { initializeRedis } from './config/redis.js';
import { initializeAzure } from './config/azure.js';
// Import routes
import authRoutes from './routes/auth.js';
import adminApiRoutes from './routes/adminApi.js';
import vendorApiRoutes from './routes/vendorApi.js';
import customerApiRoutes from './routes/customerApi.js';
import brandRoutes from './routes/brands.js';
import phoneModelRoutes from './routes/phoneModels.js';
import componentRoutes from './routes/components.js';
import vendorInventoryRoutes from './routes/vendorInventory.js';
import vendorRequestRoutes from './routes/vendorRequests.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
const app = express();
// Initialize services
console.log('🚀 Starting Partify Backend...\n');
try {
  console.log('📡 Initializing Supabase...');
  await initializeSupabase();
  console.log('✅ Supabase connected\n');
} catch (error) {
  console.error('❌ Supabase failed:', error.message);
  process.exit(1);
}
try {
  console.log('🔴 Initializing Redis...');
  await initializeRedis();
  console.log('✅ Redis ready\n');
} catch (error) {
  console.warn('⚠️  Redis not available\n');
}
try {
  console.log('☁️  Initializing Azure...');
  await initializeAzure();
  console.log('✅ Azure ready\n');
} catch (error) {
  console.warn('⚠️  Azure not configured\n');
}
// Middleware
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes);

// Comprehensive Admin API
app.use('/api/admin', adminApiRoutes);

// Comprehensive Vendor API
app.use('/api/vendor', vendorApiRoutes);

// Comprehensive Customer API
app.use('/api/customer', customerApiRoutes);

// Legacy routes (kept for backwards compatibility)
app.use('/api/brands', brandRoutes);
app.use('/api/phone-models', phoneModelRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/vendor-inventory', vendorInventoryRoutes);
app.use('/api/vendor-requests', vendorRequestRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin-legacy', adminRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Partify Backend running on http://localhost:${PORT}`);
  console.log(`📚 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
