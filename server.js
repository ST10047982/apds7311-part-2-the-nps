const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User'); // Import the User model
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for session management
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Allows the server to parse JSON bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('Welcome to the International Payments Portal API');
});

// Registration Route
app.post('/register', async (req, res) => {
  const { fullName, idNumber, accountNumber, password } = req.body;

  try {
    // Validate input
    if (!fullName || !idNumber || !accountNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ accountNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({ fullName, idNumber, accountNumber, password }); // Password will be hashed in the model
    await user.save(); // Save user to the database

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { accountNumber, password } = req.body;

  console.log('Login attempt:', req.body); // Log the incoming request body

  try {
    // Validate input
    if (!accountNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find the user by account number
    const user = await User.findOne({ accountNumber });
    if (!user) {
      console.log('User not found'); // Log for debugging
      return res.status(401).json({ message: 'Invalid account number' });
    }

    console.log('User found:', user); // Log the user retrieved from the database

    // Attempt to compare the provided password with the stored hashed password
    const isMatch = await user.comparePassword(password); // Use the method from the User model

    console.log('Password comparison:');
    console.log('Provided password:', password); // Log the provided password (plain text)
    console.log('Stored password hash:', user.password); // Log the stored hash for debugging
    console.log('Password match result:', isMatch); // Log the result of the password comparison

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Create a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Login successful
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal server error' });
  }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from header
  
    if (!token) {
      console.log('No token provided'); // Log for debugging
      return res.sendStatus(401); // Unauthorized
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('Token verification failed:', err.message); // Log error message
        return res.sendStatus(403); // Forbidden
      }
      req.user = user; // Store user information in the request
      console.log('Token verified successfully:', user); // Log verified user info
      next(); // Continue to the next middleware
    });
  };
  
  // Logout Route
  app.post('/logout', (req, res) => {
      // Inform the client to remove the token on their side
      res.status(200).json({ message: 'Logout successful. Please remove the token and redirect to the login screen.' });
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  