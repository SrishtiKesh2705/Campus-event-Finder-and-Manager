const mongoose = require("mongoose");
module.exports = mongoose.model("Event", new mongoose.Schema({
  title:                String,
  description:          String,
  type:                 { type: String, enum: ["hackathon","tech","seminar","games","movie","other"] },
  date:                 Date,
  time:                 String,
  registrationDeadline: Date,
  location:             String,
  createdBy:            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  maxRegistrations:     { type: Number, default: 100 },
  registrationCount:    { type: Number, default: 0 },
}, { timestamps: true }));
