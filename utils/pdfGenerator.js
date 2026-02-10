import PDFDocument from "pdfkit";
import fs from "fs";

export const generateTaskPDF = (tasks, filename) => {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filename));

  doc.fontSize(16).text("User Task History", { align: "center" });
  doc.moveDown();

  tasks.forEach((task, idx) => {
    doc.fontSize(12).text(`${idx + 1}. ${task.action} on ${task.date}`);
  });

  doc.end();
};


// utils/sendEmail.js
import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: `"Inventory System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments, // [{ filename, path }]
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} (${subject})`);
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
  }
};
