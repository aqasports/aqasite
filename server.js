// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*', // Allow all origins for local testing
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'multipart/form-data']
}));

// Parse JSON bodies
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname) || '.webm';
        cb(null, `voice_message_${timestamp}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/') || 
            file.mimetype === 'video/webm' || 
            file.originalname.endsWith('.webm')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// Handle voice message uploads
app.post('/upload', upload.single('audioFile'), (req, res) => {
    try {
        console.log('Received message:', {
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
            audioFile: req.file ? {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            } : null
        });

        // Save message data to JSON file for persistence
        const messageData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            name: req.body.name || 'Anonymous',
            email: req.body.email || '',
            message: req.body.message || '',
            audioFile: req.file ? req.file.filename : null,
            processed: false
        };

        // Append to messages log
        const messagesFile = path.join(__dirname, 'messages.json');
        let messages = [];
        
        if (fs.existsSync(messagesFile)) {
            const fileContent = fs.readFileSync(messagesFile, 'utf8');
            try {
                messages = JSON.parse(fileContent);
            } catch (e) {
                messages = [];
            }
        }

        messages.push(messageData);
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

        res.json({
            success: true,
            message: 'Message received successfully',
            id: messageData.id
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// Serve uploaded files (for testing playback)
app.use('/uploads', express.static('uploads'));

// Get all messages (for admin view)
app.get('/messages', (req, res) => {
    try {
        const messagesFile = path.join(__dirname, 'messages.json');
        if (fs.existsSync(messagesFile)) {
            const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
            res.json(messages);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
    });
});

app.listen(port, () => {
    console.log(`🚀 Voice message server running at http://localhost:${port}`);
    console.log(`📁 Upload endpoint: POST http://localhost:${port}/upload`);
    console.log(`📋 Messages view: GET http://localhost:${port}/messages`);
    console.log(`💾 Files saved to: ${path.join(__dirname, 'uploads')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
});
// Add this to your server.js for email notifications
const nodemailer = require('nodemailer');

// Email configuration (add to environment variables)
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.aqa.sports.academy@gmail.com, // your-email@gmail.com
        pass: process.env.mbxftgqxuukigfzo
    }  //
});

// Add this function to send notifications
async function sendEmailNotification(messageData) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'aqa.sports.academy@gmail.com', // Your notification email
            subject: '🎤 Nouveau message vocal - AQA Sports Academy',
            html: `
                <h2>Nouveau message vocal reçu</h2>
                <p><strong>Date:</strong> ${new Date(messageData.timestamp).toLocaleString('fr-FR')}</p>
                <p><strong>Nom:</strong> ${messageData.name}</p>
                <p><strong>Email:</strong> ${messageData.email || 'Non fourni'}</p>
                <p><strong>Message écrit:</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    ${messageData.message || '<em>Aucun message écrit</em>'}
                </div>
                ${messageData.audioFile ? `
                <p><strong>Fichier audio:</strong> ${messageData.audioFile.filename} (${Math.round(messageData.audioFile.size / 1024)}KB)</p>
                ` : '<p><em>Aucun fichier audio</em></p>'}
                <hr>
                <p><small>Message ID: ${messageData.id}</small></p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email notification sent successfully');
    } catch (error) {
        console.error('Failed to send email notification:', error);
        // Don't throw error - we don't want to fail the upload if email fails
    }
}

// Add this to your upload route, after storing the message:
// await sendEmailNotification(messageData);