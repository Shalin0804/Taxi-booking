-- Runs on every boot (idempotent). Compatible with MySQL 8 and TiDB Cloud.
-- Customers and staff share one users table; `role` separates them.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('CUSTOMER', 'SUPPORT_STAFF', 'FLEET_MANAGER', 'BOOKING_MANAGER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Server-side sessions so logout and "sign out everywhere" really end access.
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(32) PRIMARY KEY,
  user_id INT NOT NULL,
  kind ENUM('customer', 'admin') NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_s_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Single-use, expiring reset tokens. Only a SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40),
  entity_id VARCHAR(40),
  details TEXT,
  ip VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_a_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(60) NOT NULL,
  model VARCHAR(120) NOT NULL,
  registration VARCHAR(30) NOT NULL UNIQUE,
  seats INT,
  luggage INT,
  status ENUM('active', 'maintenance', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  license_no VARCHAR(40),
  status ENUM('available', 'on_trip', 'off_duty', 'inactive') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_type VARCHAR(60) NOT NULL,
  vehicle_category VARCHAR(60) NOT NULL,
  base_fare DECIMAL(10, 2) NOT NULL DEFAULT 0,
  per_km DECIMAL(10, 2),
  per_hour DECIMAL(10, 2),
  notes VARCHAR(255),
  active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_pricing (trip_type, vehicle_category)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(16) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  trip_type VARCHAR(60) NOT NULL,
  pickup VARCHAR(255) NOT NULL,
  dropoff VARCHAR(255),
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  return_date DATE NULL,
  vehicle_pref VARCHAR(60),
  passengers VARCHAR(5),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190),
  notes TEXT,
  status ENUM('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  cancel_requested_at DATETIME NULL,
  driver_id INT NULL,
  vehicle_id INT NULL,
  fare DECIMAL(10, 2) NULL,
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bookings_status (status),
  KEY idx_bookings_user (user_id),
  CONSTRAINT fk_b_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_b_driver FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE SET NULL,
  CONSTRAINT fk_b_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('contact', 'corporate') NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  company VARCHAR(160),
  subject VARCHAR(120),
  employees VARCHAR(20),
  message TEXT NOT NULL,
  status ENUM('new', 'in_progress', 'closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
