// netlify/functions/send-message.js
// Netlify serverless function to handle audio message submissions

const nodemailer = require("nodemailer");

exports.handler = async function(event, context) {
  const allowedOrigins = [
    'https://aqasports.pro',
    'https://www.aqasports.pro',
    'https://aqasports.com',
    'https://www.aqasports.com',
    'https://aqasuivi.netlify.app'
  ];
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')
        ? requestOrigin
        : allowedOrigins[0]);

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // Parse JSON body (frontend must send JSON, not multipart/form-data)
    const data = JSON.parse(event.body);
    const { name, email, message, timestamp, audioBase64, audioFilename, honeypot } = data;

    // Anti-spam: honeypot field must be empty (bots fill it, humans don't)
    if (honeypot) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: "OK" }) // Silently reject
      };
    }

    const hasTextContent = !!(name || email || message);
    const hasAudioContent = !!audioBase64;

    if (!hasTextContent && !hasAudioContent) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Au moins un contenu (texte ou audio) est requis"
        })
      };
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email content
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #0099ff, #00ffff); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0;">Nouveau message depuis AQA Sports Academy</h2>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: #666; margin-bottom: 20px;"><strong>Reçu le:</strong> ${new Date(timestamp || Date.now()).toLocaleString("fr-FR")}</p>
          
          ${name ? `<p><strong style="color: #0099ff;">Nom:</strong> ${name}</p>` : ""}
          ${email ? `<p><strong style="color: #0099ff;">Email:</strong> <a href="mailto:${email}">${email}</a></p>` : ""}
          ${message ? `<div><strong style="color: #0099ff;">Message:</strong><div style="background:#f8f9fa; padding:10px; border-radius:8px;">${message.replace(/\n/g,"<br>")}</div></div>` : ""}
          ${audioBase64 ? `<p><strong>🎙️ Message vocal joint en pièce jointe</strong></p>` : ""}
        </div>
      </div>
    `;

    // Mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
      subject: `🎙️ Nouveau message AQA${name ? ` - ${name}` : ""}`,
      html: emailHtml,
      attachments: audioBase64
        ? [
            {
              filename: audioFilename || `voice-message-${Date.now()}.webm`,
              content: Buffer.from(audioBase64, "base64"),
              contentType: "audio/webm"
            }
          ]
        : []
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: "Message envoyé avec succès" })
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: "Erreur lors de l'envoi du message" })
    };
  }
};
