"""
PlagiCheck Production-Grade Email Dispatch Service
Multi-provider support: Resend API, Brevo API, and Standard SMTP Relay (Brevo/SendGrid/SES).
OWASP ASVS compliant: no secret leakage, secure TLS, and audit logging.
"""

import json
import logging
import os
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app

logger = logging.getLogger('security_audit')


def mask_email(email: str) -> str:
    """Mask email address for privacy display (e.g., a***n@domain.com)."""
    if not email or '@' not in email:
        return email or ''
    local_part, domain = email.split('@', 1)
    if len(local_part) <= 2:
        masked_local = local_part[0] + '***'
    else:
        masked_local = local_part[0] + '***' + local_part[-1]
    return f"{masked_local}@{domain}"


def is_production_mode() -> bool:
    """Return True if application is running in production mode."""
    if not current_app:
        env = os.getenv('FLASK_ENV', 'development').lower()
        return env in ('production', 'prod')
    env = current_app.config.get('ENV', 'development').lower()
    return env in ('production', 'prod') or current_app.config.get('IS_PRODUCTION', False)


def validate_smtp_configuration(app) -> tuple[bool, str]:
    """
    Validate email configuration during application startup.
    Checks Resend API, Brevo API, or SMTP relay settings.
    """
    resend_key = app.config.get('RESEND_API_KEY', '')
    brevo_key = app.config.get('BREVO_API_KEY', '')
    smtp_host = app.config.get('SMTP_HOST', '')
    env = app.config.get('ENV', 'development').lower()
    is_prod = env in ('production', 'prod') or app.config.get('IS_PRODUCTION', False)

    # 1. Resend API Check
    if resend_key and resend_key.strip() and not resend_key.startswith('re_placeholder'):
        msg = "[EMAIL OK] Production Resend API configured and ready."
        logger.info(msg)
        print(f"\n✅ {msg}\n")
        return True, msg

    # 2. Brevo API Check
    if brevo_key and brevo_key.strip() and not brevo_key.startswith('xkeysib-placeholder'):
        if brevo_key.startswith('xsmtpsib-'):
            msg = "[BREVO NOTICE] Brevo key starts with 'xsmtpsib-' (SMTP Key). For Brevo REST API, please generate an API key starting with 'xkeysib-' from the 'API Keys' tab at https://app.brevo.com/settings/keys/api"
            logger.warning(msg)
            print(f"\n⚠️  {msg}\n")
            return False, msg
        msg = "[EMAIL OK] Production Brevo API configured and ready."
        logger.info(msg)
        print(f"\n✅ {msg}\n")
        return True, msg

    # 3. SMTP Relay Check
    if smtp_host and smtp_host.strip():
        smtp_user = app.config.get('SMTP_USER', '')
        smtp_pass = app.config.get('SMTP_PASSWORD', '')

        if not smtp_user or 'YOUR_GMAIL' in smtp_user or not smtp_pass or 'YOUR_GOOGLE_APP_PASSWORD' in smtp_pass:
            msg = "[EMAIL SETUP] SMTP relay configured with placeholder credentials. Please set RESEND_API_KEY, BREVO_API_KEY, or valid SMTP in backend/.env"
            logger.warning(msg)
            print(f"\n⚠️  {msg}\n")
            return False, msg

        try:
            smtp_port = app.config.get('SMTP_PORT', 587)
            smtp_tls = app.config.get('SMTP_USE_TLS', True)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.ehlo()
            if smtp_tls:
                server.starttls()
                server.ehlo()
            if smtp_user and smtp_pass:
                clean_pass = str(smtp_pass).replace(' ', '').strip('\'"')
                server.login(smtp_user, clean_pass)
            server.quit()
            msg = f"[EMAIL OK] Connected & authenticated to SMTP relay at {smtp_host}:{smtp_port}"
            logger.info(msg)
            print(f"\n✅ {msg}\n")
            return True, msg
        except Exception as e:
            msg = f"[EMAIL WARNING] Failed to connect/authenticate to SMTP server {smtp_host}:{app.config.get('SMTP_PORT', 587)}: {e}"
            if is_prod:
                logger.error(f"[CRITICAL] {msg}")
                print(f"\n❌ {msg}\n")
                return False, msg
            else:
                logger.warning(f"[DEV WARNING] {msg}. Development mode simulation will be active.")
                print(f"\n⚠️  {msg}. Falling back to dev simulation.\n")
                return True, msg

    if is_prod:
        msg = "[CRITICAL] No email provider (RESEND_API_KEY, BREVO_API_KEY, or SMTP_HOST) configured in PRODUCTION mode!"
        logger.error(msg)
        print(f"\n❌ {msg}\n")
        return False, msg

    msg = "[INFO] No email provider configured. Running in DEVELOPMENT mode (simulated OTP in console)."
    logger.info(msg)
    print(f"\nℹ️  {msg}\n")
    return True, msg


# ---------------------------------------------------------------------------
# Provider 1: Resend REST API (https://resend.com)
# ---------------------------------------------------------------------------
def _send_via_resend(api_key: str, from_email: str, to_email: str, subject: str, text_content: str, html_content: str) -> dict:
    """Dispatch email via Resend HTTP REST API."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "User-Agent": "PlagiCheck-Academic/2.0"
    }

    # Format sender with PlagiCheck display name
    if "<" not in from_email:
        sender = f"PlagiCheck <{from_email}>"
    else:
        sender = from_email

    payload = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "text": text_content,
        "html": html_content
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            logger.info(f"[Resend API OK] Dispatched email to {mask_email(to_email)} (ID: {res_body.get('id')})")
            return {'success': True, 'id': res_body.get('id'), 'provider': 'resend'}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='replace')
        logger.error(f"[Resend API Error {e.code}] {err_msg}")
        return {'success': False, 'error': f"Resend API error ({e.code}): {err_msg}"}
    except Exception as e:
        logger.error(f"[Resend API Exception] {e}")
        return {'success': False, 'error': f"Resend connection failed: {e}"}


# ---------------------------------------------------------------------------
# Provider 2: Brevo REST API (https://brevo.com)
# ---------------------------------------------------------------------------
def _send_via_brevo(api_key: str, from_email: str, to_email: str, subject: str, text_content: str, html_content: str) -> dict:
    """Dispatch email via Brevo (Sendinblue) HTTP REST API."""
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key.strip(),
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "PlagiCheck-Academic/2.0"
    }

    # Extract email and name
    sender_email = from_email
    sender_name = "PlagiCheck"
    if "<" in from_email and ">" in from_email:
        sender_name = from_email.split("<")[0].strip()
        sender_email = from_email.split("<")[1].split(">")[0].strip()

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content,
        "htmlContent": html_content
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            logger.info(f"[Brevo API OK] Dispatched email to {mask_email(to_email)} (ID: {res_body.get('messageId')})")
            return {'success': True, 'id': res_body.get('messageId'), 'provider': 'brevo'}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='replace')
        logger.error(f"[Brevo API Error {e.code}] {err_msg}")
        return {'success': False, 'error': f"Brevo API error ({e.code}): {err_msg}"}
    except Exception as e:
        logger.error(f"[Brevo API Exception] {e}")
        return {'success': False, 'error': f"Brevo connection failed: {e}"}


# ---------------------------------------------------------------------------
# Provider 3: Standard SMTP Relay (Brevo SMTP, SendGrid, Amazon SES, or custom)
# ---------------------------------------------------------------------------
def _send_via_smtp(smtp_host: str, smtp_port: int, smtp_user: str, smtp_pass: str, smtp_tls: bool, from_email: str, to_email: str, subject: str, text_content: str, html_content: str) -> dict:
    """Dispatch email via standard SMTP relay."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"PlagiCheck <{from_email}>" if "<" not in from_email else from_email
        msg['To'] = to_email
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.ehlo()
        if smtp_tls:
            server.starttls()
            server.ehlo()
        if smtp_user and smtp_pass:
            clean_pass = str(smtp_pass).replace(' ', '').strip('\'"')
            server.login(smtp_user, clean_pass)
        server.sendmail(msg['From'], [to_email], msg.as_string())
        server.quit()

        logger.info(f"[SMTP OK] Dispatched email to {mask_email(to_email)}")
        return {'success': True, 'provider': 'smtp'}
    except Exception as e:
        logger.error(f"[SMTP Relay Error] {e}")
        return {'success': False, 'error': f"SMTP relay error: {e}"}


# ---------------------------------------------------------------------------
# Unified Multi-Provider Dispatcher
# ---------------------------------------------------------------------------
def _dispatch_email_core(subject: str, to_email: str, text_content: str, html_content: str, recipient_name: str = "User", otp_code: str = None) -> dict:
    """
    Multi-provider email dispatcher.
    Tries in priority order:
    1. Resend REST API (if RESEND_API_KEY set)
    2. Brevo REST API (if BREVO_API_KEY set)
    3. SMTP Relay (if SMTP_HOST set with non-placeholder credentials)
    4. Development Simulation (only if non-production and OTP_DEV_MODE=true)
    """
    resend_key = current_app.config.get('RESEND_API_KEY', '')
    brevo_key = current_app.config.get('BREVO_API_KEY', '')
    smtp_host = current_app.config.get('SMTP_HOST', '')
    from_email = current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('SMTP_FROM_EMAIL', 'PlagiCheck <onboarding@resend.dev>')
    in_prod = is_production_mode()

    provider_error = None

    # 1. Attempt Resend REST API
    if resend_key and resend_key.strip() and not resend_key.startswith('re_placeholder'):
        res = _send_via_resend(resend_key, from_email, to_email, subject, text_content, html_content)
        if res.get('success'):
            return {'success': True, 'sent': True, 'simulated': False, 'maskedEmail': mask_email(to_email), 'devOtp': None}
        provider_error = res.get('error')
        if in_prod:
            return {'success': False, 'sent': False, 'error': provider_error}

    # 2. Attempt Brevo REST API
    if brevo_key and brevo_key.strip() and not brevo_key.startswith('xkeysib-placeholder'):
        if brevo_key.startswith('xsmtpsib-'):
            provider_error = "Brevo key starts with 'xsmtpsib-' (SMTP Key). For Brevo API, please generate an API key starting with 'xkeysib-' from the 'API Keys' tab at https://app.brevo.com/settings/keys/api"
        else:
            res = _send_via_brevo(brevo_key, from_email, to_email, subject, text_content, html_content)
            if res.get('success'):
                return {'success': True, 'sent': True, 'simulated': False, 'maskedEmail': mask_email(to_email), 'devOtp': None}
            provider_error = res.get('error')
        if in_prod:
            return {'success': False, 'sent': False, 'error': provider_error}

    # 3. Attempt Standard SMTP Relay
    if smtp_host and smtp_host.strip():
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_user = current_app.config.get('SMTP_USER', '')
        smtp_pass = current_app.config.get('SMTP_PASSWORD', '')
        smtp_tls = current_app.config.get('SMTP_USE_TLS', True)

        if smtp_user and 'YOUR_GMAIL' not in smtp_user and smtp_pass and 'YOUR_GOOGLE_APP_PASSWORD' not in smtp_pass:
            res = _send_via_smtp(smtp_host, smtp_port, smtp_user, smtp_pass, smtp_tls, from_email, to_email, subject, text_content, html_content)
            if res.get('success'):
                return {'success': True, 'sent': True, 'simulated': False, 'maskedEmail': mask_email(to_email), 'devOtp': None}
            provider_error = res.get('error')
            if in_prod:
                return {'success': False, 'sent': False, 'error': provider_error}

    # 4. If in production and all active providers failed
    if in_prod:
        err_msg = provider_error or "SMTP is not configured in production. No functional email provider configured. Please set RESEND_API_KEY, BREVO_API_KEY, or SMTP credentials in environment."
        logger.error(f"[PRODUCTION ERROR] {err_msg}")
        return {'success': False, 'sent': False, 'simulated': False, 'error': err_msg}

    # 5. Check if simulation is allowed (only in automated testing or when OTP_DEV_MODE is True)
    is_testing = current_app.config.get('TESTING', False)
    dev_enabled = current_app.config.get('OTP_DEV_MODE', False)

    if not is_testing and not dev_enabled:
        err_msg = provider_error or "Email service is not configured. Please add RESEND_API_KEY, BREVO_API_KEY, or SMTP credentials in backend/.env to send real emails."
        logger.error(f"[EMAIL ERROR] {err_msg}")
        return {'success': False, 'sent': False, 'simulated': False, 'error': err_msg}

    # 6. Development simulation fallback (local testing or OTP_DEV_MODE only)
    if otp_code:
        print(f"\n=======================================================")
        print(f"[DEVELOPMENT OTP DISPATCH SIMULATION]")
        print(f"To:         {to_email} ({recipient_name})")
        print(f"Subject:    {subject}")
        print(f"OTP Code:   >>> {otp_code} <<< (Valid for 5 minutes)")
        print(f"Notice:     Configure RESEND_API_KEY, BREVO_API_KEY, or SMTP in backend/.env for real delivery.")
        print(f"=======================================================\n")
    else:
        print(f"\n=======================================================")
        print(f"[DEVELOPMENT EMAIL NOTIFICATION SIMULATION]")
        print(f"To:         {to_email} ({recipient_name})")
        print(f"Subject:    {subject}")
        print(f"Content:\n{text_content}")
        print(f"=======================================================\n")

    return {
        'success': True,
        'sent': True,
        'simulated': True,
        'devOtp': otp_code if (dev_enabled or is_testing) else None,
        'maskedEmail': mask_email(to_email)
    }


# ---------------------------------------------------------------------------
# Branded OTP Email Template (Exact Copy as specified)
# ---------------------------------------------------------------------------
def send_otp_email(recipient_email: str, recipient_name: str, otp_code: str) -> dict:
    """
    Dispatch a 6-digit OTP verification email for login with exact PlagiCheck branding:
    Subject: Your PlagiCheck Login Verification Code
    Sender: PlagiCheck
    Body format:
    Hello,
    Your verification code for PlagiCheck is: [6-DIGIT OTP]
    This code is valid for 5 minutes.
    If you did not request this verification code, please ignore this email.
    Thank you,
    Team PlagiCheck
    """
    subject = "Your PlagiCheck Login Verification Code"

    text_content = (
        f"Hello,\n\n"
        f"Your verification code for PlagiCheck is:\n\n"
        f"{otp_code}\n\n"
        f"This code is valid for 5 minutes.\n\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .logo-badge {{ display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #2563eb; font-size: 24px; margin-bottom: 12px; }}
    .title {{ font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }}
    .otp-box {{ background: #eff6ff; border: 1px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0; }}
    .otp-code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', monospace; }}
    .info {{ font-size: 13px; color: #475569; line-height: 1.6; }}
    .footer {{ margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">🛡️</div>
      <h2 class="title">PlagiCheck Verification</h2>
    </div>

    <p style="font-size: 14px; margin: 0 0 12px 0;">Hello,</p>
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">Your verification code for PlagiCheck is:</p>
    
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>

    <p class="info">
      ⏰ <strong>This code is valid for 5 minutes.</strong><br>
      🔒 If you did not request this verification code, please ignore this email.
    </p>

    <p style="font-size: 14px; margin: 24px 0 0 0; color: #334155;">
      Thank you,<br>
      <strong>Team PlagiCheck</strong>
    </p>

    <div class="footer">
      This is an automated security email from PlagiCheck AI-Powered Plagiarism Detection System.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>"""

    return _dispatch_email_core(subject, recipient_email, text_content, html_content, recipient_name=recipient_name, otp_code=otp_code)


def send_registration_otp_email(recipient_email: str, recipient_name: str, otp_code: str, expiry_min: int = 5) -> dict:
    """Send registration verification email."""
    subject = "Your PlagiCheck Registration Verification Code"
    text_content = (
        f"Hello,\n\n"
        f"Your verification code for PlagiCheck is:\n\n"
        f"{otp_code}\n\n"
        f"This code is valid for {expiry_min} minutes.\n\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:24px; }}
.card {{ max-width:480px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:36px; }}
.otp-box {{ background:#f0fdf4; border:1px dashed #22c55e; border-radius:10px; padding:20px; text-align:center; margin:24px 0; }}
.otp-code {{ font-size:34px; font-weight:800; letter-spacing:8px; color:#15803d; font-family:monospace; }}
</style></head>
<body>
<div class="card">
  <h2 style="margin-top:0; color:#0f172a;">🛡️ Welcome to PlagiCheck</h2>
  <p>Hello,</p>
  <p>Your verification code for PlagiCheck is:</p>
  <div class="otp-box"><div class="otp-code">{otp_code}</div></div>
  <p style="font-size:13px; color:#475569;">⏰ <strong>This code is valid for {expiry_min} minutes.</strong><br>If you did not create a PlagiCheck account, please ignore this email.</p>
  <p style="font-size:14px; margin-top:24px;">Thank you,<br><strong>Team PlagiCheck</strong></p>
</div>
</body>
</html>"""
    return _dispatch_email_core(subject, recipient_email, text_content, html_content, recipient_name=recipient_name, otp_code=otp_code)


def send_password_reset_email(recipient_email: str, recipient_name: str, otp_code: str, expiry_min: int = 5) -> dict:
    """Send password reset OTP email."""
    subject = "Your PlagiCheck Password Reset Verification Code"
    text_content = (
        f"Hello,\n\n"
        f"Your verification code for PlagiCheck password reset is:\n\n"
        f"{otp_code}\n\n"
        f"This code is valid for {expiry_min} minutes.\n\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:24px; }}
.card {{ max-width:480px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:36px; }}
.otp-box {{ background:#fff7ed; border:1px dashed #f97316; border-radius:10px; padding:20px; text-align:center; margin:24px 0; }}
.otp-code {{ font-size:34px; font-weight:800; letter-spacing:8px; color:#c2410c; font-family:monospace; }}
</style></head>
<body>
<div class="card">
  <h2 style="margin-top:0; color:#0f172a;">🛡️ Password Reset Request</h2>
  <p>Hello,</p>
  <p>Your verification code for PlagiCheck is:</p>
  <div class="otp-box"><div class="otp-code">{otp_code}</div></div>
  <p style="font-size:13px; color:#475569;">⏰ <strong>This code is valid for {expiry_min} minutes.</strong><br>If you did not request a password reset, please change your credentials immediately.</p>
  <p style="font-size:14px; margin-top:24px;">Thank you,<br><strong>Team PlagiCheck</strong></p>
</div>
</body>
</html>"""
    return _dispatch_email_core(subject, recipient_email, text_content, html_content, recipient_name=recipient_name, otp_code=otp_code)


def send_password_changed_notification(recipient_email: str, recipient_name: str) -> dict:
    """Send password change confirmation email."""
    subject = "Your PlagiCheck password has been changed"
    text_body = (
        f"Hello,\n\n"
        f"Your PlagiCheck account password was successfully updated.\n\n"
        f"If you did not make this change, please contact support immediately.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )
    html_body = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
<div style="max-width:480px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:16px;">
  <h2 style="color:#0f172a;margin-top:0;">🛡️ Password Changed</h2>
  <p>Hello,</p>
  <p>Your PlagiCheck account password was successfully updated.</p>
  <p style="color:#dc2626;font-weight:600;">If you did not make this change, please contact support immediately.</p>
  <p>Thank you,<br><strong>Team PlagiCheck</strong></p>
</div></body></html>"""
    return _dispatch_email_core(subject, recipient_email, text_body, html_body, recipient_name=recipient_name, otp_code=None)


def send_recovery_email_verification(recipient_email: str, recipient_name: str, otp_code: str, expiry_min: int = 5) -> dict:
    """Send recovery email OTP verification."""
    subject = "Verify your PlagiCheck recovery email"
    text_body = (
        f"Hello,\n\n"
        f"Your recovery email verification code is: {otp_code}\n\n"
        f"This code is valid for {expiry_min} minutes.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )
    html_body = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
<div style="max-width:480px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:16px;">
  <h2 style="color:#0f172a;margin-top:0;">🛡️ Verify Recovery Email</h2>
  <p>Hello,</p>
  <p>Your recovery verification code is:</p>
  <div style="background:#eff6ff;border:1px dashed #3b82f6;padding:16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:6px;color:#1d4ed8;font-family:monospace;margin:20px 0;">{otp_code}</div>
  <p style="font-size:13px;color:#475569;">⏰ Valid for {expiry_min} minutes.</p>
  <p>Thank you,<br><strong>Team PlagiCheck</strong></p>
</div></body></html>"""
    return _dispatch_email_core(subject, recipient_email, text_body, html_body, recipient_name=recipient_name, otp_code=otp_code)


def send_recovery_code_used_notification(recipient_email: str, recipient_name: str) -> dict:
    """Send notification when a recovery code is used."""
    subject = "A PlagiCheck recovery code was used"
    text_body = (
        f"Hello,\n\n"
        f"One of your PlagiCheck account recovery codes was just used to access your account.\n\n"
        f"If this was not you, please secure your account immediately.\n\n"
        f"Thank you,\n"
        f"Team PlagiCheck"
    )
    html_body = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
<div style="max-width:480px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:16px;">
  <h2 style="color:#0f172a;margin-top:0;">🛡️ Recovery Code Used</h2>
  <p>Hello,</p>
  <p>One of your account recovery codes was used to access your PlagiCheck account.</p>
  <p style="color:#dc2626;font-weight:600;">If you did not use a recovery code, please secure your account immediately.</p>
  <p>Thank you,<br><strong>Team PlagiCheck</strong></p>
</div></body></html>"""
    return _dispatch_email_core(subject, recipient_email, text_body, html_body, recipient_name=recipient_name, otp_code=None)
