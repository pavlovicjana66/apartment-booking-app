const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth, userAuth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Process payment for a reservation (authenticated users only)
router.post('/', userAuth, [
  body('reservation_id').isInt().withMessage('Valid reservation ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reservation_id, amount, payment_method } = req.body;
    const user_id = req.user.user_id;

    // Check if reservation exists and belongs to user
    db.query(`
      SELECT r.*, a.apartment_id, a.price 
      FROM reservations r 
      JOIN apartments a ON r.apartment_id = a.apartment_id 
      WHERE r.reservation_id = ? AND r.user_id = ? AND r.is_deleted = FALSE
    `, [reservation_id, user_id], (err, reservationResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (reservationResults.length === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      const reservation = reservationResults[0];

      // Check if payment already exists
      db.query('SELECT * FROM payments WHERE reservation_id = ?', [reservation_id], (err, paymentResults) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (paymentResults.length > 0) {
          return res.status(400).json({ error: 'Payment already exists for this reservation' });
        }

        // Mock payment processing
        const paymentStatus = Math.random() > 0.1 ? 'completed' : 'failed'; // 90% success rate

        const newPayment = {
          amount,
          user_id,
          apartment_id: reservation.apartment_id,
          reservation_id,
          status: paymentStatus,
          payment_method
        };

        db.query('INSERT INTO payments SET ?', newPayment, (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error processing payment' });
          }

          // Update reservation status if payment is successful
          if (paymentStatus === 'completed') {
            db.query('UPDATE reservations SET status = ? WHERE reservation_id = ?', ['confirmed', reservation_id], (err) => {
              if (err) {
                console.error('Error updating reservation status:', err);
              }
            });
          }

          res.status(201).json({
            message: paymentStatus === 'completed' ? 'Payment processed successfully' : 'Payment failed',
            payment: {
              payment_id: result.insertId,
              ...newPayment
            }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Simplified payment process (for confirmed reservations)
router.post('/process', userAuth, [
  body('reservation_id').isInt().withMessage('Valid reservation ID is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reservation_id } = req.body;
    const user_id = req.user.user_id;

    console.log('Processing payment for reservation:', reservation_id, 'user:', user_id);

    // Check if reservation exists, belongs to user, and is confirmed or pending
    db.query(`
      SELECT r.*, a.apartment_id, a.price 
      FROM reservations r 
      JOIN apartments a ON r.apartment_id = a.apartment_id 
      WHERE r.reservation_id = ? AND r.user_id = ? AND r.status IN ('confirmed', 'pending') AND r.is_deleted = FALSE
    `, [reservation_id, user_id], (err, reservationResults) => {
      if (err) {
        console.error('Database error in payment process:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('Reservation query results:', reservationResults);

      if (reservationResults.length === 0) {
        console.log('No valid reservation found for user');
        return res.status(404).json({ error: 'Valid reservation not found' });
      }

      const reservation = reservationResults[0];
      console.log('Found reservation:', reservation);

      // Check if payment already exists
      db.query('SELECT * FROM payments WHERE reservation_id = ?', [reservation_id], (err, paymentResults) => {
        if (err) {
          console.error('Database error checking existing payments:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        console.log('Existing payments:', paymentResults);

        if (paymentResults.length > 0) {
          return res.status(400).json({ error: 'Payment already exists for this reservation' });
        }

        // Mock payment processing (simplified)
        const paymentStatus = 'completed'; // Always successful for demo

        const newPayment = {
          amount: reservation.price,
          user_id,
          apartment_id: reservation.apartment_id,
          reservation_id,
          status: paymentStatus,
          payment_method: 'credit_card'
        };

        console.log('Creating new payment:', newPayment);

        db.query('INSERT INTO payments SET ?', newPayment, (err, result) => {
          if (err) {
            console.error('Error inserting payment:', err);
            return res.status(500).json({ error: 'Error processing payment' });
          }

          console.log('Payment created successfully:', result.insertId);

          res.status(201).json({
            message: 'Payment processed successfully',
            payment: {
              payment_id: result.insertId,
              ...newPayment
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in payment process:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's payment history (authenticated users only)
router.get('/my', userAuth, (req, res) => {
  const user_id = req.user.user_id;
  const { status, page = 1, limit = 10 } = req.query;

  let query = `
    SELECT p.*, r.start_time, r.end_time, r.apartment_id
    FROM payments p
    JOIN reservations r ON p.reservation_id = r.reservation_id
    WHERE p.user_id = ?
  `;
  const params = [user_id];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (page - 1) * limit);

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM payments WHERE user_id = ?';
    const countParams = [user_id];

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
        payments: results,
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

// Get all payments (admin only)
router.get('/', adminAuth, (req, res) => {
  try {
    console.log('Fetching payments for admin dashboard...');
    console.log('User making request:', req.user);
    
    db.query(`
      SELECT p.*, u.name as user_name, r.apartment_id, r.start_time, r.end_time
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.reservation_id
      JOIN users u ON r.user_id = u.user_id
      ORDER BY p.created_at DESC
    `, (err, results) => {
      if (err) {
        console.error('Error fetching payments:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      console.log('Payments fetched successfully:', results.length, 'payments');
      res.json({ payments: results });
    });
  } catch (error) {
    console.error('Error in payments GET:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get single payment by ID
router.get('/:id', auth, (req, res) => {
  const paymentId = req.params.id;
  const userId = req.user.user_id;
  const userRole = req.user.role;

  let query = `
    SELECT p.*, a.title, a.location, u.name as user_name, u.email as user_email, r.start_time, r.end_time
    FROM payments p
    JOIN apartments a ON p.apartment_id = a.apartment_id
    JOIN users u ON p.user_id = u.user_id
    JOIN reservations r ON p.reservation_id = r.reservation_id
    WHERE p.payment_id = ?
  `;

  // If not admin, only show user's own payments
  if (userRole !== 'admin') {
    query += ' AND p.user_id = ?';
    db.query(query, [paymentId, userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json({ payment: results[0] });
    });
  } else {
    db.query(query, [paymentId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json({ payment: results[0] });
    });
  }
});

// Refund payment (admin only)
router.put('/:id/refund', adminAuth, (req, res) => {
  const paymentId = req.params.id;

  db.query('UPDATE payments SET status = ? WHERE payment_id = ?', ['refunded', paymentId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error processing refund' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Payment refunded successfully' });
  });
});

module.exports = router; 