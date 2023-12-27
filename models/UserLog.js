// models/UserLog.js
const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  // Add other fields as needed
  // For example, if you want to store additional details about the action:
  details: { type: mongoose.Schema.Types.Mixed }, // Mixed type allows storing arbitrary data
});

module.exports = mongoose.model('UserLog', userLogSchema);
