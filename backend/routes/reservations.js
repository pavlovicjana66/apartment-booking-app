const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth, userAuth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Create new reservation (authenticated users only)
router.post('/', userAuth, [
  body('apartment_id').isInt().withMessage('Valid apartment ID is required'),
  body('start_time').isISO8601().withMessage('Valid start time is required'),
  body('end_time').isISO8601().withMessage('Valid end time is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apartment_id, start_time, end_time } = req.body;
    const user_id = req.user.user_id;

    // Check if apartment exists and is available
    db.query('SELECT * FROM apartments WHERE apartment_id = ? AND is_deleted = FALSE', [apartment_id], (err, apartmentResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (apartmentResults.length === 0) {
        return res.status(404).json({ error: 'Apartment not found' });
      }

      const apartment = apartmentResults[0];

      // Check if dates are valid
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      const now = new Date();

      if (startDate <= now) {
        return res.status(400).json({ error: 'Start date must be in the future' });
      }

      if (endDate <= startDate) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      // Check for conflicting reservations
      const conflictQuery = `
        SELECT * FROM reservations 
        WHERE apartment_id = ? 
        AND is_deleted = FALSE 
        AND status IN ('pending', 'confirmed')
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      `;

      db.query(conflictQuery, [apartment_id, start_time, start_time, end_time, end_time, start_time, end_time], (err, conflictResults) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (conflictResults.length > 0) {
          return res.status(400).json({ error: 'Apartment is not available for the selected dates' });
        }

        // Create reservation
        const newReservation = {
          start_time,
          end_time,
          apartment_id,
          user_id,
          status: 'pending'
        };

        db.query('INSERT INTO reservations SET ?', newReservation, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error creating reservation' });
          }

          res.status(201).json({
            message: 'Reservation created successfully',
            reservation: {
              reservation_id: result.insertId,
              ...newReservation
            }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's own reservations (authenticated users only)
router.get('/my', userAuth, (req, res) => {
  const user_id = req.user.user_id;
  const { status, page = 1, limit = 10 } = req.query;

  console.log('Fetching reservations for user:', user_id);

  let query = `
    SELECT r.*, a.title, a.location, a.price
    FROM reservations r
    JOIN apartments a ON r.apartment_id = a.apartment_id
    WHERE r.user_id = ? AND r.is_deleted = FALSE
  `;
  const params = [user_id];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (page - 1) * limit);

  console.log('Executing reservations query:', query);
  console.log('With params:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error in reservations/my GET:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    console.log('Reservations query results:', results);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE user_id = ? AND is_deleted = FALSE';
    const countParams = [user_id];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    console.log('Executing count query:', countQuery);
    console.log('With count params:', countParams);

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Database error in reservations count:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      console.log('Reservations count result:', countResult);

      res.json({
        reservations: results,
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

// Get all reservations (admin only)
router.get('/', adminAuth, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  let query = `
    SELECT r.*, a.title, a.location, u.name as user_name, u.email as user_email
    FROM reservations r
    JOIN apartments a ON r.apartment_id = a.apartment_id
    JOIN users u ON r.user_id = u.user_id
    WHERE r.is_deleted = FALSE
  `;
  const params = [];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (page - 1) * limit);

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE is_deleted = FALSE';
    const countParams = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        reservations: results,
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

// Get single reservation by ID
router.get('/:id', auth, (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.user_id;
  const userRole = req.user.role;

  let query = `
    SELECT r.*, a.title, a.location, a.price, a.images, u.name as user_name, u.email as user_email
    FROM reservations r
    JOIN apartments a ON r.apartment_id = a.apartment_id
    JOIN users u ON r.user_id = u.user_id
    WHERE r.reservation_id = ? AND r.is_deleted = FALSE
  `;

  // If not admin, only show user's own reservations
  if (userRole !== 'admin') {
    query += ' AND r.user_id = ?';
    db.query(query, [reservationId, userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      res.json({ reservation: results[0] });
    });
  } else {
    db.query(query, [reservationId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      res.json({ reservation: results[0] });
    });
  }
});

// Cancel reservation (user can cancel their own, admin can cancel any)
router.put('/:id/cancel', auth, (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.user_id;
  const userRole = req.user.role;

  let query = 'UPDATE reservations SET status = ? WHERE reservation_id = ? AND is_deleted = FALSE';
  const params = ['cancelled', reservationId];

  // If not admin, only allow cancelling own reservations
  if (userRole !== 'admin') {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error cancelling reservation' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found or cannot be cancelled' });
    }

    res.json({ message: 'Reservation cancelled successfully' });
  });
});

// Update reservation status (admin only)
router.put('/:id/status', adminAuth, [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Valid status is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reservationId = req.params.id;
    const { status } = req.body;

    db.query('UPDATE reservations SET status = ? WHERE reservation_id = ? AND is_deleted = FALSE', [status, reservationId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating reservation status' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      res.json({ message: 'Reservation status updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete reservation (admin only)
router.delete('/:id', adminAuth, (req, res) => {
  const reservationId = req.params.id;

  db.query('UPDATE reservations SET is_deleted = TRUE WHERE reservation_id = ?', [reservationId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting reservation' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  });
});

module.exports = router; 