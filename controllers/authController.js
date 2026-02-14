import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "user",
    });

    await sendEmail({
  to: normalizedEmail,
  subject: "🎉 Welcome to OGW Store Management",
  text: `Hi ${name}, your account has been created successfully. You can now login and manage your inventory.`,
  html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

      <!-- Header -->
      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">OGW Store Management</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px;">
        <h2 style="color: #111827;">Welcome, ${name}! 👋</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          Your account has been successfully created.
          You can now access your dashboard and start managing
          inventory, releases, returns, and reports.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://ogwinventorysystem.vercel.app/login"
            style="background: #2563eb;
                   color: #ffffff;
                   padding: 12px 24px;
                   text-decoration: none;
                   border-radius: 6px;
                   font-weight: bold;">
            Login to Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you did not create this account, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} OGW Store Management. All rights reserved.
      </div>

    </div>
  </div>
  `,
});


    // Send welcome email (non-blocking)
//     sendEmail({
//      to: normalizedEmail,
// cc: process.env.EMAIL_USER,
//       subject: "Welcome to Store Management!",
//       text: `Hi ${name}, your account has been created successfully.`,
//       html: `<p>Hi <strong>${name}</strong>, your account has been created successfully.</p>`,
//     });

    // Generate JWT immediately
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
}

// Login Controller
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Check if account is active
    if (!user.active) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    // 3. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5. Return success response
   return res.status(200).json({
  message: "Login successful",
  token,
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,   // ✅ ADD THIS
  },
});
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Logged-in User
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

