# Security Policy & Architecture - PlagiCheck

## 1. Overview
PlagiCheck is an academic plagiarism detection and AI-content analysis platform designed to process, analyze, and store confidential student dissertations, research papers, and academic assessments. This document defines the security architecture, vulnerability disclosure guidelines, and defense-in-depth principles implemented across the application.

## 2. Security Architecture (Defense in Depth)

```
┌────────────────────────────────────────────────────────────────┐
│               Frontend Security Layer (React.js)               │
│  - Content Security Policy (CSP) & Secure Meta Headers         │
│  - Auto-Escaped JSX Output (Strict anti-XSS)                   │
│  - No Hardcoded Secrets, API Keys, or Direct MySQL Connections │
└───────────────────────────────┬────────────────────────────────┘
                                │ HTTPS / TLS 1.3 / Same-Origin Proxy
┌───────────────────────────────▼────────────────────────────────┐
│             API Gateway & Flask Application Layer              │
│  - Strict Rate Limiting (Anti Brute-Force via Flask-Limiter)   │
│  - CORS Restrictions (Whitelisted Origins Only)                │
│  - Security Response Headers (nosniff, DENY, Referrer-Policy)  │
│  - Centralized Error Sanitization (No Traceback/SQL Leakage)   │
└───────────────────────────────┬────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│     Authentication Engine     │       │    Document Ingestion Pipe    │
│  - Argon2id Password Hashing  │       │  - Magic Byte MIME Validation │
│  - Stateless JWT with Revocation│     │  - Anti-Macro Heuristic Scan  │
│  - HttpOnly, Secure, SameSite │       │  - Random UUID Isolated Store │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
┌───────────────▼───────────────────────────────────────▼───────────────┐
│              Data Layer & Database Security (MySQL 8.0+)              │
│  - Dedicated Least-Privilege Account (plagicheck_app: DML Only)       │
│  - Parameterized ORM Queries (SQLAlchemy 2.0+ Anti-SQLi)              │
│  - Anti-IDOR Authorization Enforced on All Routes                     │
│  - Immutable Audit Logging (security_audit_logs + JSON File)          │
│  - AES-256 Encrypted Backups with SHA-256 Checksums                   │
└───────────────────────────────────────────────────────────────────────┘
```

## 3. Supported Versions

| Version | Supported          | Security Maintenance Status |
| ------- | ------------------ | --------------------------- |
| 2.0.x   | :white_check_mark: | Active Hardened Release     |
| < 2.0.0 | :x:                | Deprecated (Vulnerable)    |

## 4. Reporting a Vulnerability

If you discover a security vulnerability or privacy issue within PlagiCheck:
1. **Do not disclose publicly** or file a public GitHub issue.
2. Email our Security Team at `security@plagicheck.university.edu` or open an encrypted advisory.
3. Include:
   - Component affected (Frontend, API, Document Parser, Database)
   - Step-by-step reproduction instructions
   - Proof of Concept (PoC) in a controlled test environment
   - Impact assessment
4. Response SLA: Initial acknowledgment within 24 hours; remediation within 7 business days.

## 5. Security Principles Implemented

- **Principle of Least Privilege**: The application database user (`plagicheck_app`) has only `SELECT, INSERT, UPDATE, DELETE` permissions. No `DROP`, `ALTER`, or administrative privileges.
- **OWASP ASVS v4.0 Compliance**:
  - **Argon2id Hashing**: Passes memory cost (64MB) and time cost (3 iterations) to resist GPU/ASIC cracking.
  - **Anti-IDOR Controls**: Every single document, analysis, and report query verifies that the record owner matches `g.current_user.id`.
  - **File Upload Security**: Verification of magic bytes (`%PDF-`, `PK\x03\x04`), path traversal neutralization, and macro scanning.
  - **Zero Exposure**: MySQL credentials and external API keys are strictly forbidden from frontend bundles and must be provisioned via server environment variables.

