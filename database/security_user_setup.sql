-- ==========================================================
-- PLAGICHECK - DATABASE SECURITY ARCHITECTURE & ACCESS CONTROL
-- Script: security_user_setup.sql
-- Description: Creates a dedicated least-privilege database user
--              for the PlagiCheck Python Flask backend.
--
-- Security Controls:
-- 1. Principle of Least Privilege: Only DML (SELECT, INSERT, UPDATE, DELETE).
-- 2. No DDL Privileges: Application cannot DROP, ALTER, CREATE, or TRUNCATE.
-- 3. No Administrative Privileges: No GRANT, SUPER, FILE, PROCESS, RELOAD, SHUTDOWN.
-- 4. Host Restriction: Limited to 127.0.0.1 / localhost (no public internet exposure).
-- 5. Connection limits: Prevents connection flooding DoS attacks.
-- ==========================================================

-- Step 1: Ensure database exists
CREATE DATABASE IF NOT EXISTS plagicheck_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plagicheck_db;

-- Step 2: Create application user with strong authentication plugin (caching_sha2_password)
-- NOTE: Replace '${SECURE_DB_PASSWORD}' with the high-entropy secret from your production .env!
CREATE USER IF NOT EXISTS 'plagicheck_app'@'localhost'
  IDENTIFIED WITH caching_sha2_password BY 'ChangeThisToASecureRandomStringInProduction2026!';

CREATE USER IF NOT EXISTS 'plagicheck_app'@'127.0.0.1'
  IDENTIFIED WITH caching_sha2_password BY 'ChangeThisToASecureRandomStringInProduction2026!';

-- Step 3: Revoke all default/global privileges to guarantee clean state
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'plagicheck_app'@'localhost';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'plagicheck_app'@'127.0.0.1';

-- Step 4: Grant ONLY required Data Manipulation Language (DML) privileges
-- The application only needs to read and write records, NEVER modify schema or drop tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON plagicheck_db.* TO 'plagicheck_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON plagicheck_db.* TO 'plagicheck_app'@'127.0.0.1';

-- Step 5: Enforce connection limits and resource quotas (Anti-DoS)
ALTER USER 'plagicheck_app'@'localhost' WITH
  MAX_QUERIES_PER_HOUR 100000
  MAX_UPDATES_PER_HOUR 50000
  MAX_CONNECTIONS_PER_HOUR 10000
  MAX_USER_CONNECTIONS 50;

ALTER USER 'plagicheck_app'@'127.0.0.1' WITH
  MAX_QUERIES_PER_HOUR 100000
  MAX_UPDATES_PER_HOUR 50000
  MAX_CONNECTIONS_PER_HOUR 10000
  MAX_USER_CONNECTIONS 50;

-- Step 6: For Production environments requiring TLS/SSL encryption:
-- UNCOMMENT the following lines when deploying with server SSL certificates:
-- ALTER USER 'plagicheck_app'@'localhost' REQUIRE SSL;
-- ALTER USER 'plagicheck_app'@'127.0.0.1' REQUIRE SSL;

-- Step 7: Flush privileges to activate immediately
FLUSH PRIVILEGES;

-- Verification Query: Check assigned permissions
SHOW GRANTS FOR 'plagicheck_app'@'localhost';

