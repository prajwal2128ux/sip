# Encrypted Backup & Disaster Recovery Guide - PlagiCheck

## 1. Overview
Confidential student research papers and analysis reports require reliable, encrypted backups to prevent data loss resulting from hardware failure, ransomware, or operational errors. PlagiCheck provides automated, cryptographically secure backup and restoration tooling.

---

## 2. Backup Architecture & Encryption Standards

PlagiCheck implements **AES-256-CBC with HMAC-SHA256 (Fernet)** for all backup archives.

### Security Guarantees:
1. **Confidentiality**: Even if the backup storage server or S3 bucket is compromised, attacker cannot read student documents without the secret `BACKUP_ENCRYPTION_KEY`.
2. **Integrity (Tamper Resistance)**: The archive is verified against two independent SHA-256 checksums (unencrypted payload and encrypted file envelope). Any unauthorized modification, bit-flip, or truncation will cause decryption to abort immediately.
3. **Metadata Manifest**: A companion JSON file (`.meta.json`) is generated alongside each `.enc` archive documenting timestamps, record counts, and checksums.

---

## 3. Creating an Encrypted Backup

To execute an on-demand encrypted backup:
```bash
python scripts/backup_db.py
```

### Execution Output:
```
[*] Starting PlagiCheck database backup at 20261118_060644 UTC...
[+] Backup successfully completed and encrypted!
    Encrypted Archive: backups/plagicheck_backup_20261118_060644.enc (2,468 bytes)
    Metadata Manifest: backups/plagicheck_backup_20261118_060644.meta.json
    SHA-256 Checksum:  1c7c2b10036056e0e636a8b2867c22da46cfb64f779b5ca506f51e97310cd5f0
```

---

## 4. Restoring Database from an Encrypted Backup

To restore data from an encrypted archive into MySQL:
```bash
python scripts/restore_db.py backups/plagicheck_backup_20261118_060644.enc [KEY]
```
If `BACKUP_ENCRYPTION_KEY` is present in your active `.env`, the key argument may be omitted.

### Verification Performed During Restore:
1. Validates that the `.enc` file matches the `encrypted_sha256` recorded in the manifest.
2. Authenticates and decrypts using the provided AES-256 key.
3. Computes the SHA-256 hash of the decrypted payload and matches against `unencrypted_sha256`.
4. Idempotently restores users, analyses, analysis sources, reports, and security audit logs into the database.

---

## 5. Automated Backup Scheduling

### Linux/UNIX (cron):
Add a daily cron job running at 02:00 AM UTC:
```bash
0 2 * * * cd /opt/plagicheck && /opt/plagicheck/venv/bin/python scripts/backup_db.py >> /var/log/plagicheck_backup.log 2>&1
```

### Windows (Task Scheduler via PowerShell):
```powershell
$Action = New-ScheduledTaskAction -Execute "python.exe" -Argument "scripts/backup_db.py" -WorkingDirectory "C:\plagicheck"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "PlagiCheckDailyBackup" -Action $Action -Trigger $Trigger -User "SYSTEM"
```

---

## 6. Document Retention & Secure Deletion Policies

- **Backup Retention**:
  - Daily backups: Retained for 30 days.
  - Weekly backups: Retained for 90 days.
  - Monthly archives: Retained for 1 academic year (365 days).
- **Secure File Shredding**:
  When deleting old backup archives or temporary student uploads, use multi-pass overwrite tools (`shred -u` on Linux or `sdelete` on Windows) to prevent forensic magnetic remanence recovery.

