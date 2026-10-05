-- ==========================================================
-- PLAGICHECK - ACADEMIC PLAGIARISM DETECTION SYSTEM
-- MySQL Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS plagicheck_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plagicheck_db;

-- ----------------------------------------------------------
-- Table 1: users
-- Stores registered students, educators, and researchers
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Student',
  institution VARCHAR(255) DEFAULT 'Academic Institution',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table 2: analyses
-- Stores submitted text plagiarism analysis records
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Document',
  submitted_text LONGTEXT NOT NULL,
  word_count INT NOT NULL DEFAULT 0,
  character_count INT NOT NULL DEFAULT 0,
  sentence_count INT NOT NULL DEFAULT 0,
  similarity_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  originality_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  ai_probability_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  risk_level ENUM('LOW', 'MODERATE', 'HIGH') NOT NULL DEFAULT 'LOW',
  processing_time_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_analyses_user (user_id),
  INDEX idx_analyses_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table 3: analysis_sources
-- Stores matching reference sources (Wikipedia, Academic corpus)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(512) NOT NULL,
  matched_text TEXT NOT NULL,
  match_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  matched_phrases_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
  INDEX idx_sources_analysis (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table 4: reports
-- Stores generated detailed plagiarism reports & metadata
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT NOT NULL,
  report_code VARCHAR(64) NOT NULL UNIQUE,
  report_data JSON NOT NULL,
  summary_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
  INDEX idx_reports_analysis (analysis_id),
  INDEX idx_reports_code (report_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Initial Seed Data (Demo Academic Account)
-- Password for demo is "plagicheck123" (SHA-256 hashed)
-- ----------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, institution)
VALUES (
  1,
  'Dr. Alex Morgan',
  'alex.morgan@university.edu',
  '9f835438e442b19f4b322d53372ec64ae347a518e699be4f4910b64e5b58140b',
  'Faculty / Researcher',
  'Department of Computer Science & Engineering'
) ON DUPLICATE KEY UPDATE name=name;
