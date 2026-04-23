const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { startReminderScheduler } = require("./services/reminderScheduler");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.options("*", cors());

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api", require("./routes/registrationRoutes"));
app.use("/api", require("./routes/debugRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on " + PORT);
  startReminderScheduler();
});

// Start hourly reminder cron job (non-blocking)
require("./cronJobs/reminderJob");
