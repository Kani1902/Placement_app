const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  role: {
    type: String,
    enum: ['student', 'po', 'staff'],
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  profile: {
    name: String,
    rollNumber: String,
    registerNo: String, // For CSV matching
    department: String,
    batch: String,
    cgpa: { type: Number, default: 0 }, // Only updatable via CSV
    backlogs: Number
  }
}, {
  timestamps: true
});

// Hash password before saving (skip for Google users)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Skip hashing for Google auth placeholder
  if (this.password === 'google-auth') return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Google users can't use password login
    if (this.password === 'google-auth') return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);





