const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Add this line for password hashing
const jwt = require('jsonwebtoken'); // Add this line for generating JWT tokens
const Trolley = require('../models/trolley'); // Adjust the path based on your folder structure
const Employee = require('../models/employee'); // Add this line
const TrolleyNumber = require('../models/trolleyNumber'); // Adjust the path based on your folder structure
const rateLimit = require("express-rate-limit");
const UserLog = require('../models/UserLog');
const userLogger = require('../middleware/userLogger');
 


 

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 12, // limit each IP to 100 requests per windowMs
  message:
      "Too many requests from this IP, please try again after an 15 minute window",
});




// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    if (!decodedToken) {
      console.error('User not found in token');
      return res.status(403).json({ error: 'Forbidden: User not found' });
    }

    req.user = decodedToken; // Use decodedToken instead of user
    console.log('Decoded User:', decodedToken);
    next();
  });
};

// Middleware to check if the user is an admin
const isAdminMiddleware = (req, res, next) => {
    // Access the user data from the request
    const user = req.user;
    console.log('User:', user);
    // Check if the user is an admin
    if (user && user.isAdmin) {
      // User is an admin, allow access to the route
      next();
    } else {
      // User is not an admin, return an error
      res.status(403).json({ error: 'Forbidden: Access denied for non-admin users' });
    }
  };
 
// Route to add a new Trolley
router.post('/addTrolley', async (req, res) => {

 
  try {
    const {
      customer,
      balanceNumber,
      isOutside,
      departureTime,
      balancePrintDate,
      returnTime,
      pickupLocation,
      deliveryLocation,
      trolleyNumber,
      securityDeposit,
      rentalAmount,
      remainingAmount,
      staff,
    } = req.body;

    // Check if balanceNumber is already in use
    const existingTrolley = await Trolley.findOne({ balanceNumber });

    if (existingTrolley) {
      return res.status(400).json({ error: 'BalanceNumber must be unique' });
    }

   // Check if TrolleyNumber is acceptable
   let existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber });

   if (!existingTrolleyNumber) {
     // If the trolley is not found, generate a new one
     existingTrolleyNumber = new TrolleyNumber({
       trolleyNumber,
       isOutside, // Set based on the request, not always true
     });
   } else if (!existingTrolleyNumber.isOutside) {
     // If the trolley is inside, allow reuse
     existingTrolleyNumber.isOutside = true;
     await existingTrolleyNumber.save();
   } else {
     // If the trolley is outside, cannot reuse
     return res.status(400).json({ error: 'Trolley with this number is already outside' });
   }

    // Parse the incoming date and time strings into JavaScript Date objects
    const parsedDepartureTime = new Date(departureTime);
    const parsedReturnTime = returnTime ? new Date(returnTime) : null;
    const parsedBalancePrintDate = new Date(balancePrintDate);

    // Create a new Trolley
    const newTrolley = new Trolley({
      trolleyNumberInfo: {
        trolleyNumber,
        isOutside,
      },
      balanceNumber,
      customer,
      departureTime: parsedDepartureTime,
      returnTime: parsedReturnTime,
      pickupLocation,
      deliveryLocation,
      securityDeposit,
      rentalAmount,
      remainingAmount,
      balancePrintDate: parsedBalancePrintDate,
      staff,
    });
 
    // Save the new Trolley
    const savedTrolley = await newTrolley.save();
    
    res.json(savedTrolley);
    // Recreate unique index after saving

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Route to update an existing Trolley
router.put('/updateTrolley/:balanceNumber', authenticateToken, async (req, res) => {
  try {
    const balanceNumber = req.params.balanceNumber;
    const updatedTrolleyData = req.body;

    // Ensure trolleyNumber is provided
    if (!updatedTrolleyData.trolleyNumber) {
      return res.status(400).json({ error: 'TrolleyNumber is required' });
    }

    // Find the trolley by balanceNumber
    const existingTrolley = await Trolley.findOne({ balanceNumber });

    if (!existingTrolley) {
      return res.status(404).json({ error: 'Trolley not found' });
    }

    // Check if TrolleyNumber is acceptable
    const existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber: updatedTrolleyData.trolleyNumber });

    if (!existingTrolleyNumber) {
      return res.status(400).json({ error: 'TrolleyNumber is not acceptable' });
    }

    // Update isOutside property in both Trolley and TrolleyNumber
    existingTrolleyNumber.isOutside = updatedTrolleyData.isOutside;
    await existingTrolleyNumber.save();

    // Update trolley data
    Object.assign(existingTrolley, updatedTrolleyData);

    // Update isOutside property in Trolley
    existingTrolley.trolleyNumberInfo.isOutside = updatedTrolleyData.isOutside;

    // Save the updated trolley
    const updatedTrolley = await existingTrolley.save();
    res.json(updatedTrolley);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  

// Route to get all Trolleys by trolleyNumber
router.get('/getTrolleys/:trolleyNumber', authenticateToken, async (req, res) => {
  try {
    const trolleyNumber = req.params.trolleyNumber;

    // Find all trolleys with the given trolleyNumber
    const trolleys = await Trolley.find({ 'trolleyNumberInfo.trolleyNumber': trolleyNumber });

    if (!trolleys || trolleys.length === 0) {
      return res.status(404).json({ error: 'Trolleys not found for the given trolleyNumber' });
    }

    res.json(trolleys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to update a Trolley by trolleyNumber
router.put('/updateTrolley/:trolleyNumber', authenticateToken, async (req, res) => {
  try {
    const trolleyNumber = req.params.trolleyNumber;
    const updatedTrolleyData = req.body;

    // Find the trolley by trolleyNumber
    const existingTrolley = await Trolley.findOne({ 'trolleyNumberInfo.trolleyNumber': trolleyNumber });

    if (!existingTrolley) {
      return res.status(404).json({ error: 'Trolley not found' });
    }

    // Update isOutside property in Trolley
    existingTrolley.trolleyNumberInfo.isOutside = updatedTrolleyData.isOutside;

    // Update other fields if needed
    // ...

    // Save the updated trolley
    const updatedTrolley = await existingTrolley.save();

    res.json(updatedTrolley);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to delete an existing Trolley
router.delete('/deleteTrolley/:balanceNumber', authenticateToken, async (req, res) => {
  try {
    const balanceNumber = req.params.balanceNumber;

    // Find the trolley by balanceNumber
    const existingTrolley = await Trolley.findOne({ balanceNumber });

    if (!existingTrolley) {
      return res.status(404).json({ error: 'Trolley not found' });
    }

    // Use deleteOne to remove the trolley
    await existingTrolley.deleteOne();

    res.json({ message: 'Trolley deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get all Trolleys with count
router.get('/getAllTrolleys', async (req, res) => {
    try {
      // Access the user data from the request
      const user = req.user;
      console.log('User in getAllTrolleys:', user);
  
      // Retrieve all trolleys from the database
      const allTrolleys = await Trolley.find();
      const trolleyCount = await Trolley.countDocuments();
  
      res.json({ count: trolleyCount, trolleys: allTrolleys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  


// Route to add a new Trolley Number
router.post('/addTrolleyNumber',authenticateToken, isAdminMiddleware, async (req, res) => {
    try {
        const { trolleyNumber, isOutside } = req.body;

        // Check if trolleyNumber already exists
        const existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber });

        if (existingTrolleyNumber) {
            return res.status(400).json({ error: 'TrolleyNumber must be unique' });
        }

        const newTrolleyNumber = new TrolleyNumber({
            trolleyNumber,
            isOutside,
        });

        const savedTrolleyNumber = await newTrolleyNumber.save();
        res.json(savedTrolleyNumber);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get all TrolleyNumbers with count
router.get('/getAllTrolleyNumbers', async (req, res) => {
    try {
      const allTrolleyNumbers = await TrolleyNumber.find();
      const trolleyNumberCount = await TrolleyNumber.countDocuments();
    
      res.json({ count: trolleyNumberCount, trolleyNumbers: allTrolleyNumbers });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Add this route to fetch Trolley details by Trolley Number
router.get('/getTrolleyNumber/:trolleyNumber', async (req, res) => {
  try {
    const trolleyNumber = req.params.trolleyNumber;

    // Find the TrolleyNumber by trolleyNumber
    const existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber });

    if (!existingTrolleyNumber) {
      return res.status(404).json({ error: 'TrolleyNumber not found' });
    }

    // Return the TrolleyNumber details
    res.json(existingTrolleyNumber);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

  
// Route to update a TrolleyNumber
router.put('/updateTrolleyNumber/:trolleyNumber',authenticateToken, async (req, res) => {
    try {
      const trolleyNumber = req.params.trolleyNumber;
      const updatedTrolleyNumberData = req.body;
  
      // Find the TrolleyNumber by trolleyNumber
      const existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber });
  
      if (!existingTrolleyNumber) {
        return res.status(404).json({ error: 'TrolleyNumber not found' });
      }
  
      // Update TrolleyNumber data
      Object.assign(existingTrolleyNumber, updatedTrolleyNumberData);
  
      // Save the updated TrolleyNumber
      const updatedTrolleyNumber = await existingTrolleyNumber.save();
      res.json(updatedTrolleyNumber);
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Route to delete a TrolleyNumber
  router.delete('/deleteTrolleyNumber/:trolleyNumber',authenticateToken, async (req, res) => {
    try {
      const trolleyNumber = req.params.trolleyNumber;
  
      // Find the TrolleyNumber by trolleyNumber
      const existingTrolleyNumber = await TrolleyNumber.findOne({ trolleyNumber });
  
      if (!existingTrolleyNumber) {
        return res.status(404).json({ error: 'TrolleyNumber not found' });
      }
  
      // Use deleteOne to remove the TrolleyNumber
      await existingTrolleyNumber.deleteOne();
  
      res.json({ message: 'TrolleyNumber deleted successfully' });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


// Route to add a new employee
router.post('/addEmployee',authenticateToken, isAdminMiddleware, async (req, res) => {
    try {
      const { username, password, employeeData } = req.body;
  
      // Check if the username already exists
      const existingEmployee = await Employee.findOne({ username });
      if (existingEmployee) {
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newEmployee = new Employee({
        username,
        password: hashedPassword,
        employeeData,
      });
  
      const savedEmployee = await newEmployee.save();
      res.json(savedEmployee);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Route to get all employees
router.get('/getAllEmployees', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    // Retrieve all employees from the database
    const allEmployees = await Employee.find({ isAdmin: false });

    // Send the list of employees in the response
    res.json({ employees: allEmployees });
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({ error: error.message });
  }
});


// Route to update an existing employee
router.put('/updateEmployee/:employeeId', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const updatedEmployeeData = req.body;

    // Find the employee by ID
    const existingEmployee = await Employee.findById(employeeId);

    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Hash the password before updating if a new password is provided
    if (updatedEmployeeData.password) {
      updatedEmployeeData.password = await bcrypt.hash(updatedEmployeeData.password, 10);
    }

    // Update employee data
    Object.assign(existingEmployee, updatedEmployeeData);

    // Save the updated employee
    const updatedEmployee = await existingEmployee.save();
    res.json(updatedEmployee);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Route to get the current user based on the authentication token
router.get('/getCurrentUser', authenticateToken, async (req, res) => {
  try {
    // You can access the user information from the request object
    const currentUser = req.user;

    // Fetch additional user details from the database if needed
    const userFromDB = await Employee.findById(currentUser.userId);

    res.json({ user: userFromDB });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to delete an existing employee
router.delete('/deleteEmployee/:employeeId', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
  
    // Find the employee by ID
    const existingEmployee = await Employee.findById(employeeId);

    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Use deleteOne to remove the employee
    await existingEmployee.deleteOne();
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Route to get all Admin
router.get('/getAdminEmployees', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    // Retrieve all employees from the database
    const adminEmployees = await Employee.find({ isAdmin: true });

    // Send the list of employees in the response
    res.json({ employees: adminEmployees });
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({ error: error.message });
  }
});

  // Route to add a new employee with admin privileges
router.post('/addAdmin', async (req, res) => {
    try {
        const { username, password, employeeData } = req.body;

        // Check if the username already exists
        const existingEmployee = await Employee.findOne({ username });
        if (existingEmployee) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new admin with isAdmin set to true
        const newAdmin = new Employee({
            username,
            password: hashedPassword,
            employeeData,
            isAdmin: true, // Set isAdmin to true for admin users
        });

        const savedAdmin = await newAdmin.save();
        res.json(savedAdmin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

  
// Route to update an existing admin employee
router.put('/updateAdmin/:employeeId', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const updatedAdminData = req.body;

    // Find the admin employee by ID
    const existingAdmin = await Employee.findById(employeeId);

    if (!existingAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Hash the password before updating if a new password is provided
    if (updatedAdminData.password) {
      updatedAdminData.password = await bcrypt.hash(updatedAdminData.password, 10);
    }

    // Update admin data
    Object.assign(existingAdmin, updatedAdminData);

    // Save the updated admin
    const updatedAdmin = await existingAdmin.save();
    res.json(updatedAdmin);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Route to delete an existing admin employee
router.delete('/deleteAdmin/:employeeId', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // Find the admin employee by ID
    const existingAdmin = await Employee.findById(employeeId);

    if (!existingAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Use deleteOne to remove the admin employee
    await existingAdmin.deleteOne();

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get an admin by ID
router.get('/getAdmin/:id', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    const adminId = req.params.id;

    // Find the admin by ID
    const admin = await Employee.findById(adminId);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(admin);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const jwtExpireTime = process.env.JWT_EXPIRE_TIME || '12h';
// Route to authenticate and login an employee or admin
router.post('/login',limiter, async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Find the user (employee or admin) by username
      const user = await Employee.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Check if the provided password matches the stored hash
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      // Generate a JWT token for authentication
      const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: jwtExpireTime });
  
      // Return the token and user data
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  // Route to logout (invalidate the token)
router.post('/logout', authenticateToken, (req, res) => {
    // Invalidate the token on the server side (optional)
    // You can also handle token invalidation on the client side
    res.json({ message: 'Logout successful' });
  });


// Route to verify authentication and get user details
router.get('/profile', authenticateToken, (req, res) => {
    try {
      // Access the user data from the request
      const user = req.user;
  
      // Return the user data
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });




// routes/trolleyRoutes.js
router.post('/log', authenticateToken, userLogger, async (req, res) => {
  try {

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging user action:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/logs', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    // Check if the logged-in user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { date } = req.query;
    let query = {};

    if (date) {
      // If date is provided, filter logs based on the date
      query = { timestamp: { $gte: new Date(date), $lt: new Date(date + 'T23:59:59.999Z') } };
    }

    // Fetch user logs from the database
    const userLogs = await UserLog.find(query).populate('employeeId', 'username');

    res.status(200).json({ userLogs });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  

router.delete('/logs/:date', authenticateToken, isAdminMiddleware, async (req, res) => {
  try {
    // Assuming you pass the date as a parameter in the route
    const { date } = req.params;

    // Use the date to delete logs with the same timestamp
    await UserLog.deleteMany({ timestamp: { $gte: new Date(date), $lt: new Date(date + 'T23:59:59.999Z') } });

    res.status(204).send(); // Respond with 204 No Content for a successful deletion
  } catch (error) {
    console.error('Error deleting logs by date:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


  module.exports = router;