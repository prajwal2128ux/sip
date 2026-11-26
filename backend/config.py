"""
PlagiCheck Security Hardening - Backend Configuration Module
Centralized, hardened configuration management for Flask, SQLAlchemy, JWT, and Security Services.
Strictly adheres to OWASP ASVS guidelines for secret management and secure defaults.
"""

import os
import secrets
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from root or backend .env
basedir = os.path.abspath(os.path.dirname(__file__))
root_dir = os.path.abspath(os.path.join(basedir, '..'))
env_path = os.path.join(root_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv(os.path.join(basedir, '.env'))


class Config:
    """Base hardened configuration."""
    
    # Environment & Debugging (Debug strictly disabled in production)
    ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = os.getenv('FLASK_DEBUG', '0').lower() in ('true', '1', 't')
    TESTING = False

    # Cryptographic Secrets
    # Loaded strictly from environment variables; ephemeral cryptographically random key if unset
    SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_hex(32)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY') or secrets.token_hex(32)

    # Database Configuration (MySQL Primary, SQLAlchemy ORM)
    DB_USER = os.getenv('DB_USER', 'plagicheck_app')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_NAME = os.getenv('DB_NAME', 'plagicheck_db')
    
    # Custom DATABASE_URL takes highest priority if provided
    custom_db_url = os.getenv('DATABASE_URL')
    if custom_db_url:
        SQLALCHEMY_DATABASE_URI = custom_db_url
    elif DB_PASSWORD:
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
        )
    else:
        # Graceful development fallback: Local isolated SQLite database
        dev_db_dir = os.path.join(basedir, 'storage')
        os.makedirs(dev_db_dir, exist_ok=True)
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(dev_db_dir, 'plagicheck_dev.db')}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Hardened Connection Pool Settings (Prevents connection starvation DoS)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '1800')),
    }
    if not SQLALCHEMY_DATABASE_URI.startswith('sqlite'):
        SQLALCHEMY_ENGINE_OPTIONS.update({
            'pool_size': int(os.getenv('DB_POOL_SIZE', '10')),
            'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '20')),
            'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
        })

    # JWT Authentication & Cookie Security
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_EXPIRY_MINUTES', '120')))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '7')))
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # Cookie Hardening Flags
    JWT_COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() in ('true', '1')
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_ACCESS_COOKIE_NAME = 'plagicheck_access_token'
    JWT_REFRESH_COOKIE_NAME = 'plagicheck_refresh_token'

    # Argon2id Hashing Parameters (Compliant with OWASP Password Storage Cheat Sheet)
    ARGON2_TIME_COST = int(os.getenv('ARGON2_TIME_COST', '3'))
    ARGON2_MEMORY_COST = int(os.getenv('ARGON2_MEMORY_COST', '65536'))  # 64 MB
    ARGON2_PARALLELISM = int(os.getenv('ARGON2_PARALLELISM', '4'))
    ARGON2_HASH_LEN = 32
    ARGON2_SALT_LEN = 16

    # File Upload Security Controls
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_UPLOAD_SIZE', str(25 * 1024 * 1024)))  # 25 MB max request
    MAX_DOCUMENT_WORDS = 10000
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}
    UPLOAD_FOLDER = os.path.join(basedir, 'storage', 'uploads')
    LOG_FOLDER = os.path.join(basedir, 'logs')
    BACKUP_FOLDER = os.path.join(root_dir, 'backups')

    # Rate Limiting (Anti Brute-Force & Abuse)
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', '100 per minute')
    RATELIMIT_STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_STRATEGY = 'fixed-window'

    # Email & OTP Verification Settings (2-Factor Authentication)
    ENV = os.getenv('FLASK_ENV', 'development').lower()
    IS_PRODUCTION = ENV in ('production', 'prod')
    OTP_DEV_MODE = os.getenv('OTP_DEV_MODE', 'false').lower() in ('true', '1')
    
    # Modern Cloud Email Providers (Resend / Brevo)
    RESEND_API_KEY = os.getenv('RESEND_API_KEY', '').strip()
    BREVO_API_KEY = os.getenv('BREVO_API_KEY', '').strip()
    
    # SMTP Relay Configuration (Brevo SMTP, SendGrid, Amazon SES, or custom)
    SMTP_HOST = os.getenv('SMTP_HOST', '').strip()
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER', '').strip()
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '').strip()
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() in ('true', '1', 't')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER') or os.getenv('SMTP_FROM_EMAIL', 'PlagiCheck <security@plagicheck.university.edu>')
    SMTP_FROM_EMAIL = MAIL_DEFAULT_SENDER
    OTP_EXPIRY_MINUTES = int(os.getenv('OTP_EXPIRY_MINUTES', '5'))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv('OTP_RESEND_COOLDOWN_SECONDS', '30'))
    OTP_MAX_ATTEMPTS = 5
    REQUIRE_EMAIL_OTP = os.getenv('REQUIRE_EMAIL_OTP', 'false').lower() in ('true', '1')

    # CORS Settings (Restricted to authorized frontend)
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173'
        ).split(',')
        if origin.strip()
    ]


class TestConfig(Config):
    """Configuration for automated test execution."""
    TESTING = True
    DEBUG = False
    ENV = 'testing'
    REQUIRE_EMAIL_OTP = True
    OTP_DEV_MODE = True
    RESEND_API_KEY = ''
    BREVO_API_KEY = ''
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    RATELIMIT_ENABLED = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    SECRET_KEY = secrets.token_hex(32)
    JWT_SECRET_KEY = secrets.token_hex(32)
