// middleware/userLogger.js
const UserLog = require('../models/UserLog');

const userLogger = async (req, res, next) => {
  try {
    // console.log('req.user:', req.user);

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // const { action} = req.body;

    // Log user action to the database
    const userLog = new UserLog({
      employeeId: req.user.userId, // Use req.user.userId instead of req.user_id
      action :req.body.action || 'User performed an action',
      details: {
        
        method: req.method,
        // Add more details as needed
        ...req.body.details,
        page: req.body.details.page || 'Unknown Page', // Default to 'Unknown Page' if not provided
      },
    });

    await userLog.save();

    next();
  } catch (error) {
    console.error('Error logging employee action:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
module.exports = userLogger;
