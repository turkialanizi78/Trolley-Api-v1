const express = require("express");
const path = require("path");  // Add this line
const dotenv = require("dotenv");
const morgan = require("morgan");
const mongoose = require("mongoose");
const cors = require('cors');
const bodyParser = require("body-parser");
const app = express();
const hpp = require("hpp");
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const userLogger = require('./middleware/userLogger');
// Enable CORS for all routes
app.use(cors());
// Load environment variables
dotenv.config();
app.use(hpp());
app.use(mongoSanitize());
app.use(xssClean());
// Connect to the database
mongoose.connect(process.env.DB_HOST, { useNewUrlParser: true, useUnifiedTopology: true });

// Import routes
const trolleyRoutes = require("./routes/trolleyRoutes"); // Adjust the path based on your folder structure

// Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Use routes
app.use("/trolley", trolleyRoutes); // Adjust the base URL ("/trolley") as needed

// Serve static files from the "client/build" directory
app.use(express.static(path.join(__dirname, 'trolley-frontend', 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'trolley-frontend', 'build', 'index.html'));
});

const port = process.env.PORT || 3000; // Use the PORT environment variable or default to port 3000

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
