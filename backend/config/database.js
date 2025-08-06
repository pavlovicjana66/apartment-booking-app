const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apartment_booking',
  charset: 'utf8mb4',
  timezone: 'UTC',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL:', err);
        reject(err);
        return;
      }

      console.log('Connected to MySQL database');

      // First, drop all existing tables to avoid duplicates
      const dropTables = [
        'DROP TABLE IF EXISTS ratings',
        'DROP TABLE IF EXISTS comments',
        'DROP TABLE IF EXISTS favorites',
        'DROP TABLE IF EXISTS payments',
        'DROP TABLE IF EXISTS reservations',
        'DROP TABLE IF EXISTS apartments',
        'DROP TABLE IF EXISTS users'
      ];

      // Execute drop statements
      dropTables.forEach((dropQuery, index) => {
        connection.query(dropQuery, (err) => {
          if (err) {
            console.error(`Error dropping table ${index + 1}:`, err);
          } else {
            console.log(`Dropped table ${index + 1}`);
          }
        });
      });

      // Wait a bit for drops to complete, then create tables
      setTimeout(() => {
        createTables();
      }, 1000);
    });
  });
};

const createTables = () => {
  // Create users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE
    )
  `;

  connection.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Table 1 created successfully');
    }
  });

  // Create apartments table
  const createApartmentsTable = `
    CREATE TABLE IF NOT EXISTS apartments (
      apartment_id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      location VARCHAR(200),
      price DECIMAL(10,2) NOT NULL,
      capacity INT DEFAULT 1,
      amenities TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE
    )
  `;

  connection.query(createApartmentsTable, (err) => {
    if (err) {
      console.error('Error creating apartments table:', err);
    } else {
      console.log('Table 2 created successfully');
    }
  });

  // Create reservations table
  const createReservationsTable = `
    CREATE TABLE IF NOT EXISTS reservations (
      reservation_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      apartment_id INT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
    )
  `;

  connection.query(createReservationsTable, (err) => {
    if (err) {
      console.error('Error creating reservations table:', err);
    } else {
      console.log('Table 3 created successfully');
    }
  });

  // Create payments table
  const createPaymentsTable = `
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INT PRIMARY KEY AUTO_INCREMENT,
      reservation_id INT,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50),
      status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
    )
  `;

  connection.query(createPaymentsTable, (err) => {
    if (err) {
      console.error('Error creating payments table:', err);
    } else {
      console.log('Table 4 created successfully');
    }
  });

  // Create ratings table
  const createRatingsTable = `
    CREATE TABLE IF NOT EXISTS ratings (
      rating_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      apartment_id INT,
      value INT NOT NULL CHECK (value >= 1 AND value <= 5),
      comment_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
    )
  `;

  connection.query(createRatingsTable, (err) => {
    if (err) {
      console.error('Error creating ratings table:', err);
    } else {
      console.log('Table 5 created successfully');
    }
  });

  // Create comments table
  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      comment_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      apartment_id INT,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id)
    )
  `;

  connection.query(createCommentsTable, (err) => {
    if (err) {
      console.error('Error creating comments table:', err);
    } else {
      console.log('Table 6 created successfully');
    }
  });

  // Create favorites table
  const createFavoritesTable = `
    CREATE TABLE IF NOT EXISTS favorites (
      favorite_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      apartment_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (apartment_id) REFERENCES apartments(apartment_id),
      UNIQUE KEY unique_user_apartment (user_id, apartment_id),
      INDEX idx_user_id (user_id),
      INDEX idx_apartment_id (apartment_id)
    )
  `;

  connection.query(createFavoritesTable, (err) => {
    if (err) {
      console.error('Error creating favorites table:', err);
    } else {
      console.log('Table 7 created successfully');
    }
  });

  // Add indexes to existing tables for better performance
  const addIndexes = () => {
    // Indexes for reservations table
    connection.query('CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id)', (err) => {
      if (err) console.error('Error creating reservations user_id index:', err);
    });
    connection.query('CREATE INDEX IF NOT EXISTS idx_reservations_apartment_id ON reservations(apartment_id)', (err) => {
      if (err) console.error('Error creating reservations apartment_id index:', err);
    });
    connection.query('CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)', (err) => {
      if (err) console.error('Error creating reservations status index:', err);
    });

    // Indexes for ratings table
    connection.query('CREATE INDEX IF NOT EXISTS idx_ratings_apartment_id ON ratings(apartment_id)', (err) => {
      if (err) console.error('Error creating ratings apartment_id index:', err);
    });
    connection.query('CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id)', (err) => {
      if (err) console.error('Error creating ratings user_id index:', err);
    });

    // Indexes for payments table
    connection.query('CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id)', (err) => {
      if (err) console.error('Error creating payments reservation_id index:', err);
    });
    connection.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)', (err) => {
      if (err) console.error('Error creating payments user_id index:', err);
    });

    // Indexes for apartments table
    connection.query('CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments(location)', (err) => {
      if (err) console.error('Error creating apartments location index:', err);
    });
    connection.query('CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments(price)', (err) => {
      if (err) console.error('Error creating apartments price index:', err);
    });
  };

  // Call addIndexes after all tables are created
  setTimeout(addIndexes, 2000);

  // Insert sample data after tables are created
  setTimeout(() => {
    insertSampleData();
  }, 2000);
};

const insertSampleData = () => {
  // Sample admin user
  const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // hashed password
    role: 'admin'
  };
  
  connection.query('INSERT IGNORE INTO users SET ?', adminUser, (err) => {
    if (err) {
      console.error('Error inserting admin user:', err);
    } else {
      console.log('Sample admin user created');
    }
  });

  // Sample regular user
  const regularUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // hashed password
    role: 'user'
  };
  
  connection.query('INSERT IGNORE INTO users SET ?', regularUser, (err) => {
    if (err) {
      console.error('Error inserting regular user:', err);
    } else {
      console.log('Sample regular user created');
    }
  });

  // Sample regular user 2
  const regularUser2 = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // hashed password
    role: 'user'
  };
  
  connection.query('INSERT IGNORE INTO users SET ?', regularUser2, (err) => {
    if (err) {
      console.error('Error inserting regular user 2:', err);
    } else {
      console.log('Sample regular user 2 created');
    }
  });
  
  // Sample apartments
  const sampleApartments = [
    {
      title: 'Luxury Downtown Apartment',
      description: 'Beautiful apartment in the heart of the city with amazing views.',
      location: 'Downtown',
      price: 150.00,
      capacity: 4,
      amenities: 'WiFi, Kitchen, Parking, Pool'
    },
    {
      title: 'Cozy Weekend Getaway',
      description: 'Perfect for a relaxing weekend away from the city.',
      location: 'Suburbs',
      price: 80.00,
      capacity: 2,
      amenities: 'WiFi, Kitchen, Garden'
    },
    {
      title: 'Modern Studio Apartment',
      description: 'Contemporary studio with all modern amenities.',
      location: 'City Center',
      price: 120.00,
      capacity: 2,
      amenities: 'WiFi, Kitchen, Gym, Balcony'
    }
  ];

  sampleApartments.forEach((apartment, index) => {
    connection.query('INSERT IGNORE INTO apartments SET ?', apartment, (err) => {
      if (err) {
        console.error(`Error inserting apartment ${index + 1}:`, err);
      } else {
        console.log(`Sample apartment ${index + 1} created`);
      }
    });
  });

  // Sample reservation
  setTimeout(() => {
    const sampleReservations = [
      {
        start_time: '2025-05-15 14:00:00', // Fixed date: May 15, 2025
        end_time: '2025-05-18 11:00:00',   // Fixed date: May 18, 2025
        apartment_id: 1,
        user_id: 1,
        status: 'pending'
      },
      {
        start_time: '2025-05-20 15:00:00', // Fixed date: May 20, 2025
        end_time: '2025-05-23 10:00:00',   // Fixed date: May 23, 2025
        apartment_id: 2,
        user_id: 2,
        status: 'confirmed'
      },
      {
        start_time: '2025-07-10 16:00:00', // Fixed date: July 10, 2025
        end_time: '2025-07-13 12:00:00',   // Fixed date: July 13, 2025
        apartment_id: 3,
        user_id: 2,
        status: 'pending'
      },
      {
        start_time: '2025-07-25 13:00:00', // Fixed date: July 25, 2025
        end_time: '2025-07-28 11:00:00',   // Fixed date: July 28, 2025
        apartment_id: 1,
        user_id: 2,
        status: 'completed'
      },
      {
        start_time: '2025-06-05 12:00:00', // Fixed date: June 5, 2025
        end_time: '2025-06-08 10:00:00',   // Fixed date: June 8, 2025
        apartment_id: 3,
        user_id: 1,
        status: 'cancelled'
      }
    ];
    
    sampleReservations.forEach((reservation, index) => {
      connection.query('INSERT IGNORE INTO reservations SET ?', reservation, (err) => {
        if (err) {
          console.error(`Error inserting sample reservation ${index + 1}:`, err);
        } else {
          console.log(`Sample reservation ${index + 1} created`);
        }
      });
    });
  }, 3000); // Wait for apartments to be created

  // Sample reviews/ratings
  setTimeout(() => {
    const sampleReviews = [
      {
        user_id: 1,
        apartment_id: 1,
        value: 5,
        comment_text: 'Amazing apartment with great views! The location is perfect and everything was clean and modern. Highly recommended!'
      },
      {
        user_id: 2,
        apartment_id: 1,
        value: 4,
        comment_text: 'Very nice apartment, good amenities. The only downside was the noise from the street, but overall great experience.'
      },
      {
        user_id: 1,
        apartment_id: 2,
        value: 5,
        comment_text: 'Perfect weekend getaway! Cozy and peaceful location. The garden was beautiful and the apartment had everything we needed.'
      },
      {
        user_id: 2,
        apartment_id: 2,
        value: 4,
        comment_text: 'Great value for money. Clean and comfortable. The kitchen was well equipped and the location was convenient.'
      },
      {
        user_id: 1,
        apartment_id: 3,
        value: 4,
        comment_text: 'Modern studio with excellent amenities. The gym access was a bonus. Perfect for business travelers.'
      },
      {
        user_id: 2,
        apartment_id: 3,
        value: 5,
        comment_text: 'Outstanding modern apartment! The balcony view was incredible and the facilities were top-notch. Will definitely return!'
      }
    ];

    sampleReviews.forEach((review, index) => {
      connection.query('INSERT IGNORE INTO ratings SET ?', review, (err) => {
        if (err) {
          console.error(`Error inserting review ${index + 1}:`, err);
        } else {
          console.log(`Sample review ${index + 1} created`);
        }
      });
    });
  }, 4000); // Wait for users and apartments to be created

  // Sample payment for completed reservation
  setTimeout(() => {
    const samplePayment = {
      reservation_id: 4, // This corresponds to the completed reservation (July 25-28, 2025)
      amount: 150.00,    // Price of Luxury Downtown Apartment
      payment_method: 'credit_card',
      status: 'completed'
    };

    connection.query('INSERT IGNORE INTO payments SET ?', samplePayment, (err) => {
      if (err) {
        console.error('Error inserting sample payment:', err);
      } else {
        console.log('Sample payment created');
      }
    });
  }, 5000); // Wait for reservations to be created
};

module.exports = {
  connection: () => {
    return connection.promise();
  },
  query: (sql, values, callback) => {
    // Check if connection is established
    if (!connection) {
      const error = new Error('Database connection not established');
      if (callback) {
        return callback(error);
      }
      throw error;
    }
    
    // Check connection state
    if (connection.state === 'disconnected') {
      const error = new Error('Database connection is disconnected');
      if (callback) {
        return callback(error);
      }
      throw error;
    }
    
    return connection.query(sql, values, callback);
  },
  initializeDatabase
}; 