require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport");
const path = require("path");
const placementConsentRoutes = require('./routes/placementConsent');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Serve uploaded signature files
app.use('/uploads/signatures', express.static(path.join(__dirname, 'uploads/signatures')));

// Session middleware (required for passport)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "s8f9230f23u29f3nq38nq328nfs9d8vnasdvn2398vn",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true in production with HTTPS
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Test route
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes - Comment out all and add back one by one
console.log('Starting to load routes...');

// Test each route individually
try {
  console.log('Loading auth routes...');
  const authRoutes = require("./routes/auth");
  console.log('Auth routes type:', typeof authRoutes);
  app.use("/api/auth", authRoutes);
} catch (error) {
  console.error('Error with auth routes:', error.message);
}

try {
  console.log('Loading job-drives routes...');
  const jobDriveRoutes = require("./routes/jobDrives");
  console.log('JobDrive routes type:', typeof jobDriveRoutes);
  app.use("/api/job-drives", jobDriveRoutes);
} catch (error) {
  console.error('Error with job-drives routes:', error.message);
}

try {
  console.log('Loading users routes...');
  const userRoutes = require("./routes/users");
  console.log('User routes type:', typeof userRoutes);
  app.use("/api/users", userRoutes);
} catch (error) {
  console.error('Error with users routes:', error.message);
}

try {
  console.log('Loading profile routes...');
  const profileRoutes = require("./routes/profile");
  console.log('Profile routes type:', typeof profileRoutes);
  app.use("/api/profile", profileRoutes);
} catch (error) {
  console.error('Error with profile routes:', error.message);
}

try {
  console.log('Loading placement-consent routes...');
  const placementRoutes = require("./routes/placementConsent");
  console.log('Placement routes type:', typeof placementRoutes);
  app.use("/api/placement-consent", placementRoutes);
} catch (error) {
  console.error('Error with placement-consent routes:', error.message);
}

console.log('Finished loading routes');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Something went wrong!" });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



