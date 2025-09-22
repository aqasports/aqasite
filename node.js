const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audio_${timestamp}_${Math.random().toString(36).substring(7)}.${file.originalname.split('.').pop()}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/webm',
      'audio/mp4'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

// Email configuration
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com', // Change based on your email provider
  port: 587,
  secure: false,
  auth: {
    user: process.env.aqa.sports.academy@gmail.com|| 'aqa.sports.academy@gmail.com',
    pass: process.env.mbxftgqxuukigfzo || 'your-app-password'
  }
});

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server ready');
  }
});

// Audio upload endpoint
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        success: false 
      });
    }

    const { clientName, clientEmail, message } = req.body;
    const audioFile = req.file;
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'aqa.sports.academy@gmail.com',
      to: 'aqa.sports.academy@gmail.com', // Your receiving email
      subject: `New Audio Recording from ${clientName || 'Client'}`,
      html: `
        <h2>New Audio Recording Received</h2>
        <p><strong>Client Name:</strong> ${clientName || 'Not provided'}</p>
        <p><strong>Client Email:</strong> ${clientEmail || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message || 'No message'}</p>
        <p><strong>File Name:</strong> ${audioFile.filename}</p>
        <p><strong>File Size:</strong> ${(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p>The audio file is attached to this email.</p>
      `,
      attachments: [
        {
          filename: audioFile.originalname || audioFile.filename,
          path: audioFile.path,
          contentType: audioFile.mimetype
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Delete the file after sending (optional)
    fs.unlink(audioFile.path, (err) => {
      if (err) console.log('Error deleting file:', err);
    });

    res.json({
      success: true,
      message: 'Audio file uploaded and sent successfully!',
      filename: audioFile.filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: 'Failed to process audio upload',
      success: false,
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 50MB.',
        success: false
      });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    success: false
  });
});

app.listen(port, () => {
  console.log(`Audio upload server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});