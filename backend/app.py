"""
PlagiCheck Security Hardening - Main Flask Application Factory
Applies comprehensive security headers, rate limiting, CORS controls,
and error handling. Complies with OWASP Top 10 and ASVS standards.
"""

import os
import sys

# Ensure parent directory is in sys.path when run directly as python backend/app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from backend.config import Config
from backend.models import db, User
from backend.routes.analysis_routes import analysis_bp
from backend.routes.auth_routes import auth_bp
from backend.security.auth import hash_password
from backend.services.email_service import validate_smtp_configuration
from backend.utils.audit_logger import audit_suspicious_activity

# Global Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://"
)


def create_app(config_class=Config):
    """Flask application factory."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # 1. Initialize Database ORM
    db.init_app(app)

    # 2. Configure Rate Limiter
    limiter.init_app(app)

    # 3. Configure CORS with strict origin filtering
    CORS(
        app,
        origins=app.config.get('CORS_ORIGINS', ['http://localhost:3000']),
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    )

    # 4. Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(analysis_bp)

    # 5. Inject Hardened HTTP Security Headers
    @app.after_request
    def set_security_headers(response):
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Prevent Clickjacking (disallow framing)
        response.headers['X-Frame-Options'] = 'DENY'

        # Modern Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 http://127.0.0.1:5000 http://localhost:5000; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        )

        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Permissions Policy
        response.headers['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=()'

        # Cache control for API responses
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'

        # HSTS (Strict-Transport-Security) in Production
        if app.config.get('ENV') == 'production' and request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'

        return response

    # 6. Global Secure Error Handlers (Never leak stack traces or internal paths)
    @app.errorhandler(400)
    def bad_request_handler(e):
        return jsonify({'success': False, 'error': 'Invalid request parameters or payload format.'}), 400

    @app.errorhandler(401)
    def unauthorized_handler(e):
        return jsonify({'success': False, 'error': 'Authentication required or invalid credentials.'}), 401

    @app.errorhandler(403)
    def forbidden_handler(e):
        return jsonify({'success': False, 'error': 'Access denied: You lack necessary permissions.'}), 403

    @app.errorhandler(404)
    def not_found_handler(e):
        return jsonify({'success': False, 'error': 'Requested API endpoint or resource was not found.'}), 404

    @app.errorhandler(405)
    def method_not_allowed_handler(e):
        return jsonify({'success': False, 'error': 'HTTP method not permitted for this route.'}), 405

    @app.errorhandler(413)
    def payload_too_large_handler(e):
        return jsonify({
            'success': False,
            'error': f'Uploaded file exceeds maximum permitted upload size ({app.config.get("MAX_CONTENT_LENGTH", 0) // (1024*1024)} MB).'
        }), 413

    @app.errorhandler(429)
    def ratelimit_handler(e):
        audit_suspicious_activity('RATE_LIMIT_EXCEEDED', {'ip': request.remote_addr, 'path': request.path})
        return jsonify({
            'success': False,
            'error': 'Too many requests. Please wait a few moments before trying again.'
        }), 429

    @app.errorhandler(500)
    def internal_server_error_handler(e):
        # Log incident internally without surfacing to caller
        audit_suspicious_activity('INTERNAL_ERROR', {'error': str(e), 'path': request.path})
        return jsonify({
            'success': False,
            'error': 'An internal processing error occurred. The incident has been recorded.'
        }), 500

    # 7. Health Check Endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'PlagiCheck Backend API',
            'version': '2.0.0',
            'security': 'hardened'
        }), 200

    # 8. Create Tables & Seed Default Academic Demo Users
    with app.app_context():
        try:
            db.create_all()
            _seed_demo_users()
        except Exception as e:
            print(f"[Database Initialization Warning] {e}")

        # 9. Validate SMTP Configuration during Application Startup
        try:
            validate_smtp_configuration(app)
        except Exception as e:
            print(f"[SMTP Validation Warning] {e}")

    return app


def _seed_demo_users():
    """Seed initial demo accounts with Argon2id hashes if not already present."""
    demo_faculty = User.query.filter_by(email='alex.morgan@university.edu').first()
    if not demo_faculty:
        demo_faculty = User(
            name='Dr. Alex Morgan',
            email='alex.morgan@university.edu',
            password_hash=hash_password('plagicheck123'),
            role='Faculty / Researcher',
            institution='Department of Computer Science & Engineering'
        )
        db.session.add(demo_faculty)

    demo_student = User.query.filter_by(email='elena.student@university.edu').first()
    if not demo_student:
        demo_student = User(
            name='Elena Rostova',
            email='elena.student@university.edu',
            password_hash=hash_password('plagicheck123'),
            role='Graduate Student',
            institution='School of Natural & Environmental Sciences'
        )
        db.session.add(demo_student)

    db.session.commit()


if __name__ == '__main__':
    application = create_app()
    # In production, run via Gunicorn/Waitress/uWSGI: waitress-serve --port=5000 backend.app:application
    application.run(host='127.0.0.1', port=5000, debug=False)

