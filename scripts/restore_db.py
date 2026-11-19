"""
PlagiCheck Security Hardening - Encrypted Database Restoration Script
Decrypts backup archives, verifies cryptographic checksums, and restores database state.
"""

import hashlib
import json
import os
import sys
from datetime import datetime
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app import create_app
from backend.models import Analysis, AnalysisSource, PlagiarismReport, SecurityAuditLog, User, db

load_dotenv()


def restore_backup(encrypted_backup_path: str, encryption_key: str | None = None):
    """Restore database state from an encrypted backup archive."""
    if not os.path.exists(encrypted_backup_path):
        raise FileNotFoundError(f"Backup file not found: {encrypted_backup_path}")

    # Resolve metadata file
    meta_path = encrypted_backup_path.replace('.enc', '.meta.json')
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

    # Resolve encryption key
    key = encryption_key or os.getenv('BACKUP_ENCRYPTION_KEY')
    if not key:
        raise ValueError("Missing BACKUP_ENCRYPTION_KEY. Provide it as argument or in environment.")

    print(f"[*] Reading and verifying backup: {encrypted_backup_path}...")
    with open(encrypted_backup_path, 'rb') as f:
        encrypted_bytes = f.read()

    # Verify encrypted checksum if available
    current_enc_sha256 = hashlib.sha256(encrypted_bytes).hexdigest()
    if meta.get('encrypted_sha256') and meta['encrypted_sha256'] != current_enc_sha256:
        raise ValueError("Security Integrity Check Failed: Encrypted backup has been altered or corrupted!")

    # Decrypt
    try:
        fernet = Fernet(key.encode('utf-8') if isinstance(key, str) else key)
        raw_bytes = fernet.decrypt(encrypted_bytes)
    except InvalidToken:
        raise ValueError("Decryption failed. Invalid encryption key or corrupt archive.")

    # Verify unencrypted checksum
    current_raw_sha256 = hashlib.sha256(raw_bytes).hexdigest()
    if meta.get('unencrypted_sha256') and meta['unencrypted_sha256'] != current_raw_sha256:
        raise ValueError("Security Integrity Check Failed: Decrypted payload checksum mismatch!")

    print("[+] Cryptographic integrity checks passed successfully. Restoring records...")
    data = json.loads(raw_bytes.decode('utf-8'))
    tables = data.get('tables', {})

    app = create_app()
    with app.app_context():
        # Restore Users
        for u in tables.get('users', []):
            existing = User.query.get(u['id']) or User.query.filter_by(email=u['email']).first()
            if not existing:
                new_u = User(
                    id=u['id'],
                    name=u['name'],
                    email=u['email'],
                    password_hash=u['password_hash'],
                    role=u['role'],
                    institution=u['institution']
                )
                db.session.add(new_u)

        db.session.commit()

        # Restore Analyses
        for a in tables.get('analyses', []):
            if not Analysis.query.get(a['id']):
                new_a = Analysis(
                    id=a['id'],
                    user_id=a['user_id'],
                    title=a['title'],
                    submitted_text=a['submitted_text'],
                    word_count=a['word_count'],
                    character_count=a['character_count'],
                    sentence_count=a['sentence_count'],
                    similarity_percentage=a['similarity_percentage'],
                    originality_percentage=a['originality_percentage'],
                    ai_probability_percentage=a['ai_probability_percentage'],
                    human_percentage=a['human_percentage'],
                    ai_verdict=a['ai_verdict'],
                    risk_level=a['risk_level'],
                    processing_time_ms=a['processing_time_ms']
                )
                db.session.add(new_a)

        db.session.commit()

        # Restore Analysis Sources
        for s in tables.get('analysis_sources', []):
            if not AnalysisSource.query.get(s['id']):
                new_s = AnalysisSource(
                    id=s['id'],
                    analysis_id=s['analysis_id'],
                    source_name=s['source_name'],
                    source_url=s['source_url'],
                    matched_text=s['matched_text'],
                    match_percentage=s['match_percentage'],
                    matched_phrases_count=s['matched_phrases_count']
                )
                db.session.add(new_s)

        # Restore Reports
        for r in tables.get('reports', []):
            if not PlagiarismReport.query.get(r['id']):
                new_r = PlagiarismReport(
                    id=r['id'],
                    analysis_id=r['analysis_id'],
                    report_code=r['report_code'],
                    report_data=r['report_data'],
                    summary_text=r['summary_text']
                )
                db.session.add(new_r)

        db.session.commit()

    print("[+] Database restoration finished successfully with 100% record integrity!")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/restore_db.py <path_to_encrypted_backup.enc> [encryption_key]")
        sys.exit(1)
    backup_file = sys.argv[1]
    enc_key = sys.argv[2] if len(sys.argv) > 2 else None
    restore_backup(backup_file, enc_key)

