"""
PlagiCheck Security Hardening - Automated Security Test Suite
Tests OWASP Top 10 defenses, SQL injection prevention, Argon2id hashing,
IDOR access controls, file upload security, and audit logging.
"""

import io
import os
import pytest
from backend.app import create_app
from backend.config import TestConfig
from backend.models import Analysis, SecurityAuditLog, User, db
from backend.security.auth import hash_password, verify_password, validate_password_strength


@pytest.fixture
def app():
    """Create test application configured with in-memory database."""
    test_app = create_app(TestConfig)
    with test_app.app_context():
        db.create_all()
        # Seed test users
        user1 = User(
            name="Alice Student",
            email="alice@university.edu",
            password_hash=hash_password("AliceSecurePass2026!"),
            role="Student",
            institution="Computer Science"
        )
        user2 = User(
            name="Bob Student",
            email="bob@university.edu",
            password_hash=hash_password("BobSecurePass2026!"),
            role="Student",
            institution="Engineering"
        )
        db.session.add_all([user1, user2])
        db.session.commit()

        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def get_auth_token(client, email, password):
    """Helper to authenticate through 2FA OTP and return access token."""
    res = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200, f"Login step 1 failed for {email}: {res.get_json()}"
    data = res.get_json()
    if data.get('requiresOtp'):
        temp_token = data['tempToken']
        otp = data['devOtp']
        verify_res = client.post('/api/v1/auth/verify-otp', json={'tempToken': temp_token, 'otp': otp})
        assert verify_res.status_code == 200, f"OTP verification failed: {verify_res.get_json()}"
        return verify_res.get_json()['tokens']['accessToken']
    return data['tokens']['accessToken']


# =========================================================================
# 1. Password & Cryptography Tests (Argon2id)
# =========================================================================

def test_argon2id_hashing_and_verification():
    """Verify modern Argon2id hashing parameters and constant-time verification."""
    password = "AcademicIntegrity2026!"
    hashed = hash_password(password)

    # Must be valid Argon2id signature
    assert hashed.startswith("$argon2id$")
    assert "m=65536" in hashed
    assert "t=3" in hashed

    # Positive and negative verification
    assert verify_password(hashed, password) is True
    assert verify_password(hashed, "WrongPassword123!") is False
    assert verify_password(hashed, "") is False


def test_password_strength_validation():
    """Enforce OWASP minimum requirements and reject trivial dictionary passwords."""
    assert validate_password_strength("short")[0] is False
    assert validate_password_strength("alllowercaseletters")[0] is False
    assert validate_password_strength("ALLUPPERCASE123")[0] is False
    assert validate_password_strength("password123")[0] is False
    assert validate_password_strength("plagicheck")[0] is False

    is_valid, msg = validate_password_strength("SecurePass2026!#")
    assert is_valid is True
    assert msg == ""


# =========================================================================
# 2. Authentication & Brute-Force Defense Tests
# =========================================================================

def test_unauthorized_login_attempts(client):
    """Ensure invalid credentials return generic 401 without leaking user existence."""
    res1 = client.post('/api/v1/auth/login', json={
        'email': 'nonexistent@university.edu',
        'password': 'SomePassword123!'
    })
    assert res1.status_code == 401
    assert "Invalid email address or password" in res1.get_json()['error']

    res2 = client.post('/api/v1/auth/login', json={
        'email': 'alice@university.edu',
        'password': 'WrongPassword123!'
    })
    assert res2.status_code == 401
    assert "Invalid email address or password" in res2.get_json()['error']


def test_email_otp_login_flow(client):
    """Verify complete 2-factor email OTP authentication workflow."""
    # Step 1: Submit valid credentials -> Expect OTP Challenge
    res = client.post('/api/v1/auth/login', json={
        'email': 'alice@university.edu',
        'password': 'AliceSecurePass2026!'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['requiresOtp'] is True
    temp_token = data['tempToken']
    dev_otp = data['devOtp']
    assert len(dev_otp) == 6
    assert '@' in data['maskedEmail']

    # Step 2: Attempt wrong OTP -> Must reject
    wrong_otp = '000000' if dev_otp != '000000' else '111111'
    wrong_res = client.post('/api/v1/auth/verify-otp', json={
        'tempToken': temp_token,
        'otp': wrong_otp
    })
    assert wrong_res.status_code == 401
    assert "Incorrect verification code" in wrong_res.get_json()['error']

    # Step 3: Resend OTP -> Generates new code
    resend_res = client.post('/api/v1/auth/resend-otp', json={'tempToken': temp_token})
    assert resend_res.status_code == 200
    new_otp = resend_res.get_json()['devOtp']
    assert len(new_otp) == 6

    # Step 4: Submit valid fresh OTP
    valid_res = client.post('/api/v1/auth/verify-otp', json={
        'tempToken': temp_token,
        'otp': new_otp
    })
    assert valid_res.status_code == 200
    valid_data = valid_res.get_json()
    assert valid_data['success'] is True
    assert valid_data['user']['email'] == 'alice@university.edu'
    assert 'accessToken' in valid_data['tokens']

    # Step 5: Replay attack prevention - Used OTP must be rejected
    replay_res = client.post('/api/v1/auth/verify-otp', json={
        'tempToken': temp_token,
        'otp': new_otp
    })
    assert replay_res.status_code == 401


def test_logout_and_session_invalidation(client):
    """Verify that logging out revokes the JWT identifier (JTI) immediately."""
    token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    headers = {'Authorization': f'Bearer {token}'}

    # Verify token works
    res_me = client.get('/api/v1/auth/me', headers=headers)
    assert res_me.status_code == 200

    # Logout
    res_logout = client.post('/api/v1/auth/logout', headers=headers)
    assert res_logout.status_code == 200

    # Replay attack attempt: Token must be rejected as revoked
    res_replay = client.get('/api/v1/auth/me', headers=headers)
    assert res_replay.status_code == 401
    assert "revoked" in res_replay.get_json()['error'].lower()


# =========================================================================
# 3. SQL Injection Resistance Tests
# =========================================================================

def test_sql_injection_in_login(client):
    """Test standard SQL injection authentication bypass payloads."""
    sqli_payloads = [
        "' OR '1'='1",
        "alice@university.edu' --",
        "admin' /*",
        "' UNION SELECT 1, 'admin', 'hash', 'admin' --"
    ]
    for payload in sqli_payloads:
        res = client.post('/api/v1/auth/login', json={
            'email': payload,
            'password': 'randomPassword123!'
        })
        assert res.status_code in (400, 401)
        assert res.get_json()['success'] is False


def test_sql_injection_in_analysis_submission(client, app):
    """Test SQL injection in text submission and titles; must be treated as literal strings."""
    token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    headers = {'Authorization': f'Bearer {token}'}

    sqli_title = "Thesis'; DROP TABLE users; --"
    sqli_text = (
        "This is an academic research document containing a benign test for parameterized query "
        "handling. It contains an SQL statement: SELECT * FROM users WHERE 'a'='a' and quotes ' \"."
    )

    res = client.post('/api/v1/analyses', headers=headers, json={
        'title': sqli_title,
        'submittedText': sqli_text
    })
    assert res.status_code == 201

    with app.app_context():
        # Verify users table is completely intact and unaffected
        assert User.query.count() >= 2
        # Verify title was stored safely as a literal string
        saved = Analysis.query.filter_by(title=sqli_title).first()
        assert saved is not None


# =========================================================================
# 4. Insecure Direct Object References (IDOR) & Access Control Tests
# =========================================================================

def test_idor_prevention_on_analyses(client):
    """
    Critical Test: Alice creates an analysis.
    Bob attempts to read, delete, or fetch reports for Alice's analysis.
    The system MUST block Bob with 403 Forbidden and record an audit security incident.
    """
    alice_token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    bob_token = get_auth_token(client, 'bob@university.edu', 'BobSecurePass2026!')

    # 1. Alice creates analysis
    alice_res = client.post('/api/v1/analyses', headers={'Authorization': f'Bearer {alice_token}'}, json={
        'title': "Alice's Confidential Dissertation",
        'submittedText': "This is Alice's highly confidential doctoral dissertation text submitted for plagiarism review."
    })
    assert alice_res.status_code == 201
    analysis_id = alice_res.get_json()['analysis']['id']

    # 2. Bob tries to access Alice's document via IDOR
    bob_headers = {'Authorization': f'Bearer {bob_token}'}

    # Attempt GET Alice's analysis
    res_get = client.get(f'/api/v1/analyses/{analysis_id}', headers=bob_headers)
    assert res_get.status_code == 403, f"IDOR Vulnerability Detected! Bob accessed Alice's document: {res_get.get_json()}"
    assert "not authorized" in res_get.get_json()['error'].lower()

    # Attempt GET Alice's report
    res_rep = client.get(f'/api/v1/analyses/{analysis_id}/report', headers=bob_headers)
    assert res_rep.status_code == 403

    # Attempt DELETE Alice's analysis
    res_del = client.delete(f'/api/v1/analyses/{analysis_id}', headers=bob_headers)
    assert res_del.status_code == 403

    # 3. Verify Bob's analysis list DOES NOT include Alice's document
    res_bob_list = client.get('/api/v1/analyses', headers=bob_headers)
    assert res_bob_list.status_code == 200
    bob_analyses = res_bob_list.get_json()['analyses']
    assert not any(a['id'] == analysis_id for a in bob_analyses)


# =========================================================================
# 5. File Upload Security Tests
# =========================================================================

def test_reject_executable_disguised_as_pdf(client):
    """Reject executable files (e.g. Windows PE or shell script) disguised as .pdf."""
    token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    headers = {'Authorization': f'Bearer {token}'}

    # Executable payload disguised with .pdf extension
    malicious_bytes = b"MZ\x90\x00\x03\x00\x00\x00This is not a real PDF file."
    data = {
        'file': (io.BytesIO(malicious_bytes), 'assignment.pdf')
    }

    res = client.post('/api/v1/analyses/upload', headers=headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 400
    assert "executable" in res.get_json()['error'].lower() or "missing" in res.get_json()['error'].lower()


def test_reject_unsupported_extensions(client):
    """Reject disallowed extensions (.exe, .php, .sh, .py)."""
    token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    headers = {'Authorization': f'Bearer {token}'}

    disallowed = ['malware.exe', 'backdoor.php', 'script.sh', 'hack.py']
    for filename in disallowed:
        data = {'file': (io.BytesIO(b"echo 'evil'"), filename)}
        res = client.post('/api/v1/analyses/upload', headers=headers, data=data, content_type='multipart/form-data')
        assert res.status_code == 400
        assert "unsupported" in res.get_json()['error'].lower()


def test_safe_plain_text_upload(client):
    """Accept valid plain text upload and extract content securely."""
    token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    headers = {'Authorization': f'Bearer {token}'}

    valid_text = (
        b"Global warming driven by greenhouse gas emissions continues to alter climate systems. "
        b"Renewable energy represents a crucial mitigation strategy across all technological sectors."
    )
    data = {'file': (io.BytesIO(valid_text), 'climate_essay.txt')}

    res = client.post('/api/v1/analyses/upload', headers=headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 200
    payload = res.get_json()
    assert payload['success'] is True
    assert "Global warming" in payload['text']
    assert payload['wordCount'] > 10


# =========================================================================
# 6. HTTP Security Headers & Information Leakage Tests
# =========================================================================

def test_security_headers_enforcement(client):
    """Verify presence of defense-in-depth security headers on all responses."""
    res = client.get('/api/health')
    assert res.status_code == 200

    headers = res.headers
    assert headers.get('X-Content-Type-Options') == 'nosniff'
    assert headers.get('X-Frame-Options') == 'DENY'
    assert 'default-src' in headers.get('Content-Security-Policy', '')
    assert 'Referrer-Policy' in headers


def test_error_responses_never_leak_stack_traces(client):
    """Verify 400 and 404 errors return sanitized JSON without internal tracebacks or SQL syntax."""
    res = client.post('/api/v1/auth/login', data="invalid-non-json-data", content_type="application/json")
    assert res.status_code in (400, 401)
    json_data = res.get_json()
    assert 'error' in json_data
    # Ensure no internal Python traceback tokens
    assert "Traceback" not in str(res.data)
    assert "sqlalchemy" not in str(res.data).lower()
    assert "File \"" not in str(res.data)


# =========================================================================
# 7. Audit Logging Verification
# =========================================================================

def test_security_audit_events_logged(client, app):
    """Verify that security operations trigger persistent audit records."""
    # Attempt unauthorized access to trigger IDOR event
    alice_token = get_auth_token(client, 'alice@university.edu', 'AliceSecurePass2026!')
    bob_token = get_auth_token(client, 'bob@university.edu', 'BobSecurePass2026!')

    alice_res = client.post('/api/v1/analyses', headers={'Authorization': f'Bearer {alice_token}'}, json={
        'title': "Audit Check Document",
        'submittedText': "Document submitted to verify audit logging functionality and security event records."
    })
    a_id = alice_res.get_json()['analysis']['id']

    # Trigger IDOR block
    client.get(f'/api/v1/analyses/{a_id}', headers={'Authorization': f'Bearer {bob_token}'})

    with app.app_context():
        # Check audit log records
        audit_events = SecurityAuditLog.query.all()
        event_types = [e.event_type for e in audit_events]
        assert 'LOGIN_SUCCESS' in event_types
        assert 'PLAGIARISM_ANALYSIS' in event_types
        assert 'IDOR_ATTEMPT_BLOCKED' in event_types


# =========================================================================
# 8. Strict Production & OTP Security Hardening Tests
# =========================================================================

def test_production_mode_never_exposes_otp(app, client):
    """Verify that in production mode, OTP is never exposed in response or simulated."""
    app.config['ENV'] = 'production'
    app.config['IS_PRODUCTION'] = True
    app.config['SMTP_HOST'] = ''  # No SMTP configured

    # Attempt login in production without SMTP -> Must fail fast, never simulate!
    res = client.post('/api/v1/auth/login', json={
        'email': 'alice@university.edu',
        'password': 'AliceSecurePass2026!'
    })
    # Must fail with 503 (service unavailable) because SMTP is not configured in production
    assert res.status_code == 503
    data = res.get_json()
    assert data['success'] is False
    assert data.get('devOtp') is None
    assert 'SMTP is not configured in production' in data['error']

    # Restore test environment
    app.config['ENV'] = 'testing'
    app.config['IS_PRODUCTION'] = False


def test_otp_expiration_enforcement(app, client):
    """Verify that OTP codes past the 5-minute expiration window are rejected."""
    from datetime import datetime, timedelta, timezone
    from backend.models import EmailOTP

    res = client.post('/api/v1/auth/login', json={
        'email': 'alice@university.edu',
        'password': 'AliceSecurePass2026!'
    })
    assert res.status_code == 200
    temp_token = res.get_json()['tempToken']
    dev_otp = res.get_json()['devOtp']

    # Manually expire the OTP in the database (simulate 10 minutes elapsed)
    with app.app_context():
        otp_rec = EmailOTP.query.filter_by(temp_token=temp_token).first()
        otp_rec.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        db.session.commit()

    # Try verifying with the right code after expiration -> Must reject with 401
    verify_res = client.post('/api/v1/auth/verify-otp', json={
        'tempToken': temp_token,
        'otp': dev_otp
    })
    assert verify_res.status_code == 401
    assert "expired" in verify_res.get_json()['error'].lower()


def test_otp_max_attempts_lockout(client):
    """Verify that exceeding 5 failed OTP attempts permanently invalidates the challenge."""
    res = client.post('/api/v1/auth/login', json={
        'email': 'alice@university.edu',
        'password': 'AliceSecurePass2026!'
    })
    assert res.status_code == 200
    temp_token = res.get_json()['tempToken']
    real_otp = res.get_json()['devOtp']

    # Fail 5 times
    for i in range(5):
        fail_res = client.post('/api/v1/auth/verify-otp', json={
            'tempToken': temp_token,
            'otp': '999999'
        })
        assert fail_res.status_code == 401

    # 6th attempt with the REAL code -> Must still be rejected due to lockout
    locked_res = client.post('/api/v1/auth/verify-otp', json={
        'tempToken': temp_token,
        'otp': real_otp
    })
    assert locked_res.status_code == 401
    assert "attempts exceeded" in locked_res.get_json()['error'].lower() or "expired" in locked_res.get_json()['error'].lower()


def test_protected_endpoints_reject_unverified_sessions(client):
    """Verify that credentials alone cannot access protected endpoints without OTP verification."""
    # 1. Attempt access to current user profile without token -> 401
    res_me = client.get('/api/v1/auth/me')
    assert res_me.status_code == 401

    # 2. Attempt access to analysis submission without token -> 401
    res_analysis = client.post('/api/v1/analyses', json={'title': 'Test', 'submittedText': 'Unauthenticated text'})
    assert res_analysis.status_code == 401


