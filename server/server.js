require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const publicRoutes = require('./routes/public');
const hospitalRoutes = require('./routes/hospitals');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');

// Initialize express app
const app = express();

// Connect to MongoDB and create default SUPER_ADMIN
const initializeApp = async () => {
    await connectDB();

    // Create default SUPER_ADMIN if not exists
    try {
        const superAdminEmail = 'owner@smartqr.com';
        const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

        if (!existingSuperAdmin) {
            const superAdmin = new User({
                name: 'System Owner',
                email: superAdminEmail,
                password: 'owner123',
                role: 'SUPER_ADMIN',
                hospital: null,
                isActive: true
            });
            await superAdmin.save();
            console.log('✅ SUPER_ADMIN ready: owner@smartqr.com / owner123');
        } else {
            console.log('ℹ️  SUPER_ADMIN already exists');
        }
    } catch (error) {
        console.error('⚠️  Error creating SUPER_ADMIN:', error.message);
    }
};

initializeApp();

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // Restrict to frontend URL in production
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (QR codes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', require('./routes/patientAuthRoutes')); // Mount patient auth routes
app.use('/api/patients', patientRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health-buddy', require('./routes/healthBuddy'));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Emergency QR Health API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
// Create HTTP server and integrate Socket.io
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*", // Allow connections from any origin (configure for prod)
        methods: ["GET", "POST"]
    }
});

// Initialize AI Avatar Service
try {
    require('./services/aiAvatarService')(io);
    console.log('✅ AI Avatar Service initialized');
} catch (error) {
    console.error('⚠️ Failed to initialize AI Avatar Service:', error.message);
}

// Start server with port conflict handling
const PORT = process.env.PORT || 5000;
let currentPort = PORT;

// Function to start server with error handling
const startServer = (port) => {
    server.listen(port)
        .on('listening', () => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`🚀 Server running on port ${port}`);
            console.log(`📡 API: http://localhost:${port}/api`);
            console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔌 Socket.io ready`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
        })
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log('');
                console.log('⚠️  Port Conflict Detected');
                console.log(`❌ Port ${port} is already in use`);

                // Try next port
                const nextPort = port + 1;
                if (nextPort - PORT < 10) { // Try up to 10 ports
                    console.log(`🔄 Attempting to use port ${nextPort}...`);
                    console.log('');
                    currentPort = nextPort;
                    startServer(nextPort);
                } else {
                    console.error('');
                    console.error('═══════════════════════════════════════════════════════');
                    console.error('❌ CRITICAL ERROR: Could not find an available port');
                    console.error(`   Tried ports ${PORT} to ${port}`);
                    console.error('   Please free up a port or change PORT in .env');
                    console.error('═══════════════════════════════════════════════════════');
                    console.error('');
                    process.exit(1);
                }
            } else {
                console.error('');
                console.error('═══════════════════════════════════════════════════════');
                console.error('❌ Server Error:', err.message);
                console.error('═══════════════════════════════════════════════════════');
                console.error('');
                process.exit(1);
            }
        });
};

// Start the server
startServer(currentPort);
