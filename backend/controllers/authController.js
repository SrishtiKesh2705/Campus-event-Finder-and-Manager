const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email)              return res.status(400).json({ msg: "Email is required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ msg: "Invalid email format" });

    let u = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (u) return res.status(400).json({ msg: "User exists" });

    const hash = await bcrypt.hash(password, 10);
    u = new User({ name, email, password: hash, role });
    await u.save();
    res.json({ msg: "Registered" });
  } catch (e) {
    console.error("Register Error:", e);
    res.status(500).json({ msg: e.message || "error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email)              return res.status(400).json({ msg: "Email is required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ msg: "Invalid email format" });

    const u = await User.findOne({ email: new RegExp(`^${email}$`, "i") });
    if (!u) return res.status(400).json({ msg: "Invalid Credentials" });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(400).json({ msg: "Invalid Credentials" });

    const token = jwt.sign(
      { user: { id: u.id, role: u.role } },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token });
  } catch (e) {
    console.error("Login Error:", e);
    res.status(500).json({ msg: e.message || "error" });
  }
};
