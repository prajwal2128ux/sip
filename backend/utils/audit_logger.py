"""
PlagiCheck Security Hardening - Security Audit Logger Module
Provides structured, immutable security audit logging for compliance and intrusion detection.
Complies with OWASP Top 10 (A09:2021 Security Logging and Monitoring Failures).
Strictly prevents logging of passwords, full tokens, API keys, or unmasked sensitive document data.
"""

import json
import logging
import os
from datetime import datetime
from flask import request
from backend.models import db, SecurityAuditLog

# Setup file logger
logger = logging.getLogger('security_audit')
logger.setLevel(logging.INFO)

# File handler for local immutable audit log file
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)
audit_file_path = os.path.join(log_dir, 'security_audit.log')

if not logger.handlers:
    fh = logging.FileHandler(audit_file_path, encoding='utf-8')
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter('{"timestamp": "%(asctime)s", %(message)s}')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

SENSITIVE_KEYS = {'password', 'password_hash', 'token', 'access_token', 'refresh_token', 'apiKey', 'secret', 'key'}


def mask_sensitive_data(data: dict) -> dict:
    """Recursively redact passwords, tokens, and cryptographic secrets from log payloads."""
    if not isinstance(data, dict):
        return data
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS or any(s in k.lower() for s in ['password', 'secret', 'token', 'apikey']):
            sanitized[k] = '[REDACTED]'
        elif isinstance(v, dict):
            sanitized[k] = mask_sensitive_data(v)
        elif isinstance(v, list):
            sanitized[k] = [mask_sensitive_data(item) if isinstance(item, dict) else item for item in v]
        elif isinstance(v, str) and len(v) > 256:
            sanitized[k] = v[:256] + '... [TRUNCATED]'
        else:
            sanitized[k] = v
    return sanitized


def get_client_ip() -> str:
    """Retrieve actual client IP address handling standard reverse proxies securely."""
    if request:
        x_forwarded_for = request.headers.get('X-Forwarded-For')
        if x_forwarded_for:
            # First non-empty IP in chain
            return x_forwarded_for.split(',')[0].strip()
        return request.remote_addr or '127.0.0.1'
    return '127.0.0.1'


def get_user_agent() -> str:
    """Retrieve User-Agent header safely."""
    if request:
        return (request.headers.get('User-Agent') or 'Unknown')[:512]
    return 'System'


def log_security_event(
    event_type: str,
    severity: str = 'LOW',
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: dict | None = None
) -> None:
    """
    Core security audit logger. Persists simultaneously to MySQL table and filesystem log.
    Never fails or throws exceptions to callers (fail-safe).
    """
    ip = get_client_ip()
    ua = get_user_agent()
    sanitized_details = mask_sensitive_data(details or {})

    # 1. Structured JSON File Log
    try:
        log_entry = {
            'event': event_type,
            'severity': severity,
            'user_id': user_id,
            'ip': ip,
            'user_agent': ua,
            'resource_type': resource_type,
            'resource_id': str(resource_id) if resource_id is not None else None,
            'details': sanitized_details
        }
        json_str = json.dumps(log_entry, default=str)
        # Strip leading/trailing brackets to fit Formatter format
        logger.info(json_str[1:-1])
    except Exception as e:
        print(f"[AuditLogger Error] File log failure: {e}")

    # 2. Database Record Persistence
    try:
        audit_row = SecurityAuditLog(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip,
            user_agent=ua,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            details=sanitized_details
        )
        db.session.add(audit_row)
        db.session.commit()
    except Exception as e:
        # Avoid breaking transaction if DB logging fails
        db.session.rollback()
        print(f"[AuditLogger Error] DB log failure: {e}")


# Domain-Specific Helper Methods
def audit_login_success(user_id: int, email: str):
    log_security_event(
        'LOGIN_SUCCESS',
        severity='LOW',
        user_id=user_id,
        resource_type='user',
        resource_id=str(user_id),
        details={'email': email}
    )


def audit_login_failure(email: str, reason: str):
    log_security_event(
        'LOGIN_FAILURE',
        severity='MEDIUM',
        resource_type='user',
        details={'attempted_email': email, 'reason': reason}
    )


def audit_registration(user_id: int, email: str, role: str):
    log_security_event(
        'ACCOUNT_CREATION',
        severity='LOW',
        user_id=user_id,
        resource_type='user',
        resource_id=str(user_id),
        details={'email': email, 'role': role}
    )


def audit_logout(user_id: int):
    log_security_event(
        'LOGOUT',
        severity='LOW',
        user_id=user_id,
        resource_type='session'
    )


def audit_idor_blocked(user_id: int, resource_type: str, resource_id: str | int, requested_action: str):
    log_security_event(
        'IDOR_ATTEMPT_BLOCKED',
        severity='HIGH',
        user_id=user_id,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details={
            'action': requested_action,
            'message': 'User attempted to access unauthorized resource belonging to another account'
        }
    )


def audit_file_upload(user_id: int, original_filename: str, storage_name: str, file_size: int, status: str):
    log_security_event(
        'DOCUMENT_UPLOAD',
        severity='LOW' if status == 'SUCCESS' else 'MEDIUM',
        user_id=user_id,
        resource_type='document',
        resource_id=storage_name,
        details={'original_filename': original_filename, 'file_size_bytes': file_size, 'status': status}
    )


def audit_analysis_created(user_id: int, analysis_id: int, title: str, word_count: int):
    log_security_event(
        'PLAGIARISM_ANALYSIS',
        severity='LOW',
        user_id=user_id,
        resource_type='analysis',
        resource_id=str(analysis_id),
        details={'title': title, 'word_count': word_count}
    )


def audit_report_download(user_id: int, report_code: str):
    log_security_event(
        'REPORT_DOWNLOAD',
        severity='LOW',
        user_id=user_id,
        resource_type='report',
        resource_id=report_code,
        details={'action': 'download_or_view'}
    )


def audit_suspicious_activity(event_name: str, details: dict):
    log_security_event(
        f'SUSPICIOUS_{event_name}',
        severity='HIGH',
        details=details
    )

