const Event = require("../models/Event");
const User  = require("../models/User");
const { sendNewEventAnnouncement } = require("../services/emailService");

exports.createEvent = async (req, res) => {
  const e = new Event({ ...req.body, createdBy: req.user.id });
  await e.save();

  // Respond immediately
  res.json(e);

  // Fire-and-forget in a fully isolated async IIFE.
  // Any throw inside is caught here; it can never reach Express.
  (async () => {
    try {
      const users = await User.find(
        { role: { $in: ["user", "student"] } },
        "email"
      ).lean();

      const emails = [...new Set(
        users.map(u => u.email).filter(v => typeof v === "string" && v.includes("@"))
      )];

      console.log(`[Email] New event "${e.title}" — ${emails.length} recipient(s): ${emails.join(", ") || "none"}`);

      await sendNewEventAnnouncement(emails, e, process.env.APP_URL || "");
    } catch (err) {
      console.error("[Email] Announcement error:", err.message);
    }
  })();
};

exports.getEvents = async (req, res) => {
  const { type, search, page = 1, limit = 10 } = req.query;
  let q = { registrationDeadline: { $gte: new Date() } };
  if (type)   q.type  = type;
  if (search) q.title = { $regex: search, $options: "i" };
  const events = await Event.find(q)
    .sort({ registrationDeadline: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  res.json(events);
};

exports.getEventById = async (req, res) => {
  const e = await Event.findById(req.params.id);
  if (!e) return res.status(404).json({ msg: "Not found" });
  res.json(e);
};

exports.updateEvent = async (req, res) => {
  const e = await Event.findById(req.params.id);
  if (!e) return res.status(404).json({ msg: "Not found" });
  if (e.createdBy.toString() !== req.user.id)
    return res.status(403).json({ msg: "Forbidden: you do not own this event" });
  const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
};

exports.deleteEvent = async (req, res) => {
  const e = await Event.findById(req.params.id);
  if (!e) return res.status(404).json({ msg: "Not found" });
  if (e.createdBy.toString() !== req.user.id)
    return res.status(403).json({ msg: "Forbidden: you do not own this event" });
  await Event.findByIdAndDelete(req.params.id);
  res.json({ msg: "Deleted" });
};
