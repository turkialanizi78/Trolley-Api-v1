// models/employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  employeeData: {
    firstName: { type: String },
    lastName: { type: String },
    position: { type: String , required: true },
    location: { type: String },
    email: { type: String },
  },
  isAdmin: { type: Boolean, default: false }, // New field to indicate admin status
  //just test
   isManager: { type: Boolean }, // New field to indicate Manager status
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
