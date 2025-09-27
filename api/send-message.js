// api/send-message.js
// This is a Node.js/Express API endpoint for handling audio message submissions

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads (max 25MB)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // or your SMTP provider
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // Your app password
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});

// Main endpoint
router.post('/send-message', upload.single('audio'), async (req, res) => {
  try {
    const { name, email, message, timestamp } = req.body;
    const audioFile = req.file;

    // Validate that at least some content is provided
    const hasTextContent = !!(name || email || message);
    const hasAudioContent = !!audioFile;

    if (!hasTextContent && !hasAudioContent) {
      return res.status(400).json({
        success: false,
        error: 'Au moins un contenu (texte ou audio) est requis'
      });
    }

    // Prepare email content
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #0099ff, #00ffff); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0;">Nouveau message depuis AQA Sports Academy</h2>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #666; margin-bottom: 20px;"><strong>Reçu le:</strong> ${new Date(timestamp).toLocaleString('fr-FR')}</p>
          
          ${name ? `<p style="margin-bottom: 15px;"><strong style="color: #0099ff;">Nom:</strong> ${name}</p>` : ''}
          
          ${email ? `<p style="margin-bottom: 15px;"><strong style="color: #0099ff;">Email:</strong> <a href="mailto:${email}" style="color: #0099ff;">${email}</a></p>` : ''}
          
          ${message ? `
            <div style="margin-bottom: 20px;">
              <strong style="color: #0099ff;">Message:</strong>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #0099ff;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
          
          ${audioFile ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #00ffff;">
              <p style="margin: 0; color: #0066cc;"><strong>🎙️ Message vocal joint en pièce jointe</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                Fichier: ${audioFile.originalname}<br>
                Taille: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>Ce message a été envoyé depuis le formulaire "Nous vous écoutons" sur le site AQA Sports Academy</p>
        </div>
      </div>
    `;

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER, // Where to send the messages
      subject: `🎙️ Nouveau message AQA${name ? ` - ${name}` : ''}`,
      html: emailHtml,
      attachments: audioFile ? [{
        filename: audioFile.originalname || `voice-message-${Date.now()}.${audioFile.mimetype.split('/')[1]}`,
        path: audioFile.path,
        contentType: audioFile.mimetype
      }] : []
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Clean up uploaded file
    if (audioFile && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }

    res.json({
      success: true,
      message: 'Message envoyé avec succès'
    });

  } catch (error) {
    console.error('Error sending message:', error);

    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Handle specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Fichier audio trop volumineux (limite: 25MB)'
      });
    }

    if (error.message.includes('Only audio files are allowed')) {
      return res.status(400).json({
        success: false,
        error: 'Seuls les fichiers audio sont autorisés'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Fichier audio trop volumineux (limite: 25MB)'
      });
    }
  }
  next(error);
});

module.exports = router;