"""
PlagiCheck Security Hardening - Document & Plagiarism Analysis API Routes
Provides hardened endpoints for document upload, plagiarism analysis, reports, and stats.
Strictly enforces ownership checks on all records to prevent IDOR attacks.
"""

import os
import uuid
from flask import Blueprint, current_app, g, jsonify, request
from backend.models import Analysis, AnalysisSource, PlagiarismReport, db
from backend.security.file_validator import (
    FileValidationError,
    safe_extract_text,
    save_and_validate_upload
)
from backend.security.rbac import enforce_ownership, jwt_required_custom
from backend.services.nlp_engine import analyze_document_plagiarism
from backend.utils.audit_logger import (
    audit_analysis_created,
    audit_file_upload,
    audit_report_download,
    audit_suspicious_activity
)

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/v1')


@analysis_bp.route('/analyses/upload', methods=['POST'])
@jwt_required_custom
def upload_document():
    """
    Secure file upload endpoint.
    Performs extension check, magic-byte inspection, macro scanning, and bounded text extraction.
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in the upload request.'}), 400

    uploaded_file = request.files['file']
    upload_folder = current_app.config['UPLOAD_FOLDER']
    max_size = current_app.config['MAX_CONTENT_LENGTH']

    try:
        dest_path, storage_name, file_size = save_and_validate_upload(
            uploaded_file,
            upload_folder,
            max_size_bytes=max_size
        )
        _, ext = os.path.splitext(uploaded_file.filename.lower())
        extracted_text = safe_extract_text(dest_path, ext)

        audit_file_upload(
            user_id=g.current_user.id,
            original_filename=uploaded_file.filename,
            storage_name=storage_name,
            file_size=file_size,
            status='SUCCESS'
        )

        words = extracted_text.split()
        return jsonify({
            'success': True,
            'fileName': uploaded_file.filename,
            'storageName': storage_name,
            'fileSize': file_size,
            'fileType': ext.replace('.', ''),
            'wordCount': len(words),
            'text': extracted_text
        }), 200

    except FileValidationError as e:
        audit_file_upload(
            user_id=g.current_user.id,
            original_filename=getattr(uploaded_file, 'filename', 'unknown'),
            storage_name='none',
            file_size=0,
            status='REJECTED'
        )
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        audit_suspicious_activity('UPLOAD_PROCESSING_ERROR', {'error': str(e)})
        return jsonify({'success': False, 'error': 'Failed to process document safely.'}), 500


@analysis_bp.route('/analyses', methods=['POST'])
@jwt_required_custom
def create_analysis():
    """
    Perform or persist plagiarism analysis for the authenticated user.
    Enforces maximum word counts and sanitizes text inputs.
    """
    data = request.get_json(silent=True) or {}
    submitted_text = str(data.get('submittedText', '')).strip()
    title = str(data.get('title', '')).strip() or 'Untitled Document'

    if not submitted_text:
        return jsonify({'success': False, 'error': 'Submitted text cannot be empty.'}), 400

    words = submitted_text.split()
    if len(words) < 10:
        return jsonify({'success': False, 'error': 'Text must contain at least 10 words for analysis.'}), 400

    max_words = current_app.config.get('MAX_DOCUMENT_WORDS', 10000)
    if len(words) > max_words:
        return jsonify({'success': False, 'error': f'Document exceeds {max_words:,} word limit.'}), 400

    # Execute Python NLP Engine
    nlp_result = analyze_document_plagiarism(submitted_text)

    # Persist Analysis Record
    analysis = Analysis(
        user_id=g.current_user.id,
        title=title[:255],
        submitted_text=submitted_text,
        word_count=nlp_result['wordCount'],
        character_count=nlp_result['characterCount'],
        sentence_count=nlp_result['sentenceCount'],
        similarity_percentage=nlp_result['similarityPercentage'],
        originality_percentage=nlp_result['originalityPercentage'],
        ai_probability_percentage=nlp_result['aiProbabilityPercentage'],
        human_percentage=nlp_result['humanPercentage'],
        ai_verdict=nlp_result['aiVerdict'],
        risk_level=nlp_result['riskLevel'],
        processing_time_ms=nlp_result['processingTimeMs']
    )
    db.session.add(analysis)
    db.session.flush()

    # Persist Sources
    for src in nlp_result.get('sources', []):
        source_record = AnalysisSource(
            analysis_id=analysis.id,
            source_name=src['sourceName'][:255],
            source_url=src['sourceUrl'][:512],
            matched_text=src['matchedText'],
            match_percentage=src['matchPercentage'],
            matched_phrases_count=src.get('matchedPhrasesCount', 1)
        )
        db.session.add(source_record)

    # Generate Linked Plagiarism Report
    report_code = f"PC-2026-{uuid.uuid4().hex[:8].upper()}"
    report = PlagiarismReport(
        analysis_id=analysis.id,
        report_code=report_code,
        report_data={
            'title': analysis.title,
            'wordCount': analysis.word_count,
            'similarityPercentage': analysis.similarity_percentage,
            'originalityPercentage': analysis.originality_percentage,
            'aiProbabilityPercentage': analysis.ai_probability_percentage,
            'riskLevel': analysis.risk_level,
            'sources': nlp_result.get('sources', []),
            'matches': nlp_result.get('matches', [])
        },
        summary_text=f"Analysis of '{analysis.title}' revealed {analysis.similarity_percentage}% similarity with {analysis.risk_level} risk level."
    )
    db.session.add(report)
    db.session.commit()

    # Log security audit event
    audit_analysis_created(g.current_user.id, analysis.id, analysis.title, analysis.word_count)

    result_payload = analysis.to_dict()
    result_payload['matches'] = nlp_result.get('matches', [])
    result_payload['reportCode'] = report_code

    return jsonify({
        'success': True,
        'message': 'Analysis completed and saved successfully.',
        'analysis': result_payload
    }), 201


@analysis_bp.route('/analyses', methods=['GET'])
@jwt_required_custom
def list_analyses():
    """
    List all analyses belonging exclusively to the authenticated user.
    Prevents cross-tenant data leakage.
    """
    analyses = Analysis.query.filter_by(user_id=g.current_user.id).order_by(Analysis.created_at.desc()).all()
    return jsonify({
        'success': True,
        'analyses': [a.to_dict(include_sources=False) for a in analyses]
    }), 200


@analysis_bp.route('/analyses/<int:analysis_id>', methods=['GET'])
@jwt_required_custom
@enforce_ownership(Analysis, id_param='analysis_id', user_fk_attr='user_id')
def get_analysis(analysis_id: int):
    """
    Fetch a single analysis by ID.
    Strictly protected by @enforce_ownership to prevent IDOR attacks.
    """
    analysis = g.resource
    data = analysis.to_dict(include_sources=True)

    # Attach report code if exists
    report = PlagiarismReport.query.filter_by(analysis_id=analysis.id).first()
    if report:
        data['reportCode'] = report.report_code
        if isinstance(report.report_data, dict) and 'matches' in report.report_data:
            data['matches'] = report.report_data['matches']

    return jsonify({
        'success': True,
        'analysis': data
    }), 200


@analysis_bp.route('/analyses/<int:analysis_id>', methods=['DELETE'])
@jwt_required_custom
@enforce_ownership(Analysis, id_param='analysis_id', user_fk_attr='user_id')
def delete_analysis(analysis_id: int):
    """
    Delete an analysis record with cascade deletion.
    Protected by @enforce_ownership.
    """
    analysis = g.resource
    db.session.delete(analysis)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Analysis deleted successfully.'
    }), 200


@analysis_bp.route('/analyses/<int:analysis_id>/report', methods=['GET'])
@jwt_required_custom
@enforce_ownership(Analysis, id_param='analysis_id', user_fk_attr='user_id')
def get_analysis_report(analysis_id: int):
    """Fetch or create detailed report for an owned analysis."""
    analysis = g.resource
    report = PlagiarismReport.query.filter_by(analysis_id=analysis.id).first()

    if not report:
        report_code = f"PC-2026-{uuid.uuid4().hex[:8].upper()}"
        report = PlagiarismReport(
            analysis_id=analysis.id,
            report_code=report_code,
            report_data={
                'title': analysis.title,
                'wordCount': analysis.word_count,
                'similarityPercentage': analysis.similarity_percentage,
                'originalityPercentage': analysis.originality_percentage,
                'aiProbabilityPercentage': analysis.ai_probability_percentage,
                'riskLevel': analysis.risk_level
            },
            summary_text=f"Report for document: {analysis.title}"
        )
        db.session.add(report)
        db.session.commit()

    audit_report_download(g.current_user.id, report.report_code)
    return jsonify({
        'success': True,
        'report': report.to_dict()
    }), 200


@analysis_bp.route('/reports', methods=['GET'])
@jwt_required_custom
def list_reports():
    """List reports belonging strictly to the authenticated user."""
    user_analyses = Analysis.query.filter_by(user_id=g.current_user.id).all()
    analysis_ids = [a.id for a in user_analyses]

    if not analysis_ids:
        return jsonify({'success': True, 'reports': []}), 200

    reports = PlagiarismReport.query.filter(PlagiarismReport.analysis_id.in_(analysis_ids)).order_by(PlagiarismReport.created_at.desc()).all()
    return jsonify({
        'success': True,
        'reports': [r.to_dict() for r in reports]
    }), 200


@analysis_bp.route('/reports/verify/<string:report_code>', methods=['GET'])
def verify_report_authenticity(report_code: str):
    """
    Public authenticity verification endpoint for employers / academic institutions.
    Sanitizes report and never exposes raw document body to unauthenticated users.
    """
    clean_code = str(report_code).strip().upper()
    report = PlagiarismReport.query.filter_by(report_code=clean_code).first()

    if not report:
        return jsonify({
            'success': False,
            'verified': False,
            'error': 'Certificate or report code not found in academic registry.'
        }), 404

    analysis = report.analysis
    return jsonify({
        'success': True,
        'verified': True,
        'certificate': {
            'reportCode': report.report_code,
            'documentTitle': analysis.title,
            'institution': analysis.user.institution if analysis.user else 'Academic Institution',
            'similarityPercentage': analysis.similarity_percentage,
            'originalityPercentage': analysis.originality_percentage,
            'riskLevel': analysis.risk_level,
            'timestamp': report.created_at.isoformat()
        }
    }), 200


@analysis_bp.route('/stats/dashboard', methods=['GET'])
@jwt_required_custom
def get_dashboard_stats():
    """Compute aggregate dashboard metrics for the authenticated user only."""
    analyses = Analysis.query.filter_by(user_id=g.current_user.id).all()

    total_analyses = len(analyses)
    total_words = sum(a.word_count for a in analyses)
    avg_similarity = (sum(a.similarity_percentage for a in analyses) / total_analyses) if total_analyses > 0 else 0.0
    avg_ai = (sum(a.ai_probability_percentage for a in analyses) / total_analyses) if total_analyses > 0 else 0.0

    original_docs = sum(1 for a in analyses if a.similarity_percentage < 20.0)
    moderate_risk = sum(1 for a in analyses if 20.0 <= a.similarity_percentage < 50.0)
    high_risk = sum(1 for a in analyses if a.similarity_percentage >= 50.0)
    ai_flagged = sum(1 for a in analyses if a.ai_probability_percentage >= 50.0)

    recent_analyses = sorted(analyses, key=lambda a: a.created_at or '', reverse=True)[:5]

    return jsonify({
        'success': True,
        'stats': {
            'totalAnalyses': total_analyses,
            'totalWordsAnalyzed': total_words,
            'averageSimilarity': round(avg_similarity, 1),
            'averageAiProbability': round(avg_ai, 1),
            'originalDocumentsCount': original_docs,
            'moderateRiskCount': moderate_risk,
            'highRiskCount': high_risk,
            'aiFlaggedCount': ai_flagged,
            'recentAnalyses': [a.to_dict(include_sources=False) for a in recent_analyses]
        }
    }), 200

