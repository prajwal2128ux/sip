"""
PlagiCheck Security Hardening - Authorization & IDOR Protection Module
Implements strict ownership checks, role-based access control, and anti-IDOR validation.
OWASP Top 10 (A01:2021 Broken Access Control) remediation.
"""

from functools import wraps
from flask import g, jsonify, request
import jwt
from backend.models import User, db
from backend.security.auth import decode_jwt_token, is_token_revoked
from backend.utils.audit_logger import audit_idor_blocked, audit_suspicious_activity


def get_token_from_request() -> str | None:
    """Extract JWT token from Authorization Bearer header or secure HttpOnly cookie."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ', 1)[1].strip()

    # Fallback to HttpOnly cookie
    return request.cookies.get('plagicheck_access_token')


def jwt_required_custom(f):
    """Decorator ensuring that request contains a valid, unrevoked JWT access token."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        if not token:
            return jsonify({
                'success': False,
                'error': 'Authentication required. Missing Bearer token or session cookie.'
            }), 401

        try:
            payload = decode_jwt_token(token)
            if payload.get('type') != 'access':
                return jsonify({'success': False, 'error': 'Invalid token type.'}), 401

            jti = payload.get('jti')
            if is_token_revoked(jti):
                return jsonify({'success': False, 'error': 'Token has been revoked. Please log in again.'}), 401

            user_id = int(payload.get('sub'))
            user = db.session.get(User, user_id)
            if not user:
                return jsonify({'success': False, 'error': 'User account no longer exists.'}), 401

            g.current_user = user
            g.token_payload = payload

        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Session expired. Please log in again.'}), 401
        except (jwt.InvalidTokenError, ValueError) as e:
            audit_suspicious_activity('INVALID_JWT_PAYLOAD', {'token_fragment': token[:16], 'err': str(e)})
            return jsonify({'success': False, 'error': 'Invalid authentication token.'}), 401

        return f(*args, **kwargs)
    return decorated_function


def enforce_ownership(model_class, id_param='id', user_fk_attr='user_id'):
    """
    Decorator strictly enforcing resource ownership.
    Prevents Insecure Direct Object References (IDOR).
    If a user attempts to access an analysis or document belonging to another user,
    an audit alert is logged and a 403 Forbidden is returned.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            resource_id = kwargs.get(id_param)
            if resource_id is None:
                return jsonify({'success': False, 'error': 'Missing resource identifier.'}), 400

            # Safe parameterized query via SQLAlchemy Session.get
            resource = db.session.get(model_class, resource_id)
            if not resource:
                return jsonify({'success': False, 'error': f'{model_class.__name__} not found.'}), 404

            current_user = getattr(g, 'current_user', None)
            if not current_user:
                return jsonify({'success': False, 'error': 'Authentication required.'}), 401

            # Check if current user is owner (or administrator)
            resource_owner_id = getattr(resource, user_fk_attr)
            if resource_owner_id != current_user.id and current_user.role != 'Administrator':
                # Log security incident for intrusion detection
                audit_idor_blocked(
                    user_id=current_user.id,
                    resource_type=model_class.__name__,
                    resource_id=resource_id,
                    requested_action=request.method
                )
                return jsonify({
                    'success': False,
                    'error': 'Access denied: You are not authorized to view or modify this resource.'
                }), 403

            # Attach resource to context for handler efficiency
            g.resource = resource
            return f(*args, **kwargs)
        return decorated_function
    return decorator
