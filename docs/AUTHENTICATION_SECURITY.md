# Authentication & Password Security Guide - PlagiCheck

## 1. Executive Summary
Authentication is the first line of defense protecting student confidentiality and academic integrity. PlagiCheck implements **OWASP ASVS Level 2** compliant authentication utilizing **Argon2id** password hashing, stateless JSON Web Tokens with server-side revocation, rate-limited endpoints, and hardened session cookies.

---

## 2. Password Hashing with Argon2id

### Why Argon2id?
Older hashing methods like MD5, SHA-1, and un-salted SHA-256 are vulnerable to high-speed offline cracking via modern GPU/ASIC clusters (generating billions of hashes per second). 

PlagiCheck implements **Argon2id** (RFC 9106), the winner of the Password Hashing Competition. Argon2id combines:
- **Argon2d** (data-dependent memory access, immune to side-channel timing attacks)
- **Argon2i** (data-independent memory access, optimized for password hashing)

### Cryptographic Parameters
Configured in `backend/security/auth.py`:
```python
_hasher = PasswordHasher(
    time_cost=3,          # 3 iterations
    memory_cost=65536,    # 64 MB of RAM per hash
    parallelism=4,        # 4 concurrent execution threads
    hash_len=32,          # 256-bit output hash
    salt_len=16           # 128-bit cryptographically secure random salt
)
```
- **GPU-Resistant**: Requiring 64MB of dedicated RAM per attempt makes distributed brute-force attacks economically and computationally infeasible.
- **Timing-Safe**: Password comparison uses constant-time byte comparisons to eliminate side-channel timing leaks.

---

## 3. Password Strength Enforcement

During registration and password changes, inputs are validated against `validate_password_strength()`:
- **Length**: Minimum 8 characters, maximum 128 characters.
- **Character Diversity**: Must contain uppercase letters (`[A-Z]`), lowercase letters (`[a-z]`), and numbers or symbols (`[\d!@#$%^&*...]`).
- **Dictionary Blacklist**: Common weak passwords (`password123`, `admin123`, `plagicheck`, `qwertyuiop`) are rejected unconditionally.

---

## 4. Session Management & JWT Architecture

PlagiCheck supports dual authentication channels:
1. **Bearer Authorization Header**: Standard `Authorization: Bearer <token>` for SPA frontend and programmatic API access.
2. **Hardened HttpOnly Cookies**: For browser-managed session longevity.

### Token Expiration Limits:
- **Access Token**: Valid for **120 minutes** (2 hours). Short-lived to limit exposure if intercepted.
- **Refresh Token**: Valid for **7 days**. Used solely on `/api/v1/auth/refresh`.

### Cookie Hardening Configuration:
| Attribute | Configured Value | Security Purpose |
| --------- | ---------------- | ---------------- |
| `HttpOnly` | `True` | Prevents JavaScript (`document.cookie`) from reading the session token (Complete XSS defense). |
| `Secure` | `True` (Production) | Transmitted exclusively over encrypted HTTPS connections. |
| `SameSite` | `Lax` | Protects against Cross-Site Request Forgery (CSRF) on cross-origin requests. |
| `Path` | `/` and `/api/v1/auth` | Restricts cookie scope to authorized endpoints. |

---

## 5. Token Revocation & Secure Logout

Stateless JWT tokens are commonly vulnerable to replay attacks because they remain technically valid until their expiration timestamp.

PlagiCheck solves this via **Server-Side Token Revocation**:
1. When a token is issued, a cryptographically unique `jti` (UUIDv4) is embedded in the payload.
2. When the user logs out (`POST /api/v1/auth/logout`), the backend inserts the `jti` into the `revoked_tokens` database table.
3. Every protected API call passes through `@jwt_required_custom`, which queries `is_token_revoked(jti)`.
4. If the token was revoked, the request is immediately aborted with `401 Unauthorized`.
5. Expired revoked tokens are automatically pruned by background maintenance tasks.

---

## 6. Rate Limiting & Brute-Force Defense

Configured using `Flask-Limiter` on sensitive authentication endpoints:
- `POST /api/v1/auth/login`: Capped at **10 attempts per minute per IP**.
- `POST /api/v1/auth/register`: Capped at **5 attempts per minute per IP**.
- `Exceeded Limit Response`: Standardized `429 Too Many Requests` with security audit logging (`RATE_LIMIT_EXCEEDED`).

---

## 7. Email OTP Two-Factor Authentication (2FA)

To safeguard confidential academic documents against credential stuffing, stolen passwords, or unauthorized logins, PlagiCheck enforces an **Email One-Time Password (OTP) verification stage**:

### 1. Verification Architecture & Workflow
1. **Primary Authentication**: User submits email and password (`POST /api/v1/auth/login`).
2. **Credential Validation**: Argon2id verifies user password.
3. **OTP Generation**: If valid, the system generates a high-entropy 6-digit numeric OTP (`secrets.randbelow(900000) + 100000`) and a cryptographically secure random session salt (`tempToken = secrets.token_urlsafe(32)`).
4. **HMAC Storage**: The OTP is **never** stored in plain-text. The backend computes an HMAC SHA-256 digest using `tempToken` as the key and persists this in the `email_otps` table with an expiration timestamp (default: 10 minutes) and max retry count (5 attempts).
5. **Secure Email Dispatch**: An email is dispatched via SMTP TLS with academic branding containing the 6-digit code.
6. **Frontend Transition**: The server returns `{ requiresOtp: true, tempToken: "...", maskedEmail: "a***n@domain.edu" }`. The UI automatically switches to the OTP verification screen.
7. **OTP Submission (`POST /api/v1/auth/verify-otp`)**:
   - Compares the candidate OTP using timing-safe HMAC verification.
   - Enforces expiration and maximum 5 failed attempts.
   - Marks the OTP record as consumed (`is_used = True`).
   - Issues full JWT access and refresh tokens.
   - Records an `OTP_VERIFIED` event in `security_audit_logs`.

### 2. Anti-Brute-Force & Security Controls
- **Maximum Attempt Lockout**: Any challenge exceeding 5 invalid attempts is permanently locked.
- **Single-Use Enforcement**: Verified codes are consumed instantly and cannot be replayed.
- **Privacy Masking**: User emails returned to client states are masked (e.g. `p***n@university.edu`).
- **Resend Throttle**: Resend OTP endpoint (`POST /api/v1/auth/resend-otp`) resets attempts with rate-limiting and a 60-second client-side cooldown countdown.
- **Development Fallback**: In environments without configured SMTP credentials, the OTP is logged to server console output and passed to dev mode for zero-friction local testing.

