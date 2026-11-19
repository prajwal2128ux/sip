# Production Security Deployment Checklist - PlagiCheck

Use this checklist before releasing PlagiCheck to production or academic institution infrastructure.

---

## Phase 1: Environment & Secrets Configuration

- [ ] **1. Create Dedicated `.env` File**:
  Copy `.env.example` to `.env`. Ensure `.env` is **never committed to Git**.
- [ ] **2. Generate Cryptographically Secure Keys**:
  ```bash
  # Flask SECRET_KEY
  python -c "import secrets; print(secrets.token_hex(32))"
  # JWT_SECRET_KEY
  python -c "import secrets; print(secrets.token_hex(32))"
  # BACKUP_ENCRYPTION_KEY
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
- [ ] **3. Restrict File Permissions**:
  ```bash
  chmod 600 .env
  chown plagicheck:plagicheck .env
  ```
- [ ] **4. Disable Debug Mode**:
  Confirm `FLASK_ENV=production` and `FLASK_DEBUG=false` in `.env`.

---

## Phase 2: Database Provisioning & Hardening

- [ ] **1. Run Security User Script**:
  ```bash
  mysql -u root -p < database/security_user_setup.sql
  ```
- [ ] **2. Verify Least-Privilege Grants**:
  Connect as `plagicheck_app` and verify it can NOT execute `DROP TABLE`:
  ```bash
  mysql -u plagicheck_app -p -e "DROP TABLE plagicheck_db.users;"
  # Expected: ERROR 1142 (42000): DROP command denied to user 'plagicheck_app'@'localhost'
  ```
- [ ] **3. Restrict MySQL Binding**:
  Ensure `my.cnf` contains `bind-address = 127.0.0.1`.
- [ ] **4. Enforce TLS/SSL Connections**:
  Enable `REQUIRE SSL` on MySQL user for any remote or cloud database connection.

---

## Phase 3: Application Server & Process Management

- [ ] **1. Production WSGI Server**:
  Do NOT use `flask run` or `python backend/app.py` directly in production.
  - **Linux**: Run Gunicorn with worker timeouts:
    ```bash
    gunicorn -w 4 -b 127.0.0.1:5000 --timeout 60 "backend.app:create_app()"
    ```
  - **Windows**: Run Waitress:
    ```bash
    waitress-serve --port=5000 --listen=127.0.0.1 "backend.app:create_app()"
    ```
- [ ] **2. Process Supervision (systemd / Windows Service)**:
  Configure automatic restart on failure and execution under an unprivileged system service account.
- [ ] **3. Secure Upload Storage Path**:
  Ensure `backend/storage/uploads/` is outside the web server's document root, with no script execution permissions.

---

## Phase 4: Web Server & Reverse Proxy (Nginx / Caddy)

- [ ] **1. Enforce HTTPS / TLS 1.3**:
  Obtain valid SSL certificate (Let's Encrypt / DigiCert). Redirect all HTTP port 80 traffic to HTTPS 443.
- [ ] **2. Production Nginx Configuration**:
  ```nginx
  server {
      listen 443 ssl http2;
      server_name plagicheck.university.edu;

      ssl_certificate /etc/letsencrypt/live/plagicheck/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/plagicheck/privkey.pem;
      ssl_protocols TLSv1.2 TLSv1.3;

      # Security Headers
      add_header X-Content-Type-Options nosniff always;
      add_header X-Frame-Options DENY always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
      add_header Referrer-Policy strict-origin-when-cross-origin always;

      # Frontend Static Build
      location / {
          root /opt/plagicheck/dist;
          try_files $uri $uri/ /index.html;
      }

      # Backend API Reverse Proxy
      location /api/ {
          proxy_pass http://127.0.0.1:5000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          client_max_body_size 25M;
      }
  }
  ```

---

## Phase 5: Automated Backups & Monitoring

- [ ] **1. Enable Scheduled Backups**:
  Configure daily cron / task scheduler executing `python scripts/backup_db.py`.
- [ ] **2. Verify Restoration Drill**:
  Perform a test restore on a staging server using `python scripts/restore_db.py`.
- [ ] **3. Monitor Security Audit Log**:
  Inspect `backend/logs/security_audit.log` for anomalous spikes in `LOGIN_FAILURE`, `IDOR_ATTEMPT_BLOCKED`, or `RATE_LIMIT_EXCEEDED`.
- [ ] **4. Dependency Updates**:
  Schedule monthly security patch updates using `npm audit` and `pip-audit`.

