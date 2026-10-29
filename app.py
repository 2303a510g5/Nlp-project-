"""
Institutional Quality Assurance Cell (IQAC) - Student Feedback Analytics Portal
Web Application Server & Administrative API Subsystem
"""

import os
import io
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_file
from nlp_engine import AcademicFeedbackEngine, normalize_text

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB upload quota

DATASET_PATH = "Student_Feedback_Analyzer_NLP_Cleaned_5000.csv"
engine = AcademicFeedbackEngine(dataset_path=DATASET_PATH)

# In-memory batch staging
STAGED_AUDIT_BATCH = None

BENCHMARK_CASES = [
    {
        "id": "CASE-101",
        "title": "Pedagogical Clarity vs Laboratory Infrastructure",
        "text": "The faculty explains concepts clearly, but the lab computers are very slow."
    },
    {
        "id": "CASE-102",
        "title": "Campus Wireless & Facility Hygiene",
        "text": "Campus Wi-Fi is fast and reliable in most areas. Classrooms are clean and comfortable."
    },
    {
        "id": "CASE-103",
        "title": "Residential Facilities & Utility Reliability",
        "text": "Internet and water facilities in the hostel are inconsistent and poorly maintained."
    },
    {
        "id": "CASE-104",
        "title": "Assessment Schedule & Student Welfare",
        "text": "The exam schedule and instructions are well communicated. However, canteen prices are high for students."
    },
    {
        "id": "CASE-105",
        "title": "Standard Curriculum & Syllabus Audit",
        "text": "The examination process and curriculum are generally satisfactory and standard."
    }
]

DEPARTMENTS = ["All Departments", "CSE", "IT", "AIML", "DS", "EEE", "MECH", "CIVIL"]
ACADEMIC_YEARS = ["All Years", "1st Year", "2nd Year", "3rd Year", "4th Year"]

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route('/')
def home():
    """Renders the main institutional analytics portal."""
    return render_template(
        'index.html',
        benchmark_cases=BENCHMARK_CASES,
        departments=DEPARTMENTS,
        academic_years=ACADEMIC_YEARS
    )

@app.route('/api/evaluate', methods=['POST'])
def evaluate_comment():
    """Evaluates an individual student feedback response."""
    payload = request.get_json(force=True, silent=True) or {}
    if not isinstance(payload, dict):
        payload = {}
    feedback_text = payload.get('text') or request.form.get('text') or ''
    feedback_text = str(feedback_text).strip()

    if not feedback_text:
        return jsonify({"error": "Submission text cannot be empty."}), 400

    report = engine.evaluate_comment(feedback_text)
    return jsonify(report)

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Returns aggregated audit metrics with optional departmental filters."""
    department = request.args.get('department', 'All Departments')
    academic_year = request.args.get('year', 'All Years')

    metrics = engine.get_institutional_metrics(
        department=department,
        academic_year=academic_year
    )
    return jsonify(metrics)

@app.route('/api/benchmarks', methods=['GET'])
def list_benchmarks():
    """Returns official institutional benchmark test cases."""
    return jsonify(BENCHMARK_CASES)

@app.route('/api/ingest_survey', methods=['POST'])
def ingest_survey_batch():
    """Processes survey files and extracts batch sentiment and grievance telemetry."""
    global STAGED_AUDIT_BATCH

    if 'file' not in request.files:
        return jsonify({"error": "No data file attached."}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "Invalid format. Upload a structured .csv file."}), 400

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 400

    candidate_cols = ['feedback_text', 'text', 'comment', 'feedback', 'student_comment', 'remarks']
    text_col = next((c for c in candidate_cols if c in df.columns), None)

    if not text_col:
        for c in df.columns:
            if df[c].dtype == 'object':
                text_col = c
                break

    if not text_col:
        return jsonify({"error": "No identifiable feedback text column found."}), 400

    processed_rows = []
    # Process up to 500 rows for high responsiveness
    sample_df = df.head(500).copy()

    for idx, row in sample_df.iterrows():
        comment = str(row[text_col])
        evaluation = engine.evaluate_comment(comment)

        primary_aspect = "General Institutional Feedback"
        if evaluation.get("aspects_breakdown"):
            primary_aspect = evaluation["aspects_breakdown"][0]["aspect"]

        processed_rows.append({
            "Record_ID": f"AUD-{(idx + 1):04d}",
            "Raw_Feedback": comment,
            "Normalized_Text": evaluation.get("normalized_text", ""),
            "Classified_Polarity": evaluation.get("overall_sentiment", "Neutral"),
            "Confidence": f"{evaluation.get('confidence_score', 0)}%",
            "Primary_Aspect": primary_aspect,
            "Identified_Grievance": evaluation.get("identified_issue", "None"),
            "Urgency": evaluation.get("urgency_level", "Standard"),
            "Action_Required": evaluation.get("action_required", "No")
        })

    result_df = pd.DataFrame(processed_rows)
    STAGED_AUDIT_BATCH = result_df

    polarity_counts = result_df['Classified_Polarity'].value_counts().to_dict()

    return jsonify({
        "records_processed": len(result_df),
        "source_column": text_col,
        "polarity_distribution": polarity_counts,
        "records_preview": result_df.head(10).to_dict(orient="records")
    })

@app.route('/api/download_audit_report', methods=['GET'])
def download_audit_report():
    """Generates the downloadable CSV audit report."""
    global STAGED_AUDIT_BATCH
    if STAGED_AUDIT_BATCH is None or STAGED_AUDIT_BATCH.empty:
        return jsonify({"error": "No active survey batch in session."}), 404

    buffer = io.StringIO()
    STAGED_AUDIT_BATCH.to_csv(buffer, index=False)
    bytes_stream = io.BytesIO()
    bytes_stream.write(buffer.getvalue().encode('utf-8'))
    bytes_stream.seek(0)

    return send_file(
        bytes_stream,
        mimetype='text/csv',
        as_attachment=True,
        download_name='IQAC_Institutional_Feedback_Audit.csv'
    )

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"\n* IQAC Feedback Analytics Subsystem online at: http://127.0.0.1:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)
