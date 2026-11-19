# Environment Variables & Secret Management Guide - PlagiCheck

## 1. Overview
All credentials, database connection strings, JWT signing keys, and external service secrets must be provided via environment variables. Hardcoding secrets in source files or committing `.env` files to version control is strictly prohibited.

---

## 2. Generating High-Entropy Secrets

Before deploying, generate distinct cryptographically random secrets for each environment:

### Flask Master `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Example output: e47b2c9a1d5089f928e1d723a1a9e6bb0c84f3c7823528b18a2e587cf513c20e
```

### JWT Signing `JWT_SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Example output: d1f95a4980ebc3756281a742888cf3232bb4936d07e60b7318043ac395a14d59
```

### Encrypted Database Backup Key (`BACKUP_ENCRYPTION_KEY`):
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Example output: 43O9XFcMuMBhHIuullvRtEZlaVnVFfeJjHK1RUtbtiU=
```

---

## 3. Configuration Reference Matrix

| Variable Name | Required | Default Value | Description |
| ------------- | -------- | ------------- | ----------- |
| `FLASK_ENV` | Yes | `production` | Set to `production` or `development`. |
| `FLASK_DEBUG` | Yes | `false` | Must remain `false` in production to prevent stack trace leaks. |
| `SECRET_KEY` | Yes | *Auto-generated ephemeral* | Flask session cryptographic signing key (Min 32 bytes). |
| `JWT_SECRET_KEY` | Yes | *Auto-generated ephemeral* | HMAC-SHA256 secret key for signing JWT tokens. |
| `DB_HOST` | Yes | `127.0.0.1` | MySQL server host address (Local loopback or private VPC IP). |
| `DB_PORT` | No | `3306` | MySQL port. |
| `DB_NAME` | Yes | `plagicheck_db` | Relational database schema name. |
| `DB_USER` | Yes | `plagicheck_app` | Dedicated least-privilege application account. |
| `DB_PASSWORD` | Yes | *None* | Application database user password. |
| `DATABASE_URL` | No | *Constructed from above* | Optional complete connection URI override. |
| `COOKIE_SECURE` | Yes | `true` | Enforces `Secure` flag on cookies over HTTPS. |
| `JWT_EXPIRY_MINUTES` | No | `120` | Access token lifespan in minutes. |
| `JWT_REFRESH_DAYS` | No | `7` | Refresh token lifespan in days. |
| `MAX_UPLOAD_SIZE` | No | `26214400` (25MB) | Maximum file upload size in bytes. |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Comma-separated list of whitelisted frontend origins. |
| `BACKUP_ENCRYPTION_KEY` | Yes | *Generated on first backup* | Base64-encoded Fernet AES-256 key for database backup encryption. |

---

## 4. File Permissions & Deployment

On Linux/macOS production servers, restrict `.env` read permissions strictly to the web server process user (`www-data` or `plagicheck`):
```bash
chmod 600 .env
chown plagicheck:plagicheck .env
```
On Windows servers, restrict NTFS permissions so only the executing service user and Administrators have Read access.

