"""
PlagiCheck Security Hardening - Encrypted Database Backup Script
Dumps database tables and securely encrypts backup archives using AES-256-CBC (Fernet).
Computes SHA-256 cryptographic verification checksum.
"""

import hashlib
import json
import os
import sys
from datetime import datetime
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app import create_app
from backend.models import Analysis, AnalysisSource, PlagiarismReport, SecurityAuditLog, User, db

load_dotenv()


def get_or_create_backup_key() -> bytes:
    """Retrieve backup encryption key from environment or generate a dedicated one."""
    key = os.getenv('BACKUP_ENCRYPTION_KEY')
    if not key:
        key = Fernet.generate_key().decode('utf-8')
        print(f"[SECURITY NOTICE] Generated new BACKUP_ENCRYPTION_KEY:\n  {key}\nSave this key in your secure password manager or .env to restore this backup!")
    return key.encode('utf-8')


def perform_encrypted_backup():
    """Dump all database records and write an AES-256 encrypted archive with integrity hash."""
    app = create_app()
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backups'))
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    backup_base = f"plagicheck_backup_{timestamp}"
    enc_path = os.path.join(backup_dir, f"{backup_base}.enc")
    meta_path = os.path.join(backup_dir, f"{backup_base}.meta.json")

    print(f"[*] Starting PlagiCheck database backup at {timestamp} UTC...")

    dump_data = {
        'version': '2.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'tables': {}
    }

    with app.app_context():
        # Dump Users (excluding passwords hashes in plaintext, hashes are preserved encrypted)
        users = User.query.all()
        dump_data['tables']['users'] = [
            {
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'password_hash': u.password_hash,
                'role': u.role,
                'institution': u.institution,
                'created_at': u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]

        # Dump Analyses
        analyses = Analysis.query.all()
        dump_data['tables']['analyses'] = [
            {
                'id': a.id,
                'user_id': a.user_id,
                'title': a.title,
                'submitted_text': a.submitted_text,
                'word_count': a.word_count,
                'character_count': a.character_count,
                'sentence_count': a.sentence_count,
                'similarity_percentage': a.similarity_percentage,
                'originality_percentage': a.originality_percentage,
                'ai_probability_percentage': a.ai_probability_percentage,
                'human_percentage': a.human_percentage,
                'ai_verdict': a.ai_verdict,
                'risk_level': a.risk_level,
                'processing_time_ms': a.processing_time_ms,
                'created_at': a.created_at.isoformat() if a.created_at else None
            }
            for a in analyses
        ]

        # Dump Analysis Sources
        sources = AnalysisSource.query.all()
        dump_data['tables']['analysis_sources'] = [
            {
                'id': s.id,
                'analysis_id': s.analysis_id,
                'source_name': s.source_name,
                'source_url': s.source_url,
                'matched_text': s.matched_text,
                'match_percentage': s.match_percentage,
                'matched_phrases_count': s.matched_phrases_count,
                'created_at': s.created_at.isoformat() if s.created_at else None
            }
            for s in sources
        ]

        # Dump Reports
        reports = PlagiarismReport.query.all()
        dump_data['tables']['reports'] = [
            {
                'id': r.id,
                'analysis_id': r.analysis_id,
                'report_code': r.report_code,
                'report_data': r.report_data,
                'summary_text': r.summary_text,
                'created_at': r.created_at.isoformat() if r.created_at else None
            }
            for r in reports
        ]

        # Dump Security Audit Logs
        audit_logs = SecurityAuditLog.query.all()
        dump_data['tables']['security_audit_logs'] = [
            {
                'id': l.id,
                'event_type': l.event_type,
                'severity': l.severity,
                'user_id': l.user_id,
                'ip_address': l.ip_address,
                'user_agent': l.user_agent,
                'resource_type': l.resource_type,
                'resource_id': l.resource_id,
                'details': l.details,
                'created_at': l.created_at.isoformat() if l.created_at else None
            }
            for l in audit_logs
        ]

    # Convert to JSON bytes
    raw_bytes = json.dumps(dump_data, indent=2, default=str).encode('utf-8')

    # Compute unencrypted SHA-256 checksum
    raw_sha256 = hashlib.sha256(raw_bytes).hexdigest()

    # Encrypt with AES-256-CBC Fernet
    key = get_or_create_backup_key()
    fernet = Fernet(key)
    encrypted_data = fernet.encrypt(raw_bytes)

    # Compute encrypted SHA-256 checksum
    enc_sha256 = hashlib.sha256(encrypted_data).hexdigest()

    # Write encrypted file
    with open(enc_path, 'wb') as f:
        f.write(encrypted_data)

    # Write metadata manifest
    metadata = {
        'backup_file': os.path.basename(enc_path),
        'timestamp': timestamp,
        'unencrypted_sha256': raw_sha256,
        'encrypted_sha256': enc_sha256,
        'records_count': {
            'users': len(dump_data['tables']['users']),
            'analyses': len(dump_data['tables']['analyses']),
            'analysis_sources': len(dump_data['tables']['analysis_sources']),
            'reports': len(dump_data['tables']['reports']),
            'security_audit_logs': len(dump_data['tables']['security_audit_logs'])
        },
        'encryption': 'AES-256 (Fernet CBC + HMAC-SHA256)'
    }

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] Backup successfully completed and encrypted!")
    print(f"    Encrypted Archive: {enc_path} ({len(encrypted_data)} bytes)")
    print(f"    Metadata Manifest: {meta_path}")
    print(f"    SHA-256 Checksum:  {enc_sha256}")
    return enc_path, meta_path


if __name__ == '__main__':
    perform_encrypted_backup()

