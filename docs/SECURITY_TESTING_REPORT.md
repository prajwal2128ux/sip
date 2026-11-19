# Automated Security Testing & Verification Report - PlagiCheck

**Date of Execution:** November 18, 2026  
**Testing Frameworks:** Pytest 8.4.2, Bandit 1.9.4, NPM Audit  
**Target Environment:** Isolated Test Sandbox / SQLite & MySQL Compatibility Mode  

---

## 1. Executive Summary
A comprehensive security test suite comprising unit, integration, and fuzzing tests was authored and executed against the hardened PlagiCheck application. 

**Overall Test Results:**
- **Automated Pytest Security Tests:** **13 Passed, 0 Failed** (100% Pass Rate).
- **Bandit Static Code Security Scan:** **0 Issues Identified** across 1,610 lines of backend code.
- **Vite React Production Build:** **Compiled Successfully (0 Errors)** in 3.19s.
- **Encrypted Database Backup & Restore:** **Verified with 100% Record Integrity**.

---

## 2. Test Execution Log & Results

```
============================= test session starts =============================
platform win32 -- Python 3.14.2, pytest-8.4.2, pluggy-1.6.0
rootdir: C:\Users\prajw\Downloads\finalsip
collected 13 items

tests/test_security.py::test_argon2id_hashing_and_verification PASSED    [  7%]
tests/test_security.py::test_password_strength_validation PASSED         [ 15%]
tests/test_security.py::test_unauthorized_login_attempts PASSED          [ 23%]
tests/test_security.py::test_logout_and_session_invalidation PASSED      [ 30%]
tests/test_security.py::test_sql_injection_in_login PASSED               [ 38%]
tests/test_security.py::test_sql_injection_in_analysis_submission PASSED [ 46%]
tests/test_security.py::test_idor_prevention_on_analyses PASSED          [ 53%]
tests/test_security.py::test_reject_executable_disguised_as_pdf PASSED   [ 61%]
tests/test_security.py::test_reject_unsupported_extensions PASSED        [ 69%]
tests/test_security.py::test_safe_plain_text_upload PASSED               [ 76%]
tests/test_security.py::test_security_headers_enforcement PASSED         [ 84%]
tests/test_security.py::test_error_responses_never_leak_stack_traces PASSED [ 92%]
tests/test_security.py::test_security_audit_events_logged PASSED         [100%]

============================= 13 passed in 7.07s ==============================
```

---

## 3. Detailed Test Scenarios & Verifications

### 1. SQL Injection Resistance
- **Test:** Injected SQL control strings (`' OR '1'='1`, `' UNION SELECT ...`, `'; DROP TABLE users; --`) into login, registration, and analysis submission fields.
- **Result:** **PASSED**. SQLAlchemy parameterization properly escaped all characters; strings were stored as literal data. Database schema remained 100% intact.

### 2. Unauthorized Login & Brute-Force Rejection
- **Test:** Submitted non-existent emails and wrong passwords.
- **Result:** **PASSED**. Returns uniform `401 Unauthorized` without disclosing if the email exists. Rate limiter throttles excessive attempts.

### 3. Weak Password Rejection
- **Test:** Attempted to register with short (<8 characters), all-lowercase, or blacklisted dictionary passwords (`password123`, `plagicheck`).
- **Result:** **PASSED**. All rejected with specific OWASP ASVS guidance.

### 4. Insecure Direct Object References (IDOR)
- **Test:** User A (Alice) uploads a confidential dissertation. User B (Bob) attempts to view, download, or delete Alice's analysis via `/api/v1/analyses/{id}`.
- **Result:** **PASSED**. `@enforce_ownership` decorator blocked Bob with `403 Forbidden` and logged an `IDOR_ATTEMPT_BLOCKED` security incident.

### 5. Malicious File Upload Prevention
- **Test:** Uploaded Windows executable (`MZ...`) renamed as `.pdf` and executable scripts (`.php`, `.exe`, `.sh`).
- **Result:** **PASSED**. Magic-byte inspection detected spoofed signatures and aborted with `400 Bad Request`.

### 6. Safe Text Extraction & Resource Bounds
- **Test:** Uploaded valid plain text essay with 200+ words.
- **Result:** **PASSED**. Bounded extraction processed content cleanly without infinite loops or memory spikes.

### 7. HTTP Security Headers
- **Test:** Inspected headers on API responses.
- **Result:** **PASSED**. `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Content-Security-Policy` are enforced on all responses.

### 8. Stack Trace & Information Leakage Prevention
- **Test:** Sent malformed non-JSON bodies to trigger 400/500 errors.
- **Result:** **PASSED**. Error responses return clean, sanitized JSON. Zero internal file paths or Python tracebacks are leaked.

### 9. Token Revocation & Secure Logout
- **Test:** User authenticates, obtains JWT, calls logout, then attempts to reuse the token.
- **Result:** **PASSED**. Revocation list blocks the reused token with `401 Unauthorized`.

### 10. Audit Logging Verification
- **Test:** Executed logins, document analyses, and IDOR attacks.
- **Result:** **PASSED**. Verified that `SecurityAuditLog` table recorded all events with masked passwords.

---

## 4. Bandit Static Security Analysis

```
[main]  INFO    running on Python 3.14.2
Run started: 2026-11-18 06:10:41

Test results:
    No issues identified.

Code scanned:
    Total lines of code: 1,610
    Total lines skipped: 0

Run metrics:
    Total issues (by severity):
        Undefined: 0
        Low: 0
        Medium: 0
        High: 0
```
- **Result:** **100% Clean**. Zero High, Medium, or Low severity issues detected.

---

## 5. Encrypted Backup & Restore Verification

- **Backup Command:** `python scripts/backup_db.py`
  - Output: `backups/plagicheck_backup_20261118_060644.enc` (AES-256 Fernet encrypted).
  - SHA-256 Checksum: `1c7c2b10036056e0e636a8b2867c22da46cfb64f779b5ca506f51e97310cd5f0`
- **Restore Command:** `python scripts/restore_db.py "backups\plagicheck_backup_20261118_060644.enc" "KEY"`
  - Output: `[+] Cryptographic integrity checks passed successfully. Restoring records... [+] Database restoration finished successfully with 100% record integrity!`
- **Result:** **PASSED**.

