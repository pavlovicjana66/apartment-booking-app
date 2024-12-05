const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { userAuth } = require('../middleware/auth');

const router = express.Router();

// Submit rating and review (authenticated users only)
router.post('/', userAuth, [
  body('apartment_id').isInt().withMessage('Valid apartment ID is required'),
  body('reservation_id').isInt().withMessage('Valid reservation ID is required'),
  body('value').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apartment_id, reservation_id, value, comment } = req.body;
    const user_id = req.user.user_id;

    // Check if reservation exists and belongs to user
    db.query(`
      SELECT * FROM reservations 
      WHERE reservation_id = ? AND user_id = ? AND apartment_id = ? AND is_deleted = FALSE
    `, [reservation_id, user_id, apartment_id], (err, reservationResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (reservationResults.length === 0) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      const reservation = reservationResults[0];

      // Check if reservation is completed
      if (reservation.status !== 'completed') {
        return res.status(400).json({ error: 'Can only rate completed reservations' });
      }

      // Check if rating already exists
      db.query('SELECT * FROM ratings WHERE reservation_id = ?', [reservation_id], (err, ratingResults) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (ratingResults.length > 0) {
          return res.status(400).json({ error: 'Rating already exists for this reservation' });
        }

        // Create comment if provided
        let comment_id = null;
        if (comment) {
          const newComment = {
            text: comment,
            user_id,
            apartment_id
          };

          db.query('INSERT INTO comments SET ?', newComment, (err, commentResult) => {
            if (err) {
              return res.status(500).json({ error: 'Error creating comment' });
            }

            comment_id = commentResult.insertId;
            createRating();
          });
        } else {
          createRating();
        }

        function createRating() {
          const newRating = {
            value,
            comment_id,
            reservation_id,
            user_id,
            apartment_id
          };

          db.query('INSERT INTO ratings SET ?', newRating, (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Error creating rating' });
            }

            res.status(201).json({
              message: 'Rating submitted successfully',
              rating: {
                rating_id: result.insertId,
                ...newRating
              }
            });
          });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit direct rating and review (without reservation requirement)
router.post('/direct', userAuth, [
  body('apartment_id').isInt().withMessage('Valid apartment ID is required'),
  body('value').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment_text').optional().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { apartment_id, value, comment_text } = req.body;
    const user_id = req.user.user_id;

    // Check if user already rated this apartment
    db.query('SELECT * FROM ratings WHERE user_id = ? AND apartment_id = ?', [user_id, apartment_id], (err, existingRatings) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingRatings.length > 0) {
        return res.status(400).json({ error: 'You have already rated this apartment' });
      }

      // Create rating
      const newRating = {
        value,
        user_id,
        apartment_id,
        comment_text: comment_text || null
      };

      db.query('INSERT INTO ratings SET ?', newRating, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error creating rating' });
        }

        res.status(201).json({
          message: 'Rating submitted successfully',
          rating: {
            rating_id: result.insertId,
            ...newRating
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ratings for an apartment (public)
router.get('/apartment/:apartment_id', (req, res) => {
  const apartment_id = req.params.apartment_id;
  const { page = 1, limit = 10 } = req.query;

  const query = `
    SELECT r.*, u.name as user_name
    FROM ratings r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.apartment_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const params = [apartment_id, parseInt(limit), (page - 1) * limit];

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM ratings WHERE apartment_id = ?';
    db.query(countQuery, [apartment_id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        ratings: results,
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

// Get average rating for an apartment (public)
router.get('/apartment/:apartment_id/average', (req, res) => {
  const apartment_id = req.params.apartment_id;

  const query = `
    SELECT 
      AVG(value) as average_rating,
      COUNT(*) as total_ratings,
      COUNT(CASE WHEN value = 5 THEN 1 END) as five_star,
      COUNT(CASE WHEN value = 4 THEN 1 END) as four_star,
      COUNT(CASE WHEN value = 3 THEN 1 END) as three_star,
      COUNT(CASE WHEN value = 2 THEN 1 END) as two_star,
      COUNT(CASE WHEN value = 1 THEN 1 END) as one_star
    FROM ratings 
    WHERE apartment_id = ?
  `;

  db.query(query, [apartment_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const ratingStats = results[0];
    res.json({
      average_rating: parseFloat(ratingStats.average_rating || 0).toFixed(1),
      total_ratings: ratingStats.total_ratings,
      rating_distribution: {
        five_star: ratingStats.five_star,
        four_star: ratingStats.four_star,
        three_star: ratingStats.three_star,
        two_star: ratingStats.two_star,
        one_star: ratingStats.one_star
      }
    });
  });
});

// Get user's own ratings (authenticated users only)
router.get('/my', userAuth, (req, res) => {
  const user_id = req.user.user_id;
  const { page = 1, limit = 10 } = req.query;

  const query = `
    SELECT r.*, a.title, a.location
    FROM ratings r
    JOIN apartments a ON r.apartment_id = a.apartment_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const params = [user_id, parseInt(limit), (page - 1) * limit];

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM ratings WHERE user_id = ?';
    db.query(countQuery, [user_id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        ratings: results,
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

// Update rating (authenticated users only)
router.put('/:id', userAuth, [
  body('value').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ratingId = req.params.id;
    const { value, comment } = req.body;
    const user_id = req.user.user_id;

    // Check if rating exists and belongs to user
    db.query('SELECT * FROM ratings WHERE rating_id = ? AND user_id = ?', [ratingId, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Rating not found' });
      }

      const rating = results[0];

      // Update rating value
      db.query('UPDATE ratings SET value = ? WHERE rating_id = ?', [value, ratingId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating rating' });
        }

        // Update comment if provided
        if (comment && rating.comment_id) {
          db.query('UPDATE comments SET text = ? WHERE comment_id = ?', [comment, rating.comment_id], (err) => {
            if (err) {
              console.error('Error updating comment:', err);
            }
          });
        } else if (comment && !rating.comment_id) {
          // Create new comment
          const newComment = {
            text: comment,
            user_id,
            apartment_id: rating.apartment_id
          };

          db.query('INSERT INTO comments SET ?', newComment, (err, commentResult) => {
            if (err) {
              console.error('Error creating comment:', err);
            } else {
              // Update rating with comment_id
              db.query('UPDATE ratings SET comment_id = ? WHERE rating_id = ?', [commentResult.insertId, ratingId]);
            }
          });
        }

        res.json({ message: 'Rating updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete rating (authenticated users only)
router.delete('/:id', userAuth, (req, res) => {
  const ratingId = req.params.id;
  const user_id = req.user.user_id;

  // Check if rating exists and belongs to user
  db.query('SELECT * FROM ratings WHERE rating_id = ? AND user_id = ?', [ratingId, user_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const rating = results[0];

    // Delete rating
    db.query('DELETE FROM ratings WHERE rating_id = ?', [ratingId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting rating' });
      }

      // Delete associated comment if exists
      if (rating.comment_id) {
        db.query('DELETE FROM comments WHERE comment_id = ?', [rating.comment_id], (err) => {
          if (err) {
            console.error('Error deleting comment:', err);
          }
        });
      }

      res.json({ message: 'Rating deleted successfully' });
    });
  });
});

module.exports = router; 