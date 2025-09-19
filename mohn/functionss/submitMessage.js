// netlify/functions/submitMessage.js
import { Resend } from 'resend';

const resend = new Resend(process.env.re_3DBu78ab_7Sr46u9sfSnNRLvYdg6n6h8u);

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { name, email, message, audio, timestamp } = body;

    // Construct email body
    const html = `
      <h2>📩 Nouveau message AQA</h2>
      <p><strong>Nom:</strong> ${name || '-'}</p>
      <p><strong>Email:</strong> ${email || '-'}</p>
      <p><strong>Message:</strong><br/>${(message || '').replace(/\n/g, '<br/>')}</p>
      <p><small>Envoyé le: ${timestamp || new Date().toISOString()}</small></p>
    `;

    // Prepare attachments if audio is included
    let attachments = [];
    if (audio && audio.data) {
      attachments.push({
        filename: audio.filename || 'voice-message.webm',
        content: audio.data, // base64 string (frontend already strips "data:")
      });
    }

    // Send email via Resend
    await resend.emails.send({
      from: 'AQA Contact <onboarding@resend.dev>', // works without domain setup
      to: process.env.aqa.sports.academy@gmail.com, // your inbox
      subject: 'Nouveau message AQA',
      html,
      attachments,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };

  } catch (err) {
    console.error('submitMessage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Server error' }),
    };
  }
}
