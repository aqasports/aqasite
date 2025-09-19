import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = "aqa.sports.academy@gmail.com"; // change to your email

export default async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, message, audio, audioName } = req.body;

    const attachments = [];
    if (audio && audioName) {
      attachments.push({
        filename: audioName,
        content: audio,
        encoding: "base64",
      });
    }

    await resend.emails.send({
      from: "AQA Contact <onboarding@resend.dev>",
      to: TO_EMAIL,
      subject: "Nouveau message depuis le site AQA",
      text: `
Nom: ${name || "Non fourni"}
Email: ${email || "Non fourni"}
Message: ${message || "—"}
      `,
      attachments,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("SendMail error:", error);
    return res.status(500).json({ error: "Erreur lors de l'envoi" });
  }
};
