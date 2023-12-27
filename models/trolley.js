// trolley model
const mongoose = require('mongoose');
const TrolleyNumber = require('./trolleyNumber');

const TrolleySchema = new mongoose.Schema({
  trolleyNumberInfo: {
    type: TrolleyNumber.schema,
    required: true,
  },
  // Other fields in your Trolley schema
  departureTime: {
    type: Date,
    required: true,
  },
  returnTime: {
    type: Date,
  },
  pickupLocation: {
    type: String,
  },
  customer: {
    type: String,
  },
  deliveryLocation: {
    type: String,
  },
  balancePrintDate: {
    type: Date,
  },
  balanceNumber: {
    type: String,
    required: true,
  },
  securityDeposit: {
    type: Number,
    required: true,
  },
  rentalAmount: {
    type: Number,
    required: true,
  },
  remainingAmount: {
    type: Number,
  },
  staff: {
    type: String,
  },
});

module.exports = mongoose.model('Trolley', TrolleySchema);
