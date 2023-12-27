const mongoose = require('mongoose');

const TrolleyNumberSchema = new mongoose.Schema({
  trolleyNumber: {
    type: String,
    required: true,
  },
  isOutside: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model('TrolleyNumber', TrolleyNumberSchema);
