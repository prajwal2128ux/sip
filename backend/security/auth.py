"""
PlagiCheck Security Hardening - Authentication & Cryptography Module
Implements Argon2id password hashing, strength validation, and JWT token management.
OWASP ASVS Level 2 compliant.
"""

import re
import uuid
from datetime import datetime, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from flask import current_app
from backend.models import db, RevokedToken

# Configure Argon2id Password Hasher
# OWASP Recommended parameters: time_cost=3, memory_cost=65536 (64MB), parallelism=4
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)

COMMON_PASSWORDS_BLACKLIST = {
    'password', 'password123', 'admin123', 'plagicheck', '12345678',
    'qwertyuiop', 'letmein123', 'welcome123', 'student123', 'university123'
}


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using modern Argon2id."""
    if not plain_password:
        raise ValueError("Password cannot be empty.")
    return _hasher.hash(plain_password)


def verify_password(hash_value: str, plain_password: str) -> bool:
    """
    Verify a plaintext password against an Argon2id hash.
    Safely handles legacy hashes or malformed inputs without leaking timing info.
    """
    if not hash_value or not plain_password:
        return False
    try:
        return _hasher.verify(hash_value, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength according to OWASP ASVS guidelines:
    - Minimum 8 characters, maximum 128 characters
    - Must contain uppercase, lowercase, and digit or special character
    - Must not match common trivial passwords
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if password.lower() in COMMON_PASSWORDS_BLACKLIST:
        return False, "Password is too common and easily guessable. Choose a stronger passphrase."
    
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit_or_punct = bool(re.search(r'[\d!@#$%^&*(),.?":{}|<>\-_=+/]', password))

    if not (has_upper and has_lower and has_digit_or_punct):
        return False, "Password must include uppercase letters, lowercase letters, and at least one number or symbol."

    return True, ""


def generate_jwt_tokens(user_id: int, role: str) -> dict:
    """
    Generate short-lived Access Token and Refresh Token with cryptographically random JTIs.
    """
    now = datetime.now(timezone.utc)
    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())

    access_payload = {
        'sub': str(user_id),
        'user_id': user_id,
        'role': role,
        'jti': access_jti,
        'type': 'access',
        'iat': now,
        'exp': now + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }

    refresh_payload = {
        'sub': str(user_id),
        'user_id': user_id,
        'role': role,
        'jti': refresh_jti,
        'type': 'refresh',
        'iat': now,
        'exp': now + current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
    }

    access_token = jwt.encode(
        access_payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )
    refresh_token = jwt.encode(
        refresh_payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'access_jti': access_jti,
        'refresh_jti': refresh_jti,
        'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
    }


def decode_jwt_token(token: str) -> dict:
    """
    Decode and verify a JWT signature, expiration, and format.
    Raises jwt.PyJWTError on invalid or expired token.
    """
    return jwt.decode(
        token,
        current_app.config['JWT_SECRET_KEY'],
        algorithms=['HS256'],
        options={'require': ['exp', 'iat', 'sub', 'jti']}
    )


def is_token_revoked(jti: str) -> bool:
    """Check if a token has been revoked / blacklisted."""
    return RevokedToken.query.filter_by(jti=jti).first() is not None


def revoke_token(jti: str, user_id: int, expires_at: datetime) -> None:
    """Revoke a token identifier and persist to database."""
    revoked = RevokedToken(
        jti=jti,
        user_id=user_id,
        expires_at=expires_at
    )
    db.session.add(revoked)
    db.session.commit()

