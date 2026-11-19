"""
PlagiCheck Security Hardening - SQLAlchemy Models Module
Implements relational schema mapped to MySQL 8.0+ / MariaDB.
Enforces foreign key cascades, proper indexing, and strict schema validation.
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    """User accounts table storing students, faculty, and administrators."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Student')
    institution = db.Column(db.String(255), nullable=False, default='Academic Institution')
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships with strict cascade deletion
    analyses = db.relationship('Analysis', backref='user', cascade='all, delete-orphan', lazy=True)
    audit_logs = db.relationship('SecurityAuditLog', backref='user', lazy=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        """Safe user serialization (strictly excludes password_hash)."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'institution': self.institution,
            'isActive': self.is_active,
            'emailVerified': self.email_verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class Analysis(db.Model):
    """Submitted text and plagiarism analysis records."""
    __tablename__ = 'analyses'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False, default='Untitled Document')
    submitted_text = db.Column(db.Text, nullable=False)
    word_count = db.Column(db.Integer, nullable=False, default=0)
    character_count = db.Column(db.Integer, nullable=False, default=0)
    sentence_count = db.Column(db.Integer, nullable=False, default=0)
    similarity_percentage = db.Column(db.Float, nullable=False, default=0.0)
    originality_percentage = db.Column(db.Float, nullable=False, default=100.0)
    ai_probability_percentage = db.Column(db.Float, nullable=False, default=0.0)
    human_percentage = db.Column(db.Float, nullable=False, default=100.0)
    ai_verdict = db.Column(db.String(255), nullable=True)
    risk_level = db.Column(db.String(20), nullable=False, default='LOW')
    processing_time_ms = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False, index=True)

    # Cascading child relationships
    sources = db.relationship('AnalysisSource', backref='analysis', cascade='all, delete-orphan', lazy=True)
    reports = db.relationship('PlagiarismReport', backref='analysis', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, include_sources=True):
        data = {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'submittedText': self.submitted_text,
            'wordCount': self.word_count,
            'characterCount': self.character_count,
            'sentenceCount': self.sentence_count,
            'similarityPercentage': round(self.similarity_percentage, 2),
            'originalityPercentage': round(self.originality_percentage, 2),
            'aiProbabilityPercentage': round(self.ai_probability_percentage, 2),
            'humanPercentage': round(self.human_percentage, 2),
            'aiVerdict': self.ai_verdict or ('High AI Risk' if self.ai_probability_percentage > 50 else 'Human Authored'),
            'riskLevel': self.risk_level,
            'processingTimeMs': self.processing_time_ms,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
        if include_sources:
            data['sources'] = [source.to_dict() for source in self.sources]
        return data


class AnalysisSource(db.Model):
    """Matching sources linked to a specific analysis."""
    __tablename__ = 'analysis_sources'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    analysis_id = db.Column(db.Integer, db.ForeignKey('analyses.id', ondelete='CASCADE'), nullable=False, index=True)
    source_name = db.Column(db.String(255), nullable=False)
    source_url = db.Column(db.String(512), nullable=False)
    matched_text = db.Column(db.Text, nullable=False)
    match_percentage = db.Column(db.Float, nullable=False, default=0.0)
    matched_phrases_count = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'analysisId': self.analysis_id,
            'sourceName': self.source_name,
            'sourceUrl': self.source_url,
            'matchedText': self.matched_text,
            'matchPercentage': round(self.match_percentage, 2),
            'matchedPhrasesCount': self.matched_phrases_count,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class PlagiarismReport(db.Model):
    """Generated comprehensive plagiarism reports and verification codes."""
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    analysis_id = db.Column(db.Integer, db.ForeignKey('analyses.id', ondelete='CASCADE'), nullable=False, index=True)
    report_code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    report_data = db.Column(db.JSON, nullable=False)
    summary_text = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'analysisId': self.analysis_id,
            'reportCode': self.report_code,
            'reportData': self.report_data,
            'summaryText': self.summary_text,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class SecurityAuditLog(db.Model):
    """Immutable audit trail for all security, authentication, and access events."""
    __tablename__ = 'security_audit_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_type = db.Column(db.String(64), nullable=False, index=True)
    severity = db.Column(db.String(20), nullable=False, default='LOW')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(512), nullable=True)
    resource_type = db.Column(db.String(64), nullable=True)
    resource_id = db.Column(db.String(64), nullable=True)
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'eventType': self.event_type,
            'severity': self.severity,
            'userId': self.user_id,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'resourceType': self.resource_type,
            'resourceId': self.resource_id,
            'details': self.details,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class RevokedToken(db.Model):
    """Stores revoked JWT token identifiers (JTI) to prevent replay attacks upon logout."""
    __tablename__ = 'revoked_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    revoked_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)


class EmailOTP(db.Model):
    """Stores temporary one-time authentication codes for 2FA verification."""
    __tablename__ = 'email_otps'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    temp_token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=5, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    user = db.relationship('User', backref=db.backref('otps', cascade='all, delete-orphan'))


class PendingRegistration(db.Model):
    """Stores unverified registrations awaiting email OTP confirmation."""
    __tablename__ = 'pending_registrations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Student')
    institution = db.Column(db.String(255), nullable=False, default='Academic Institution')
    otp_hash = db.Column(db.String(255), nullable=False)
    temp_token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=5, nullable=False)
    resend_count = db.Column(db.Integer, default=0, nullable=False)
    last_resend_at = db.Column(db.DateTime, nullable=True)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)


class PasswordResetOTP(db.Model):
    """Stores password reset tokens/OTPs."""
    __tablename__ = 'password_reset_otps'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    temp_token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=5, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    user = db.relationship('User', backref=db.backref('password_reset_otps', cascade='all, delete-orphan'))


class RecoveryEmail(db.Model):
    """Alternative recovery email addresses per user."""
    __tablename__ = 'recovery_emails'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    recovery_email = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    otp_hash = db.Column(db.String(255), nullable=True)
    temp_token = db.Column(db.String(64), nullable=True, index=True)
    otp_expires_at = db.Column(db.DateTime, nullable=True)
    otp_attempts = db.Column(db.Integer, default=0, nullable=False)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    user = db.relationship('User', backref=db.backref('recovery_email_record', uselist=False, cascade='all, delete-orphan'))


class RecoveryCode(db.Model):
    """One-time recovery codes for account access when email is unavailable."""
    __tablename__ = 'recovery_codes'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    code_index = db.Column(db.Integer, nullable=False)  # 1-10
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    user = db.relationship('User', backref=db.backref('recovery_codes', cascade='all, delete-orphan'))


class AccountRecoveryRequest(db.Model):
    """Admin-assisted account recovery requests."""
    __tablename__ = 'account_recovery_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    account_email = db.Column(db.String(255), nullable=False, index=True)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='PENDING', index=True)  # PENDING, APPROVED, DENIED
    admin_notes = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    new_email = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)


class UserSession(db.Model):
    """Tracks active authenticated sessions per user."""
    __tablename__ = 'user_sessions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    user = db.relationship('User', backref=db.backref('sessions', cascade='all, delete-orphan'))
