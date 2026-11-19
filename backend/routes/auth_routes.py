"""
PlagiCheck Security Hardening - Authentication API Routes
Provides hardened endpoints for user registration, login, logout, and profile management.
Includes Argon2id password hashing, rate limiting, and brute-force mitigation.
Extended with registration OTP flow, password reset, account recovery, and session management.
"""

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, current_app, g, jsonify, make_response, request
from backend.models import (
    db, User, EmailOTP,
    PendingRegistration, PasswordResetOTP,
    RecoveryEmail, RecoveryCode, AccountRecoveryRequest, UserSession
)
from backend.security.auth import (
    generate_jwt_tokens,
    hash_password,
    revoke_token,
    validate_password_strength,
    verify_password
)
from backend.security.rbac import jwt_required_custom
from backend.services.email_service import (
    mask_email,
    send_otp_email,
    send_registration_otp_email,
    send_password_reset_email,
    send_password_changed_notification,
    send_recovery_email_verification,
    send_recovery_code_used_notification,
)
from backend.utils.audit_logger import (
    audit_login_failure,
    audit_login_success,
    audit_logout,
    audit_registration,
    audit_suspicious_activity
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def hash_otp(otp_code: str, salt: str) -> str:
    """Generate SHA-256 HMAC digest of OTP with tempToken salt."""
    return hashlib.sha256(f"{otp_code}:{salt}".encode('utf-8')).hexdigest()


def set_auth_cookies(response, tokens: dict):
    """Attach secure, HttpOnly session cookies to the HTTP response."""
    cookie_secure = current_app.config.get('JWT_COOKIE_SECURE', False)
    samesite = current_app.config.get('JWT_COOKIE_SAMESITE', 'Lax')

    # Access Token Cookie
    response.set_cookie(
        current_app.config['JWT_ACCESS_COOKIE_NAME'],
        tokens['access_token'],
        max_age=tokens['expires_in'],
        httponly=True,
        secure=cookie_secure,
        samesite=samesite,
        path='/'
    )
    # Refresh Token Cookie
    response.set_cookie(
        current_app.config['JWT_REFRESH_COOKIE_NAME'],
        tokens['refresh_token'],
        max_age=int(current_app.config['JWT_REFRESH_TOKEN_EXPIRES'].total_seconds()),
        httponly=True,
        secure=cookie_secure,
        samesite=samesite,
        path='/api/v1/auth/refresh'
    )
    return response


def _is_dev_mode():
    """Return True ONLY if in testing or OTP_DEV_MODE is explicitly enabled and not in production."""
    if current_app.config.get('IS_PRODUCTION', False) or current_app.config.get('ENV') == 'production':
        return False
    return current_app.config.get('TESTING', False) or current_app.config.get('OTP_DEV_MODE', False)


# ---------------------------------------------------------------------------
# Registration OTP Flow
# ---------------------------------------------------------------------------

@auth_bp.route('/register/initiate', methods=['POST'])
def register_initiate():
    """Validate fields, check email not taken, generate OTP, return tempToken."""
    data = request.get_json(silent=True) or {}

    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    role = str(data.get('role', 'Student')).strip()
    institution = str(data.get('institution', 'Academic Institution')).strip()

    if not name or len(name) < 2 or len(name) > 100:
        return jsonify({'success': False, 'error': 'Name must be between 2 and 100 characters.'}), 400

    if not email or not EMAIL_REGEX.match(email) or len(email) > 120:
        return jsonify({'success': False, 'error': 'Please provide a valid institutional email address.'}), 400

    is_strong, msg = validate_password_strength(password)
    if not is_strong:
        return jsonify({'success': False, 'error': msg}), 400

    valid_roles = {'Student', 'Faculty / Researcher', 'Administrator', 'Academic Member', 'Graduate Student'}
    if role not in valid_roles:
        role = 'Student'

    # Check confirmed users
    if User.query.filter_by(email=email).first():
        audit_suspicious_activity('DUPLICATE_REGISTRATION_ATTEMPT', {'email': email})
        return jsonify({'success': False, 'error': 'An account with this email address already exists.'}), 409

    # Clean up stale pending registrations for same email
    PendingRegistration.query.filter_by(email=email).delete()
    db.session.flush()

    argon2_hash = hash_password(password)

    # If Email OTP is not required, register directly and issue tokens
    if not current_app.config.get('REQUIRE_EMAIL_OTP', False):
        new_user = User(
            name=name,
            email=email,
            password_hash=argon2_hash,
            role=role,
            institution=institution,
            email_verified=True,
        )
        db.session.add(new_user)
        db.session.commit()
        audit_registration(new_user.id, new_user.email, new_user.role)
        tokens = generate_jwt_tokens(new_user.id, new_user.role)
        resp = make_response(jsonify({
            'success': True,
            'requiresOtp': False,
            'message': 'Account registered successfully.',
            'user': new_user.to_dict(),
            'tokens': {
                'accessToken': tokens['access_token'],
                'expiresIn': tokens['expires_in']
            }
        }), 201)
        return set_auth_cookies(resp, tokens)

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_token = secrets.token_urlsafe(32)
    otp_hash = hash_otp(otp_code, temp_token)

    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_min)

    pending = PendingRegistration(
        name=name,
        email=email,
        password_hash=argon2_hash,
        role=role,
        institution=institution,
        otp_hash=otp_hash,
        temp_token=temp_token,
        expires_at=expires_at,
    )
    db.session.add(pending)
    db.session.commit()

    dispatch_res = send_registration_otp_email(email, name, otp_code, expiry_min)
    if not dispatch_res.get('success'):
        db.session.delete(pending)
        db.session.commit()
        return jsonify({
            'success': False,
            'error': dispatch_res.get('error', 'Failed to deliver verification email. Please check server SMTP configuration.')
        }), 503

    masked = mask_email(email)
    is_dev = _is_dev_mode() and dispatch_res.get('simulated', False)

    return jsonify({
        'success': True,
        'requiresOtp': True,
        'tempToken': temp_token,
        'maskedEmail': masked,
        'expiresInSeconds': expiry_min * 60,
        'devOtp': otp_code if is_dev else None,
        'isDevMode': is_dev,
        'message': 'OTP sent successfully to your email.' if not is_dev else f'Verification code sent to {masked} (Dev Mode: {otp_code})',
    }), 200


@auth_bp.route('/register/verify-otp', methods=['POST'])
def register_verify_otp():
    """Verify registration OTP, create User record, delete PendingRegistration."""
    data = request.get_json(silent=True) or {}
    temp_token = str(data.get('tempToken', '')).strip()
    otp_code = str(data.get('otp', '')).strip()

    if not temp_token or not otp_code:
        return jsonify({'success': False, 'error': 'Verification session token and OTP code are required.'}), 400

    pending = PendingRegistration.query.filter_by(temp_token=temp_token).first()
    if not pending or pending.is_used:
        return jsonify({'success': False, 'error': 'Invalid or expired registration session.'}), 401

    now = datetime.now(timezone.utc)
    exp = pending.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        pending.is_used = True
        db.session.commit()
        return jsonify({'success': False, 'error': 'Verification code has expired. Please restart registration.'}), 401

    if pending.attempts >= pending.max_attempts:
        pending.is_used = True
        db.session.commit()
        return jsonify({'success': False, 'error': 'Maximum verification attempts exceeded. Please restart registration.'}), 401

    computed_hash = hash_otp(otp_code, temp_token)
    if not hmac.compare_digest(pending.otp_hash, computed_hash):
        pending.attempts += 1
        db.session.commit()
        remaining = pending.max_attempts - pending.attempts
        return jsonify({
            'success': False,
            'error': f'Incorrect verification code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'
        }), 401

    # Check again that email isn't taken (race condition guard)
    if User.query.filter_by(email=pending.email).first():
        db.session.delete(pending)
        db.session.commit()
        return jsonify({'success': False, 'error': 'An account with this email address already exists.'}), 409

    new_user = User(
        name=pending.name,
        email=pending.email,
        password_hash=pending.password_hash,
        role=pending.role,
        institution=pending.institution,
        email_verified=True,
    )
    db.session.add(new_user)
    db.session.delete(pending)
    db.session.commit()

    audit_registration(new_user.id, new_user.email, new_user.role)
    tokens = generate_jwt_tokens(new_user.id, new_user.role)

    resp = make_response(jsonify({
        'success': True,
        'message': 'Account verified and registered successfully.',
        'user': new_user.to_dict(),
        'tokens': {
            'accessToken': tokens['access_token'],
            'expiresIn': tokens['expires_in']
        }
    }), 201)
    return set_auth_cookies(resp, tokens)


@auth_bp.route('/register/resend-otp', methods=['POST'])
def register_resend_otp():
    """Resend registration OTP with rate limiting and max resend count."""
    data = request.get_json(silent=True) or {}
    temp_token = str(data.get('tempToken', '')).strip()

    if not temp_token:
        return jsonify({'success': False, 'error': 'Session token is required.'}), 400

    pending = PendingRegistration.query.filter_by(temp_token=temp_token).first()
    if not pending or pending.is_used:
        return jsonify({'success': False, 'error': 'Session expired. Please restart registration.'}), 401

    max_resends = 3
    if pending.resend_count >= max_resends:
        return jsonify({'success': False, 'error': 'Maximum resend limit reached. Please restart registration.'}), 429

    # Resend cooldown (30 seconds)
    cooldown = current_app.config.get('OTP_RESEND_COOLDOWN_SECONDS', 30)
    now = datetime.now(timezone.utc)
    if pending.last_resend_at:
        last = pending.last_resend_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        elapsed = (now - last).total_seconds()
        if elapsed < cooldown:
            wait = int(cooldown - elapsed)
            return jsonify({'success': False, 'error': f'Please wait {wait} seconds before requesting a new code.'}), 429

    new_otp = f"{secrets.randbelow(900000) + 100000}"
    new_hash = hash_otp(new_otp, temp_token)
    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 10)

    pending.otp_hash = new_hash
    pending.attempts = 0
    pending.resend_count += 1
    pending.last_resend_at = now
    pending.expires_at = now + timedelta(minutes=expiry_min)
    db.session.commit()

    dispatch_res = send_registration_otp_email(pending.email, pending.name, new_otp, expiry_min)
    if not dispatch_res.get('success'):
        return jsonify({
            'success': False,
            'error': dispatch_res.get('error', 'Failed to dispatch verification email.')
        }), 503

    is_dev = _is_dev_mode() and dispatch_res.get('simulated', False)
    return jsonify({
        'success': True,
        'message': 'OTP sent successfully to your email.',
        'devOtp': new_otp if is_dev else None,
        'isDevMode': is_dev
    }), 200


# ---------------------------------------------------------------------------
# Legacy /register (backward compatible - direct registration without OTP)
# ---------------------------------------------------------------------------

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new student or educator account (legacy - direct registration)."""
    data = request.get_json(silent=True) or {}

    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    role = str(data.get('role', 'Student')).strip()
    institution = str(data.get('institution', 'Academic Institution')).strip()

    # 1. Input Validation
    if not name or len(name) < 2 or len(name) > 100:
        return jsonify({'success': False, 'error': 'Name must be between 2 and 100 characters.'}), 400

    if not email or not EMAIL_REGEX.match(email) or len(email) > 120:
        return jsonify({'success': False, 'error': 'Please provide a valid institutional email address.'}), 400

    # 2. Password Strength Validation (OWASP ASVS compliant)
    is_strong, msg = validate_password_strength(password)
    if not is_strong:
        return jsonify({'success': False, 'error': msg}), 400

    # Whitelist role
    valid_roles = {'Student', 'Faculty / Researcher', 'Administrator', 'Academic Member', 'Graduate Student'}
    if role not in valid_roles:
        role = 'Student'

    # 3. Check for existing account (Safe Parameterized Query)
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        audit_suspicious_activity('DUPLICATE_REGISTRATION_ATTEMPT', {'email': email})
        return jsonify({'success': False, 'error': 'An account with this email address already exists.'}), 409

    # 4. Hash password with Argon2id
    argon2_hash = hash_password(password)

    # 5. Persist to Database
    new_user = User(
        name=name,
        email=email,
        password_hash=argon2_hash,
        role=role,
        institution=institution
    )
    db.session.add(new_user)
    db.session.commit()

    # 6. Audit Logging & JWT Generation
    audit_registration(new_user.id, new_user.email, new_user.role)
    tokens = generate_jwt_tokens(new_user.id, new_user.role)

    resp = make_response(jsonify({
        'success': True,
        'message': 'Account registered successfully.',
        'user': new_user.to_dict(),
        'tokens': {
            'accessToken': tokens['access_token'],
            'expiresIn': tokens['expires_in']
        }
    }), 201)

    return set_auth_cookies(resp, tokens)


# ---------------------------------------------------------------------------
# Login OTP Flow
# ---------------------------------------------------------------------------

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate existing user, issue access tokens, and enforce brute force logging."""
    data = request.get_json(silent=True) or {}

    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    # Parameterized query lookup
    user = User.query.filter_by(email=email).first()

    # Timing-safe comparison & verification
    if not user or not verify_password(user.password_hash, password):
        audit_login_failure(email, reason='Invalid credentials')
        return jsonify({
            'success': False,
            'error': 'Invalid email address or password. Please verify your credentials.'
        }), 401

    # Direct login if Email OTP is not required
    if not current_app.config.get('REQUIRE_EMAIL_OTP', False):
        audit_login_success(user.id, user.email)
        tokens = generate_jwt_tokens(user.id, user.role)
        resp = make_response(jsonify({
            'success': True,
            'requiresOtp': False,
            'message': 'Login successful.',
            'user': user.to_dict(),
            'tokens': {
                'accessToken': tokens['access_token'],
                'expiresIn': tokens['expires_in']
            }
        }), 200)
        return set_auth_cookies(resp, tokens)

    # 2-Factor Authentication: Generate secure 6-digit OTP and send to user's email
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_token = secrets.token_urlsafe(32)
    hashed_code = hash_otp(otp_code, temp_token)

    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_min)

    # Invalidate previous pending OTPs
    EmailOTP.query.filter_by(user_id=user.id, is_used=False).update({'is_used': True})

    # Save OTP record
    otp_record = EmailOTP(
        user_id=user.id,
        otp_hash=hashed_code,
        temp_token=temp_token,
        expires_at=expires_at
    )
    db.session.add(otp_record)
    db.session.commit()

    # Dispatch email
    dispatch_res = send_otp_email(user.email, user.name, otp_code)
    if not dispatch_res.get('success'):
        db.session.delete(otp_record)
        db.session.commit()
        return jsonify({
            'success': False,
            'error': dispatch_res.get('error', 'Failed to deliver verification code email. Please contact administrator.')
        }), 503

    masked = mask_email(user.email)
    is_dev = _is_dev_mode() and dispatch_res.get('simulated', False)

    return jsonify({
        'success': True,
        'requiresOtp': True,
        'tempToken': temp_token,
        'maskedEmail': masked,
        'expiresInSeconds': expiry_min * 60,
        'devOtp': otp_code if is_dev else None,
        'isDevMode': is_dev,
        'message': 'OTP sent successfully to your email.'
    }), 200


def _do_verify_otp(data: dict):
    """Shared OTP verification logic for /verify-otp and /login/verify-otp."""
    temp_token = str(data.get('tempToken', '')).strip()
    otp_code = str(data.get('otp', '')).strip()

    if not temp_token or not otp_code:
        return jsonify({'success': False, 'error': 'Verification session token and OTP code are required.'}), 400

    otp_record = EmailOTP.query.filter_by(temp_token=temp_token).first()
    if not otp_record or otp_record.is_used:
        return jsonify({'success': False, 'error': 'Invalid or expired verification session. Please sign in again.'}), 401

    # Check expiration
    now = datetime.now(timezone.utc)
    exp = otp_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        otp_record.is_used = True
        db.session.commit()
        return jsonify({'success': False, 'error': 'Verification code has expired. Please request a new code.'}), 401

    # Check maximum attempt threshold (Anti-Brute Force on 6-digit OTP)
    if otp_record.attempts >= otp_record.max_attempts:
        otp_record.is_used = True
        db.session.commit()
        audit_suspicious_activity('OTP_BRUTE_FORCE_EXCEEDED', {'user_id': otp_record.user_id})
        return jsonify({'success': False, 'error': 'Maximum verification attempts exceeded. Please sign in again.'}), 401

    # Constant-time comparison
    computed_hash = hash_otp(otp_code, temp_token)
    if not hmac.compare_digest(otp_record.otp_hash, computed_hash):
        otp_record.attempts += 1
        db.session.commit()
        remaining = otp_record.max_attempts - otp_record.attempts
        return jsonify({
            'success': False,
            'error': f'Incorrect verification code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'
        }), 401

    # OTP Verified Successfully
    otp_record.is_used = True
    db.session.commit()

    user = otp_record.user
    audit_login_success(user.id, user.email)
    tokens = generate_jwt_tokens(user.id, user.role)

    resp = make_response(jsonify({
        'success': True,
        'message': 'Two-factor verification successful. Welcome back!',
        'user': user.to_dict(),
        'tokens': {
            'accessToken': tokens['access_token'],
            'expiresIn': tokens['expires_in']
        }
    }), 200)
    return set_auth_cookies(resp, tokens)


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify 6-digit OTP code sent to user email and issue session tokens."""
    return _do_verify_otp(request.get_json(silent=True) or {})


@auth_bp.route('/login/verify-otp', methods=['POST'])
def login_verify_otp():
    """Alias for /verify-otp under login prefix."""
    return _do_verify_otp(request.get_json(silent=True) or {})


def _do_resend_otp(data: dict):
    """Shared resend OTP logic."""
    temp_token = str(data.get('tempToken', '')).strip()

    if not temp_token:
        return jsonify({'success': False, 'error': 'Session token is required.'}), 400

    otp_record = EmailOTP.query.filter_by(temp_token=temp_token).first()
    if not otp_record or otp_record.is_used:
        return jsonify({'success': False, 'error': 'Session expired. Please sign in again.'}), 401

    user = otp_record.user
    new_otp = f"{secrets.randbelow(900000) + 100000}"
    new_hash = hash_otp(new_otp, temp_token)

    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    otp_record.otp_hash = new_hash
    otp_record.attempts = 0
    otp_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_min)
    db.session.commit()

    dispatch_res = send_otp_email(user.email, user.name, new_otp)
    if not dispatch_res.get('success'):
        return jsonify({
            'success': False,
            'error': dispatch_res.get('error', 'Failed to dispatch verification email.')
        }), 503

    is_dev = _is_dev_mode() and dispatch_res.get('simulated', False)
    return jsonify({
        'success': True,
        'message': 'OTP sent successfully to your email.',
        'devOtp': new_otp if is_dev else None,
        'isDevMode': is_dev
    }), 200


@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend a new 6-digit verification code to the registered email."""
    return _do_resend_otp(request.get_json(silent=True) or {})


@auth_bp.route('/login/resend-otp', methods=['POST'])
def login_resend_otp():
    """Alias for /resend-otp under login prefix."""
    return _do_resend_otp(request.get_json(silent=True) or {})


# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Initiate password reset - never leak whether account exists."""
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({'success': False, 'error': 'Please provide a valid email address.'}), 400

    generic_response = {
        'success': True,
        'message': 'If that email is registered, a password reset code has been sent.',
    }

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(generic_response), 200

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_token = secrets.token_urlsafe(32)
    otp_hash = hash_otp(otp_code, temp_token)

    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 5)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_min)

    # Invalidate previous reset OTPs
    PasswordResetOTP.query.filter_by(user_id=user.id, is_used=False).update({'is_used': True})

    reset_otp = PasswordResetOTP(
        user_id=user.id,
        otp_hash=otp_hash,
        temp_token=temp_token,
        expires_at=expires_at,
    )
    db.session.add(reset_otp)
    db.session.commit()

    dispatch_res = send_password_reset_email(user.email, user.name, otp_code, expiry_min)
    if not dispatch_res.get('success'):
        db.session.delete(reset_otp)
        db.session.commit()
        return jsonify({
            'success': False,
            'error': dispatch_res.get('error', 'Failed to dispatch password reset email. Please contact administrator.')
        }), 503

    masked = mask_email(user.email)
    is_dev = _is_dev_mode() and dispatch_res.get('simulated', False)
    return jsonify({
        **generic_response,
        'tempToken': temp_token,
        'maskedEmail': masked,
        'devOtp': otp_code if is_dev else None,
        'isDevMode': is_dev
    }), 200


@auth_bp.route('/reset-password/verify', methods=['POST'])
def reset_password_verify():
    """Verify the password reset OTP code, return resetToken proof."""
    data = request.get_json(silent=True) or {}
    temp_token = str(data.get('tempToken', '')).strip()
    otp_code = str(data.get('otp', '')).strip()

    if not temp_token or not otp_code:
        return jsonify({'success': False, 'error': 'Token and OTP code are required.'}), 400

    reset_record = PasswordResetOTP.query.filter_by(temp_token=temp_token, is_used=False).first()
    if not reset_record:
        return jsonify({'success': False, 'error': 'Invalid or expired reset session.'}), 401

    now = datetime.now(timezone.utc)
    exp = reset_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        reset_record.is_used = True
        db.session.commit()
        return jsonify({'success': False, 'error': 'Reset code has expired. Please request a new one.'}), 401

    if reset_record.attempts >= reset_record.max_attempts:
        reset_record.is_used = True
        db.session.commit()
        return jsonify({'success': False, 'error': 'Maximum attempts exceeded. Please request a new reset code.'}), 401

    computed_hash = hash_otp(otp_code, temp_token)
    if not hmac.compare_digest(reset_record.otp_hash, computed_hash):
        reset_record.attempts += 1
        db.session.commit()
        remaining = reset_record.max_attempts - reset_record.attempts
        return jsonify({
            'success': False,
            'error': f'Incorrect code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'
        }), 401

    # Mark as used (consumed) and verified
    reset_record.is_used = True
    reset_record.is_verified = True
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'OTP verified. Proceed to set a new password.',
        'resetToken': temp_token,
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Complete password reset using the verified resetToken."""
    data = request.get_json(silent=True) or {}
    reset_token = str(data.get('resetToken', '')).strip()
    new_password = str(data.get('newPassword', ''))
    confirm_password = str(data.get('confirmPassword', ''))

    if not reset_token or not new_password or not confirm_password:
        return jsonify({'success': False, 'error': 'resetToken, newPassword, and confirmPassword are required.'}), 400

    if new_password != confirm_password:
        return jsonify({'success': False, 'error': 'Passwords do not match.'}), 400

    is_strong, msg = validate_password_strength(new_password)
    if not is_strong:
        return jsonify({'success': False, 'error': msg}), 400

    # Look up the already-verified reset record
    reset_record = PasswordResetOTP.query.filter_by(
        temp_token=reset_token,
        is_used=True,
        is_verified=True
    ).first()
    if not reset_record:
        return jsonify({'success': False, 'error': 'Invalid or already used reset token.'}), 401

    user = reset_record.user
    if not user:
        return jsonify({'success': False, 'error': 'User account not found.'}), 404

    # Update password
    user.password_hash = hash_password(new_password)

    # Invalidate all existing EmailOTPs and UserSessions for this user
    EmailOTP.query.filter_by(user_id=user.id, is_used=False).update({'is_used': True})
    UserSession.query.filter_by(user_id=user.id).delete()

    db.session.commit()

    send_password_changed_notification(user.email, user.name)

    return jsonify({
        'success': True,
        'message': 'Password has been reset successfully. Please sign in with your new password.',
    }), 200


# ---------------------------------------------------------------------------
# Account Recovery (Admin-Assisted)
# ---------------------------------------------------------------------------

@auth_bp.route('/recovery/request', methods=['POST'])
def recovery_request():
    """Create an admin-assisted account recovery request."""
    data = request.get_json(silent=True) or {}
    account_email = str(data.get('accountEmail', '')).strip().lower()
    reason = str(data.get('reason', '')).strip()

    if not account_email or not EMAIL_REGEX.match(account_email):
        return jsonify({'success': False, 'error': 'A valid account email is required.'}), 400
    if not reason or len(reason) < 10:
        return jsonify({'success': False, 'error': 'Please provide a detailed reason (at least 10 characters).'}), 400

    request_id = secrets.token_urlsafe(32)
    recovery = AccountRecoveryRequest(
        request_id=request_id,
        account_email=account_email,
        reason=reason,
    )
    db.session.add(recovery)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Recovery request submitted. An administrator will review it.',
        'requestId': request_id,
    }), 201


@auth_bp.route('/recovery/status/<request_id>', methods=['GET'])
def recovery_status(request_id):
    """Return status of an account recovery request."""
    recovery = AccountRecoveryRequest.query.filter_by(request_id=request_id).first()
    if not recovery:
        return jsonify({'success': False, 'error': 'Recovery request not found.'}), 404

    return jsonify({
        'success': True,
        'requestId': recovery.request_id,
        'status': recovery.status,
        'accountEmail': recovery.account_email,
        'createdAt': recovery.created_at.isoformat() if recovery.created_at else None,
        'reviewedAt': recovery.reviewed_at.isoformat() if recovery.reviewed_at else None,
        'adminNotes': recovery.admin_notes,
    }), 200


# ---------------------------------------------------------------------------
# Recovery Settings (JWT Required)
# ---------------------------------------------------------------------------

@auth_bp.route('/recovery-email/add', methods=['POST'])
@jwt_required_custom
def recovery_email_add():
    """Add or update recovery email address for the authenticated user."""
    data = request.get_json(silent=True) or {}
    recovery_email_addr = str(data.get('recoveryEmail', '')).strip().lower()

    if not recovery_email_addr or not EMAIL_REGEX.match(recovery_email_addr):
        return jsonify({'success': False, 'error': 'Please provide a valid recovery email address.'}), 400

    user = g.current_user
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_token = secrets.token_urlsafe(32)
    otp_hash = hash_otp(otp_code, temp_token)
    expiry_min = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_min)

    rec_email = RecoveryEmail.query.filter_by(user_id=user.id).first()
    if rec_email:
        rec_email.recovery_email = recovery_email_addr
        rec_email.is_verified = False
        rec_email.otp_hash = otp_hash
        rec_email.temp_token = temp_token
        rec_email.otp_expires_at = expires_at
        rec_email.otp_attempts = 0
        rec_email.verified_at = None
    else:
        rec_email = RecoveryEmail(
            user_id=user.id,
            recovery_email=recovery_email_addr,
            otp_hash=otp_hash,
            temp_token=temp_token,
            otp_expires_at=expires_at,
        )
        db.session.add(rec_email)
    db.session.commit()

    send_recovery_email_verification(recovery_email_addr, user.name, otp_code, expiry_min)

    return jsonify({
        'success': True,
        'message': f'Verification code sent to {mask_email(recovery_email_addr)}.',
        'tempToken': temp_token,
        'maskedEmail': mask_email(recovery_email_addr),
        'devOtp': otp_code if _is_dev_mode() else None,
    }), 200


@auth_bp.route('/recovery-email/verify', methods=['POST'])
@jwt_required_custom
def recovery_email_verify():
    """Verify recovery email OTP."""
    data = request.get_json(silent=True) or {}
    temp_token = str(data.get('tempToken', '')).strip()
    otp_code = str(data.get('otp', '')).strip()

    if not temp_token or not otp_code:
        return jsonify({'success': False, 'error': 'Token and OTP code are required.'}), 400

    user = g.current_user
    rec_email = RecoveryEmail.query.filter_by(user_id=user.id, temp_token=temp_token).first()
    if not rec_email:
        return jsonify({'success': False, 'error': 'Invalid or expired verification session.'}), 401

    now = datetime.now(timezone.utc)
    exp = rec_email.otp_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not exp or now > exp:
        return jsonify({'success': False, 'error': 'Verification code has expired.'}), 401

    max_attempts = 5
    if rec_email.otp_attempts >= max_attempts:
        return jsonify({'success': False, 'error': 'Maximum attempts exceeded.'}), 401

    computed_hash = hash_otp(otp_code, temp_token)
    if not hmac.compare_digest(rec_email.otp_hash, computed_hash):
        rec_email.otp_attempts += 1
        db.session.commit()
        remaining = max_attempts - rec_email.otp_attempts
        return jsonify({
            'success': False,
            'error': f'Incorrect code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'
        }), 401

    rec_email.is_verified = True
    rec_email.verified_at = now
    rec_email.otp_hash = None
    rec_email.temp_token = None
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Recovery email verified successfully.',
        'recoveryEmail': mask_email(rec_email.recovery_email),
    }), 200


@auth_bp.route('/recovery-email', methods=['DELETE'])
@jwt_required_custom
def recovery_email_delete():
    """Remove recovery email for the authenticated user."""
    user = g.current_user
    rec_email = RecoveryEmail.query.filter_by(user_id=user.id).first()
    if not rec_email:
        return jsonify({'success': False, 'error': 'No recovery email is set.'}), 404

    db.session.delete(rec_email)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Recovery email removed.'}), 200


@auth_bp.route('/recovery-codes/generate', methods=['POST'])
@jwt_required_custom
def recovery_codes_generate():
    """Generate 10 one-time recovery codes for the authenticated user."""
    user = g.current_user

    # Invalidate old codes
    RecoveryCode.query.filter_by(user_id=user.id).delete()
    db.session.flush()

    plain_codes = []
    for i in range(1, 11):
        code = secrets.token_hex(8)
        code_hash = hashlib.sha256(code.encode('utf-8')).hexdigest()
        rc = RecoveryCode(
            user_id=user.id,
            code_hash=code_hash,
            code_index=i,
        )
        db.session.add(rc)
        plain_codes.append({'index': i, 'code': code})

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Store these codes safely. They will not be shown again.',
        'codes': plain_codes,
    }), 201


# ---------------------------------------------------------------------------
# Session Management (JWT Required)
# ---------------------------------------------------------------------------

@auth_bp.route('/sessions', methods=['GET'])
@jwt_required_custom
def get_sessions():
    """Return user's active UserSession records (non-expired)."""
    user = g.current_user
    now = datetime.now(timezone.utc)
    sessions = UserSession.query.filter_by(user_id=user.id).all()
    active = []
    for s in sessions:
        exp = s.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now < exp:
            active.append({
                'id': s.id,
                'ipAddress': s.ip_address,
                'userAgent': s.user_agent,
                'createdAt': s.created_at.isoformat() if s.created_at else None,
                'expiresAt': s.expires_at.isoformat() if s.expires_at else None,
            })
    return jsonify({'success': True, 'sessions': active}), 200


@auth_bp.route('/sessions', methods=['DELETE'])
@jwt_required_custom
def revoke_all_sessions():
    """Revoke all sessions (logout all devices)."""
    user = g.current_user
    UserSession.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({'success': True, 'message': 'All sessions have been revoked.'}), 200


# ---------------------------------------------------------------------------
# Admin Endpoints (JWT + Admin Role Required)
# ---------------------------------------------------------------------------

def _require_admin():
    """Return (user, error_response) pair. error_response is None if admin."""
    user = g.current_user
    if user.role != 'Administrator':
        return None, (jsonify({'success': False, 'error': 'Administrator access required.'}), 403)
    return user, None


@auth_bp.route('/admin/recovery-requests', methods=['GET'])
@jwt_required_custom
def admin_list_recovery_requests():
    """List all PENDING AccountRecoveryRequests."""
    _, err = _require_admin()
    if err:
        return err

    requests_q = AccountRecoveryRequest.query.filter_by(status='PENDING').order_by(
        AccountRecoveryRequest.created_at.asc()
    ).all()

    return jsonify({
        'success': True,
        'requests': [
            {
                'requestId': r.request_id,
                'accountEmail': r.account_email,
                'reason': r.reason,
                'status': r.status,
                'createdAt': r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests_q
        ]
    }), 200


@auth_bp.route('/admin/recovery-requests/<request_id>/review', methods=['POST'])
@jwt_required_custom
def admin_review_recovery_request(request_id):
    """Approve or deny an account recovery request."""
    admin, err = _require_admin()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    action = str(data.get('action', '')).strip().lower()
    admin_notes = str(data.get('adminNotes', '')).strip()

    if action not in ('approve', 'deny'):
        return jsonify({'success': False, 'error': 'action must be "approve" or "deny".'}), 400

    recovery = AccountRecoveryRequest.query.filter_by(request_id=request_id).first()
    if not recovery:
        return jsonify({'success': False, 'error': 'Recovery request not found.'}), 404

    if recovery.status != 'PENDING':
        return jsonify({'success': False, 'error': f'Request is already {recovery.status}.'}), 409

    recovery.status = 'APPROVED' if action == 'approve' else 'DENIED'
    recovery.admin_notes = admin_notes
    recovery.reviewed_by = admin.id
    recovery.reviewed_at = datetime.now(timezone.utc)
    db.session.commit()

    audit_suspicious_activity('RECOVERY_REQUEST_REVIEWED', {
        'request_id': request_id,
        'action': action,
        'admin_id': admin.id,
    })

    return jsonify({
        'success': True,
        'message': f'Recovery request has been {recovery.status.lower()}.',
        'requestId': request_id,
        'status': recovery.status,
    }), 200


# ---------------------------------------------------------------------------
# Existing Endpoints (Logout, Me, Profile)
# ---------------------------------------------------------------------------

@auth_bp.route('/logout', methods=['POST'])
@jwt_required_custom
def logout():
    """Secure logout. Revokes JWT session identifier and deletes auth cookies."""
    payload = getattr(g, 'token_payload', {})
    jti = payload.get('jti')
    exp_ts = payload.get('exp')

    if jti and exp_ts:
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
        revoke_token(jti, g.current_user.id, expires_at)

    audit_logout(g.current_user.id)

    resp = make_response(jsonify({
        'success': True,
        'message': 'Logged out successfully.'
    }), 200)

    # Invalidate cookies
    resp.set_cookie(current_app.config['JWT_ACCESS_COOKIE_NAME'], '', expires=0, path='/')
    resp.set_cookie(current_app.config['JWT_REFRESH_COOKIE_NAME'], '', expires=0, path='/api/v1/auth/refresh')
    return resp


@auth_bp.route('/me', methods=['GET'])
@jwt_required_custom
def get_current_user():
    """Retrieve current authenticated user session."""
    return jsonify({
        'success': True,
        'user': g.current_user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_custom
def update_profile():
    """Update profile details for the authenticated user only."""
    data = request.get_json(silent=True) or {}
    user = g.current_user

    if 'name' in data:
        name = str(data['name']).strip()
        if len(name) >= 2 and len(name) <= 100:
            user.name = name

    if 'institution' in data:
        institution = str(data['institution']).strip()
        if len(institution) <= 150:
            user.institution = institution

    if 'role' in data and user.role == 'Administrator':
        # Only administrators can alter role
        user.role = str(data['role']).strip()

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully.',
        'user': user.to_dict()
    }), 200
