const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    vehicle: {
      type: {
        type: String,
        enum: ["EV", "Hybrid", "Petrol", "Diesel"],
      },
      batteryCapacity: {
        type: Number,
      },
      connectorType: {
        type: String,
        enum: ["CCS2", "CHAdeMO", "Type2"],
      },
    },
    vehicleNumbers: {
      type: [String],
      default: [],
    },
    password: {
      type: String,
      select:false,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "StationOwner", "admin"],
      default: "user",
    },
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true } 
);

const User = mongoose.model("User", userSchema);

module.exports = User;