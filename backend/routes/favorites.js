const express = require('express');
const db = require('../config/database');
const { userAuth } = require('../middleware/auth');

const router = express.Router();

// Add apartment to favorites (authenticated users only)
router.post('/', userAuth, (req, res) => {
  const { apartment_id } = req.body;
  const user_id = req.user.user_id;

  if (!apartment_id) {
    return res.status(400).json({ error: 'Apartment ID is required' });
  }

  // Check if apartment exists
  db.query('SELECT * FROM apartments WHERE apartment_id = ? AND is_deleted = FALSE', [apartment_id], (err, apartmentResults) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (apartmentResults.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    // Check if already in favorites
    db.query('SELECT * FROM favorites WHERE user_id = ? AND apartment_id = ?', [user_id, apartment_id], (err, favoriteResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (favoriteResults.length > 0) {
        return res.status(400).json({ error: 'Apartment is already in favorites' });
      }

      // Add to favorites
      const newFavorite = {
        user_id,
        apartment_id
      };

      db.query('INSERT INTO favorites SET ?', newFavorite, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error adding to favorites' });
        }

        res.status(201).json({
          message: 'Apartment added to favorites successfully',
          favorite: {
            favorite_id: result.insertId,
            ...newFavorite
          }
        });
      });
    });
  });
});

// Remove apartment from favorites (authenticated users only)
router.delete('/:apartment_id', userAuth, (req, res) => {
  const apartment_id = req.params.apartment_id;
  const user_id = req.user.user_id;

  db.query('DELETE FROM favorites WHERE user_id = ? AND apartment_id = ?', [user_id, apartment_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error removing from favorites' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Apartment not found in favorites' });
    }

    res.json({ message: 'Apartment removed from favorites successfully' });
  });
});

// Get user's favorite apartments (authenticated users only)
router.get('/', userAuth, (req, res) => {
  const user_id = req.user.user_id;
  const { page = 1, limit = 10 } = req.query;

  console.log('Fetching favorites for user:', user_id);

  const query = `
    SELECT f.*, a.title, a.description, a.price, a.location, a.capacity, a.amenities,
           COALESCE(rating_stats.average_rating, 0) as average_rating,
           COALESCE(rating_stats.review_count, 0) as review_count
    FROM favorites f
    JOIN apartments a ON f.apartment_id = a.apartment_id
    LEFT JOIN (
      SELECT apartment_id, 
             AVG(value) as average_rating,
             COUNT(rating_id) as review_count
      FROM ratings 
      GROUP BY apartment_id
    ) rating_stats ON a.apartment_id = rating_stats.apartment_id
    WHERE f.user_id = ? AND a.is_deleted = FALSE
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const params = [user_id, parseInt(limit), (page - 1) * limit];

  console.log('Executing query:', query);
  console.log('With params:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error in favorites GET:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    console.log('Favorites query results:', results);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT f.favorite_id) as total 
      FROM favorites f
      JOIN apartments a ON f.apartment_id = a.apartment_id
      WHERE f.user_id = ? AND a.is_deleted = FALSE
    `;

    db.query(countQuery, [user_id], (err, countResult) => {
      if (err) {
        console.error('Database error in favorites count:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      console.log('Favorites count result:', countResult);

      res.json({
        favorites: results,
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

// Check if apartment is in user's favorites (authenticated users only)
router.get('/check/:apartment_id', userAuth, (req, res) => {
  const apartment_id = req.params.apartment_id;
  const user_id = req.user.user_id;

  db.query('SELECT * FROM favorites WHERE user_id = ? AND apartment_id = ?', [user_id, apartment_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ 
      isFavorite: results.length > 0,
      favorite_id: results.length > 0 ? results[0].favorite_id : null
    });
  });
});

module.exports = router; 