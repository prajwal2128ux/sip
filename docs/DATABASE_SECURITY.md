# Database Security & Architecture Guide - PlagiCheck

## 1. Executive Summary
The PlagiCheck database (`plagicheck_db`) stores sensitive academic records, student dissertations, user account hashes, and forensic similarity data. Protecting this data against unauthorized access, SQL injection, privilege escalation, and accidental destruction is the highest system priority.

---

## 2. Principle of Least Privilege & Account Separation

In insecure setups, web applications connect to MySQL using the `root` account or a user with global `ALL PRIVILEGES`. If an SQL injection or server compromise occurs, the attacker can drop databases, read files from the host operating system (`LOAD_FILE`), or execute commands.

PlagiCheck enforces **strict account separation**:

| Account Name | Host Binding | Permitted Operations | Forbidden Operations | Purpose |
| ------------ | ------------ | -------------------- | -------------------- | ------- |
| `plagicheck_admin` | `localhost` only | Full DDL & DML | Remote connections, public access | Schema migrations, administrative maintenance |
| `plagicheck_app` | `127.0.0.1`, `localhost` | `SELECT, INSERT, UPDATE, DELETE` (DML only) | `DROP, ALTER, CREATE, GRANT, FILE, SUPER, SHUTDOWN, RELOAD` | Python Flask Backend API operations |

### Application User Setup Script
To create the restricted database account, run the audited script:
```bash
mysql -u root -p < database/security_user_setup.sql
```

The script configures:
- Strong authentication via `caching_sha2_password`
- Specific table permissions on `plagicheck_db.*`
- Connection rate limits (Anti-DoS):
  - `MAX_QUERIES_PER_HOUR 100000`
  - `MAX_CONNECTIONS_PER_HOUR 10000`
  - `MAX_USER_CONNECTIONS 50`

---

## 3. SQL Injection Prevention & SQLAlchemy ORM
PlagiCheck utilizes **SQLAlchemy 2.0+ ORM** for all relational interactions. 

### Why PlagiCheck is Immune to SQL Injection:
1. **Parameterized Queries**: All user inputs (emails, passwords, search strings, analysis titles, raw texts) are bound as query parameters rather than concatenated into SQL strings.
   ```python
   # SECURE: Automatically compiled into parameterized query:
   # SELECT * FROM users WHERE users.email = :email_1 LIMIT 1
   user = User.query.filter_by(email=clean_email).first()
   ```
2. **Zero Raw SQL String Concatenation**: Code scans with Bandit confirm that no `db.session.execute(f"SELECT ... {input}")` constructs exist in the codebase.
3. **Automated Verification**: Our automated test suite (`tests/test_security.py::test_sql_injection_in_login` and `test_sql_injection_in_analysis_submission`) tests quotes, comment dashes (`--`), union injections, and batch statements (`DROP TABLE`), confirming all inputs are treated as literal text.

---

## 4. Foreign Key Constraints & Data Integrity

The schema (`database/schema.sql`) implements relational foreign keys with `ON DELETE CASCADE` and `ON DELETE SET NULL`:

- `analyses.user_id` -> `users.id` (`ON DELETE CASCADE`): When a student account is deleted, their uploaded documents and analyses are automatically removed.
- `analysis_sources.analysis_id` -> `analyses.id` (`ON DELETE CASCADE`): Child match data cascades cleanly without leaving orphaned records.
- `reports.analysis_id` -> `analyses.id` (`ON DELETE CASCADE`).
- `security_audit_logs.user_id` -> `users.id` (`ON DELETE SET NULL`): If a user account is deleted, the immutable security audit trail is preserved with an anonymized `NULL` foreign key for auditing.

---

## 5. Encrypted Database Connections (TLS/SSL)

In production environments (e.g., connecting to Amazon RDS, Google Cloud SQL, or external MySQL clusters), database traffic must be encrypted over the wire to prevent eavesdropping and Man-in-the-Middle (MitM) attacks.

### Enabling SSL in Production:
1. Enforce SSL on the MySQL user:
   ```sql
   ALTER USER 'plagicheck_app'@'127.0.0.1' REQUIRE SSL;
   FLUSH PRIVILEGES;
   ```
2. Supply SSL CA certificate path in `DATABASE_URL`:
   ```env
   DATABASE_URL=mysql+pymysql://plagicheck_app:DB_PASS@127.0.0.1:3306/plagicheck_db?charset=utf8mb4&ssl_ca=/etc/ssl/certs/mysql-ca.pem
   ```

---

## 6. Connection Pool Hardening (Anti-DoS)

The SQLAlchemy engine configuration in `backend/config.py` enforces connection bounds:
```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_pre_ping': True,     # Detects stale/closed connections before executing queries
    'pool_recycle': 1800,      # Recycles connections every 30 minutes to prevent timeouts
    'pool_size': 10,           # Caps normal worker connections
    'max_overflow': 20,        # Maximum temporary burst connections
    'pool_timeout': 30         # Throws timeout error rather than hanging indefinitely
}
```

---

## 7. Production Hardening Checklist for MySQL Server

- [ ] **Bind to Loopback**: Ensure `my.cnf` contains `bind-address = 127.0.0.1`. Never expose port `3306` to the public internet.
- [ ] **Disable Insecure Accounts**: Remove all anonymous accounts and default `test` databases:
  ```bash
  mysql_secure_installation
  ```
- [ ] **Disable `local_infile`**: Prevent attackers from reading server files:
  ```ini
  [mysqld]
  local_infile = 0
  ```
- [ ] **Enable Binary Logging**: Keep binary logs (`log_bin`) for point-in-time database restoration.
- [ ] **Database Error Suppression**: Ensure MySQL general query logs do not write to world-readable directories.

