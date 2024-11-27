const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all apartments (public - no auth required)
router.get('/', (req, res) => {
  const { 
    category, 
    location, 
    minPrice, 
    maxPrice, 
    capacity,
    search,
    page = 1,
    limit = 10
  } = req.query;

  // Build the main query with JOIN for ratings
  let query = `
    SELECT a.*, 
           COALESCE(rating_stats.average_rating, 0) as average_rating,
           COALESCE(rating_stats.review_count, 0) as review_count
    FROM apartments a
    LEFT JOIN (
      SELECT apartment_id, 
             AVG(value) as average_rating,
             COUNT(rating_id) as review_count
      FROM ratings 
      GROUP BY apartment_id
    ) rating_stats ON a.apartment_id = rating_stats.apartment_id
    WHERE a.is_deleted = FALSE
  `;
  const params = [];

  if (category) {
    query += ' AND a.category = ?';
    params.push(category);
  }

  if (location) {
    query += ' AND a.location LIKE ?';
    params.push(`%${location}%`);
  }

  if (minPrice) {
    query += ' AND a.price >= ?';
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ' AND a.price <= ?';
    params.push(maxPrice);
  }

  if (capacity) {
    query += ' AND a.capacity >= ?';
    params.push(capacity);
  }

  if (search) {
    query += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Add pagination
  const offset = (page - 1) * limit;
  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(DISTINCT a.apartment_id) as total FROM apartments a WHERE a.is_deleted = FALSE';
    const countParams = [];

    if (category) {
      countQuery += ' AND a.category = ?';
      countParams.push(category);
    }

    if (location) {
      countQuery += ' AND a.location LIKE ?';
      countParams.push(`%${location}%`);
    }

    if (minPrice) {
      countQuery += ' AND a.price >= ?';
      countParams.push(minPrice);
    }

    if (maxPrice) {
      countQuery += ' AND a.price <= ?';
      countParams.push(maxPrice);
    }

    if (capacity) {
      countQuery += ' AND a.capacity >= ?';
      countParams.push(capacity);
    }

    if (search) {
      countQuery += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        apartments: results,
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

// Get single apartment by ID (public)
router.get('/:id', (req, res) => {
  const apartmentId = req.params.id;

  const query = `
    SELECT a.*, 
           COALESCE(rating_stats.average_rating, 0) as average_rating,
           COALESCE(rating_stats.review_count, 0) as review_count
    FROM apartments a
    LEFT JOIN (
      SELECT apartment_id, 
             AVG(value) as average_rating,
             COUNT(rating_id) as review_count
      FROM ratings 
      WHERE apartment_id = ?
      GROUP BY apartment_id
    ) rating_stats ON a.apartment_id = rating_stats.apartment_id
    WHERE a.apartment_id = ? AND a.is_deleted = FALSE
  `;

  db.query(query, [apartmentId, apartmentId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    res.json({ apartment: results[0] });
  });
});

// Create new apartment (admin only)
router.post('/', adminAuth, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Valid capacity is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      price,
      category,
      location,
      capacity,
      amenities,
      images
    } = req.body;

    const newApartment = {
      title,
      description,
      price,
      category,
      location,
      capacity,
      amenities: amenities || '',
      images: images || '',
      user_id: req.user.user_id
    };

    db.query('INSERT INTO apartments SET ?', newApartment, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error creating apartment' });
      }

      res.status(201).json({
        message: 'Apartment created successfully',
        apartment: {
          apartment_id: result.insertId,
          ...newApartment
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update apartment (admin only)
router.put('/:id', adminAuth, [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Valid capacity is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const apartmentId = req.params.id;
    const updateData = req.body;

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    db.query('UPDATE apartments SET ? WHERE apartment_id = ? AND is_deleted = FALSE', [updateData, apartmentId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating apartment' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Apartment not found' });
      }

      res.json({ message: 'Apartment updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete apartment (admin only)
router.delete('/:id', adminAuth, (req, res) => {
  const apartmentId = req.params.id;

  db.query('UPDATE apartments SET is_deleted = TRUE WHERE apartment_id = ?', [apartmentId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting apartment' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    res.json({ message: 'Apartment deleted successfully' });
  });
});

// Get apartment categories (public)
router.get('/categories/list', (req, res) => {
  db.query('SELECT DISTINCT category FROM apartments WHERE is_deleted = FALSE AND category IS NOT NULL', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const categories = results.map(row => row.category);
    res.json({ categories });
  });
});

// Get apartment locations (public)
router.get('/locations/list', (req, res) => {
  db.query('SELECT DISTINCT location FROM apartments WHERE is_deleted = FALSE AND location IS NOT NULL', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const locations = results.map(row => row.location);
    res.json({ locations });
  });
});

module.exports = router; 