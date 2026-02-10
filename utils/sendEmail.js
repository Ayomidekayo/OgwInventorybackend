import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create the transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true if port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// sendEmail function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (process.env.EMAIL_NOTIF !== "true") return;

    if (!to) {
      throw new Error("No recipients defined");
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: html || text, // fallback to text if html is missing
      text: text,         // include text for email clients that don’t support HTML
    });

    console.log(" Email sent to", to);
  } catch (err) {
    console.error(" sendEmail error:", err.message);
  }
};

export default sendEmail;
