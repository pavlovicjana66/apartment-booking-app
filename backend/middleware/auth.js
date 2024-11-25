const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists in database
    db.query('SELECT user_id, name, email, role FROM users WHERE user_id = ? AND is_deleted = FALSE', [decoded.user_id], (err, results) => {
      if (err) {
        console.error('Database error in auth middleware:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ error: 'User not found or deleted.' });
      }
      
      req.user = results[0];
      next();
    });
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists and is admin
    db.query('SELECT user_id, name, email, role FROM users WHERE user_id = ? AND role = "admin" AND is_deleted = FALSE', [decoded.user_id], (err, results) => {
      if (err) {
        console.error('Database error in adminAuth middleware:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      
      req.user = results[0];
      next();
    });
  } catch (error) {
    console.error('JWT verification error in adminAuth:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const userAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists and has user or admin role
    db.query('SELECT user_id, name, email, role FROM users WHERE user_id = ? AND (role = "user" OR role = "admin") AND is_deleted = FALSE', [decoded.user_id], (err, results) => {
      if (err) {
        console.error('Database error in userAuth middleware:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(403).json({ error: 'Access denied. User privileges required.' });
      }
      
      req.user = results[0];
      next();
    });
  } catch (error) {
    console.error('JWT verification error in userAuth:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = {
  auth,
  adminAuth,
  userAuth
}; 