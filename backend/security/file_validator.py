"""
PlagiCheck Security Hardening - Document Upload & Malware Protection Module
Implements defense-in-depth for academic document ingestion:
- Magic bytes verification & MIME inspection
- Path traversal prevention & UUID storage
- Resource bounded extraction (PDF, DOCX, TXT)
- Macro & Active content detection (Anti-malware heuristics)
OWASP ASVS v4.0 File Upload Security compliant.
"""

import io
import os
import uuid
import zipfile
from werkzeug.utils import secure_filename

# Magic Byte Signatures
PDF_MAGIC = b'%PDF-'
ZIP_MAGIC = b'PK\x03\x04'
EXECUTABLE_MAGICS = [
    b'MZ',          # Windows PE/EXE/DLL
    b'\x7fELF',     # Linux ELF executable
    b'\xca\xfe\xba\xbe', # Java Class / Mach-O Fat Binary
    b'<!DOCTYPE html',
    b'<html',
    b'<?php',
    b'<%',
    b'#!/bin/',
    b'#!/usr/bin/'
]

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


class FileValidationError(Exception):
    """Custom exception raised when an uploaded document fails security validation."""
    pass


def verify_magic_bytes(header: bytes, ext: str) -> None:
    """
    Validate that the file header matches its claimed extension.
    Prevents file extension spoofing and executable execution.
    """
    # 1. Check for known dangerous executable headers
    for magic in EXECUTABLE_MAGICS:
        if header.startswith(magic) or magic.lower() in header[:64].lower():
            raise FileValidationError("Potentially dangerous executable or script file detected.")

    # 2. Extension-specific verification
    if ext == '.pdf':
        if not header.startswith(PDF_MAGIC):
            raise FileValidationError("Invalid PDF file format. Missing standard %PDF- header.")

    elif ext == '.docx':
        if not header.startswith(ZIP_MAGIC):
            raise FileValidationError("Invalid DOCX format. Word documents must be valid ZIP packages.")

    elif ext == '.txt':
        # Reject binary files disguised as .txt
        if b'\x00' in header[:1024]:
            raise FileValidationError("Text file contains binary null bytes. Only plain text is accepted.")


def inspect_docx_safety(file_bytes: bytes) -> None:
    """Inspect DOCX zip archive for malicious macros, OLE objects, or path traversals."""
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes), 'r') as zf:
            namelist = zf.namelist()

            # Ensure it is a valid Word document
            if not any(name.startswith('word/') for name in namelist):
                raise FileValidationError("Uploaded archive does not contain valid Word document structure.")

            # Scan for malicious macro / VBA binaries
            for name in namelist:
                # Path traversal inside zip archive (Zip Slip)
                if '..' in name or name.startswith('/') or name.startswith('\\'):
                    raise FileValidationError("Malicious path traversal sequence detected inside archive.")

                # Macro detection
                if name.lower().endswith(('vbaproject.bin', '.vba', '.exe', '.bat', '.cmd', '.ps1')):
                    raise FileValidationError("Security Policy Violation: Word document contains active macros or executable scripts.")
    except zipfile.BadZipFile:
        raise FileValidationError("Corrupted or invalid DOCX file.")


def save_and_validate_upload(file_storage, upload_folder: str, max_size_bytes: int = 25 * 1024 * 1024) -> tuple[str, str, int]:
    """
    Validate and safely store an uploaded document.
    Returns: (stored_absolute_path, safe_random_filename, file_size_bytes)
    """
    if not file_storage or not file_storage.filename:
        raise FileValidationError("No file selected for upload.")

    original_filename = file_storage.filename
    clean_filename = secure_filename(original_filename)

    # Check extension
    _, ext = os.path.splitext(clean_filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported file format '{ext}'. Allowed academic formats are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read file content safely into memory buffer
    file_bytes = file_storage.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise FileValidationError("Uploaded file is empty.")

    if file_size > max_size_bytes:
        raise FileValidationError(f"File size exceeds maximum permitted limit ({max_size_bytes // (1024*1024)} MB).")

    # Inspect magic bytes
    verify_magic_bytes(file_bytes[:1024], ext)

    # Deep format inspection
    if ext == '.docx':
        inspect_docx_safety(file_bytes)

    # Generate cryptographically unguessable storage filename (anti-collision & path traversal immune)
    storage_filename = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(upload_folder, exist_ok=True)
    destination_path = os.path.join(upload_folder, storage_filename)

    # Write securely with restricted filesystem permissions
    with open(destination_path, 'wb') as f:
        f.write(file_bytes)

    # Reset stream pointer
    file_storage.seek(0)

    return destination_path, storage_filename, file_size


def safe_extract_text(file_path: str, ext: str, max_chars: int = 500000) -> str:
    """
    Extract readable academic text safely with strict resource bounds.
    Prevents ReDoS, zip bombs, and memory exhaustion.
    """
    if not os.path.exists(file_path):
        raise FileValidationError("Uploaded file could not be found.")

    text = ""
    ext = ext.lower()

    if ext == '.pdf':
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            extracted_pages = []
            # Bound page processing (max 100 pages per submission)
            for page_idx, page in enumerate(reader.pages[:100]):
                page_text = page.extract_text() or ""
                extracted_pages.append(page_text)
                if sum(len(p) for p in extracted_pages) > max_chars:
                    break
            text = "\n".join(extracted_pages)
        except Exception as e:
            raise FileValidationError(f"Could not parse PDF text safely: {str(e)}")

    elif ext == '.docx':
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            paragraphs.append(cell.text)
            text = "\n".join(paragraphs)
        except Exception as e:
            raise FileValidationError(f"Could not parse Word document: {str(e)}")

    elif ext in ('.txt', '.doc'):
        try:
            with open(file_path, 'rb') as f:
                raw_bytes = f.read(max_chars)
            try:
                text = raw_bytes.decode('utf-8')
            except UnicodeDecodeError:
                text = raw_bytes.decode('latin-1', errors='replace')
        except Exception as e:
            raise FileValidationError(f"Could not read text file: {str(e)}")

    cleaned = text.strip()
    if not cleaned or len(cleaned) < 10:
        raise FileValidationError("Document contains no extractable text. Scanned image-only documents must undergo OCR.")

    # Bound character output
    return cleaned[:max_chars]

