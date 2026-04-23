const Registration = require("../models/Registration");
const Event        = require("../models/Event");
const User         = require("../models/User");
const { sendConfirmationEmail } = require("../services/emailService");

exports.registerEvent = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event || event.registrationDeadline < new Date())
    return res.status(400).json({ msg: "Closed" });

  // Capacity check
  if (event.maxRegistrations && event.registrationCount >= event.maxRegistrations)
    return res.status(400).json({ msg: "Event is full" });

  try {
    const { name, collegeId, collegeName, email } = req.body;

    await new Registration({
      userId: req.user.id,
      eventId: req.params.eventId,
      name, collegeId, collegeName, email,
    }).save();

    // Atomically increment the counter on the event document
    await Event.findByIdAndUpdate(req.params.eventId, { $inc: { registrationCount: 1 } });

    // Respond immediately — email must never delay or block this
    res.json({ msg: "Registered" });

    // Fire-and-forget in a fully isolated async IIFE.
    // Any throw inside is caught here and logged; it can never reach Express.
    (async () => {
      try {
        // Resolve recipient from the User record in DB.
        // The frontend sends no payload, so req.body.email is always undefined.
        const userDoc = await User.findById(req.user.id).lean();

        const recipientEmail = (email || userDoc?.email || "").trim();
        const recipientName  =  name  || userDoc?.name  || "there";

        console.log(`[Email:confirm] userId=${req.user.id} | email="${recipientEmail}" | name="${recipientName}" | event="${event.title}"`);

        if (!recipientEmail) {
          console.warn(`[Email:confirm] No email address found for userId=${req.user.id} — skipping`);
          return;
        }

        await sendConfirmationEmail(recipientEmail, event, { name: recipientName });

      } catch (err) {
        console.error("[Email:confirm] Failed:", err.message);
      }
    })();

  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ msg: "Already registered" });
    res.status(500).send("error");
  }
};

exports.myRegistrations = async (req, res) => {
  const r = await Registration.find({ userId: req.user.id }).populate("eventId");
  res.json(r);
};

exports.eventRegistrations = async (req, res) => {
  const r = await Registration.find({ eventId: req.params.id }).populate("userId");
  res.json(r);
};
