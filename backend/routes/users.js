const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', adminAuth, (req, res) => {
  const { role, page = 1, limit = 10 } = req.query;

  let query = 'SELECT user_id, name, email, role, created_at, is_deleted FROM users';
  const params = [];

  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (page - 1) * limit);

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const countParams = [];

    if (role) {
      countQuery += ' WHERE role = ?';
      countParams.push(role);
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        users: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      });
    });
  });
});

// Get single user by ID (admin only)
router.get('/:id', adminAuth, (req, res) => {
  const userId = req.params.id;

  db.query('SELECT user_id, name, email, role, created_at, is_deleted FROM users WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: results[0] });
  });
});

// Update user role (admin only)
router.put('/:id/role', adminAuth, [
  body('role').isIn(['user', 'admin']).withMessage('Valid role is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { role } = req.body;

    db.query('UPDATE users SET role = ? WHERE user_id = ?', [role, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating user role' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User role updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete user (admin only)
router.delete('/:id', adminAuth, (req, res) => {
  const userId = req.params.id;

  db.query('UPDATE users SET is_deleted = TRUE WHERE user_id = ?', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// Reactivate user (admin only)
router.put('/:id/reactivate', adminAuth, (req, res) => {
  const userId = req.params.id;

  db.query('UPDATE users SET is_deleted = FALSE WHERE user_id = ?', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error reactivating user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User reactivated successfully' });
  });
});

// Block user (admin only)
router.put('/:id/block', adminAuth, (req, res) => {
  const userId = req.params.id;

  db.query('UPDATE users SET is_deleted = TRUE WHERE user_id = ?', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error blocking user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User blocked successfully' });
  });
});

// Unblock user (admin only)
router.put('/:id/unblock', adminAuth, (req, res) => {
  const userId = req.params.id;

  db.query('UPDATE users SET is_deleted = FALSE WHERE user_id = ?', [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error unblocking user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  });
});

module.exports = router; 