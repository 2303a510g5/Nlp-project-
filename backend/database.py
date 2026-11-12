"""
Student Feedback Analyzer - Database & Persistence Layer
Handles SQLite database initialization, user authentication storage,
feedback records CRUD, audit logging, and seed data migration.
"""

import os
import sqlite3
import json
import pandas as pd
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "feedback_analyzer.db")

def get_db_connection():
    """Returns a connection to the SQLite database with dictionary cursor."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initializes tables, indexes, and default administrator/user accounts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        department TEXT DEFAULT 'CSE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Feedback Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT UNIQUE NOT NULL,
        student_id TEXT DEFAULT 'STU-ANON',
        student_name TEXT DEFAULT 'Anonymous Student',
        department TEXT NOT NULL,
        academic_year TEXT DEFAULT '3rd Year',
        semester TEXT DEFAULT 'I',
        course_name TEXT DEFAULT 'Core Subject',
        faculty_name TEXT DEFAULT 'Department Faculty',
        rating INTEGER DEFAULT 4,
        feedback_text TEXT NOT NULL,
        cleaned_text TEXT,
        overall_sentiment TEXT NOT NULL,
        confidence_score REAL DEFAULT 0.0,
        primary_aspect TEXT DEFAULT 'General',
        secondary_aspect TEXT DEFAULT '',
        aspects_json TEXT,
        identified_issue TEXT DEFAULT 'None',
        urgency_level TEXT DEFAULT 'Standard',
        action_required TEXT DEFAULT 'No',
        status TEXT DEFAULT 'New',
        review_notes TEXT DEFAULT '',
        assigned_to TEXT DEFAULT 'Unassigned',
        source TEXT DEFAULT 'Manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT DEFAULT 'system',
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT DEFAULT '127.0.0.1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Indexes for fast querying & search
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback_records(overall_sentiment)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback_records(department)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_records(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_urgency ON feedback_records(urgency_level)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_records(created_at)")

    conn.commit()

    # Seed Default Users if table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    if user_count == 0:
        default_users = [
            ("admin", "admin@college.edu", generate_password_hash("admin123"), "Dean of Academic Affairs", "admin", "Administration"),
            ("faculty", "faculty@college.edu", generate_password_hash("faculty123"), "Prof. Anitha Rao", "faculty", "CSE"),
            ("student", "student@college.edu", generate_password_hash("student123"), "Sharanya Kora", "student", "CSE")
        ]
        cursor.executemany("""
        INSERT INTO users (username, email, password_hash, full_name, role, department)
        VALUES (?, ?, ?, ?, ?, ?)
        """, default_users)
        conn.commit()
        print("[Database] Seeded 3 default accounts: admin, faculty, student.")

    # Seed Initial Feedback Records from Dataset if table is empty
    cursor.execute("SELECT COUNT(*) FROM feedback_records")
    record_count = cursor.fetchone()[0]
    if record_count == 0:
        seed_feedback_records(conn, limit=120)

    conn.close()

def seed_feedback_records(conn, limit=120):
    """Seeds verified records from the primary CSV dataset into the SQLite table."""
    csv_paths = [
        os.path.join(PROJECT_ROOT, "Student_Feedback_Analyzer_NLP_Cleaned_5000.csv"),
        os.path.join(BACKEND_DIR, "Student_Feedback_Analyzer_NLP_Cleaned_5000.csv"),
        os.path.join(PROJECT_ROOT, "Student_Feedback_Analyzer_Research_Dataset_5000.csv")
    ]
    csv_path = next((p for p in csv_paths if os.path.exists(p)), None)
    if not csv_path:
        print("[Database] Note: Cleaned CSV not found for initial seeding.")
        return

    try:
        df = pd.read_csv(csv_path).head(limit)
        cursor = conn.cursor()
        inserted = 0

        for idx, row in df.iterrows():
            ticket_id = f"FB-{1000 + idx:05d}"
            student_id = str(row.get('student_id', f'STU{30000 + idx}'))
            student_name = str(row.get('student_name', f'Student {idx+1}'))
            dept = str(row.get('department', 'CSE'))
            year = str(row.get('year', '3rd Year'))
            semester = str(row.get('semester', 'I'))
            course = str(row.get('course_name', 'Advanced Computing'))
            faculty = str(row.get('faculty_name', 'Prof. Kumar'))
            rating = int(row.get('overall_rating_1_5', 4)) if pd.notna(row.get('overall_rating_1_5')) else 4
            feedback_text = str(row.get('feedback_text', ''))
            cleaned_text = str(row.get('cleaned_text', ''))
            sentiment = str(row.get('overall_sentiment', 'Positive'))
            primary_aspect = str(row.get('primary_aspect', 'Teaching'))
            secondary_aspect = str(row.get('secondary_aspect', '')) if pd.notna(row.get('secondary_aspect')) else ''
            key_issue = str(row.get('key_issue', 'No major issue')) if pd.notna(row.get('key_issue')) else 'No major issue'
            urgency = str(row.get('urgency', 'Standard')) if pd.notna(row.get('urgency')) else 'Standard'
            action_req = str(row.get('action_required', 'No')) if pd.notna(row.get('action_required')) else 'No'

            aspects_list = [{"aspect": primary_aspect, "polarity": sentiment, "context_clause": feedback_text[:40]}]
            if secondary_aspect:
                aspects_list.append({"aspect": secondary_aspect, "polarity": sentiment, "context_clause": ""})

            # Random status distribution for initial operational realism
            status_opts = ["New", "Under Review", "Action In Progress", "Resolved"]
            status = status_opts[idx % 4]

            cursor.execute("""
            INSERT OR IGNORE INTO feedback_records (
                ticket_id, student_id, student_name, department, academic_year, semester,
                course_name, faculty_name, rating, feedback_text, cleaned_text,
                overall_sentiment, confidence_score, primary_aspect, secondary_aspect,
                aspects_json, identified_issue, urgency_level, action_required,
                status, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ticket_id, student_id, student_name, dept, year, semester,
                course, faculty, rating, feedback_text, cleaned_text,
                sentiment, 92.5, primary_aspect, secondary_aspect,
                json.dumps(aspects_list), key_issue, urgency, action_req,
                status, 'System Corpus'
            ))
            inserted += 1

        conn.commit()
        print(f"[Database] Successfully seeded {inserted} verified feedback records from dataset.")
    except Exception as e:
        print(f"[Database] Warning seeding records: {e}")

# ---------------------------------------------------------------------------
# Authentication Functions
# ---------------------------------------------------------------------------
def authenticate_user(username_or_email, password):
    """Validates user credentials and returns user dict if valid."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, username, email, password_hash, full_name, role, department, created_at
    FROM users
    WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    """, (username_or_email.strip(), username_or_email.strip()))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        return {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user['role'],
            "department": user['department'],
            "created_at": user['created_at']
        }
    return None

def register_user(username, email, password, full_name, role="student", department="CSE"):
    """Registers a new user account with hashed password."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for existing username or email
    cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),))
    if cursor.fetchone():
        conn.close()
        return False, "Username is already registered. Please choose another."

    cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    if cursor.fetchone():
        conn.close()
        return False, "Email address is already in use."

    hashed_pw = generate_password_hash(password)
    try:
        cursor.execute("""
        INSERT INTO users (username, email, password_hash, full_name, role, department)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (username.strip(), email.strip().lower(), hashed_pw, full_name.strip(), role, department))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return True, {"id": user_id, "username": username, "email": email, "full_name": full_name, "role": role, "department": department}
    except Exception as e:
        conn.close()
        return False, f"Registration failed: {str(e)}"

def update_user_profile(user_id, full_name, department, old_password=None, new_password=None):
    """Updates user profile information and optional password change."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if old_password and new_password:
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or not check_password_hash(row['password_hash'], old_password):
            conn.close()
            return False, "Current password is incorrect."
        new_hash = generate_password_hash(new_password)
        cursor.execute("""
        UPDATE users SET full_name = ?, department = ?, password_hash = ?
        WHERE id = ?
        """, (full_name, department, new_hash, user_id))
    else:
        cursor.execute("""
        UPDATE users SET full_name = ?, department = ?
        WHERE id = ?
        """, (full_name, department, user_id))

    conn.commit()
    conn.close()
    return True, "Profile updated successfully."

# ---------------------------------------------------------------------------
# Feedback CRUD Operations
# ---------------------------------------------------------------------------
def create_feedback_entry(data):
    """Inserts a newly analyzed feedback record into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate unique readable ticket ID
    ticket_id = f"FB-{datetime.utcnow().strftime('%y%m%d')}-{abs(hash(data.get('feedback_text', ''))) % 9000 + 1000}"

    aspects_json = json.dumps(data.get('aspects_breakdown', []))

    cursor.execute("""
    INSERT INTO feedback_records (
        ticket_id, student_id, student_name, department, academic_year, semester,
        course_name, faculty_name, rating, feedback_text, cleaned_text,
        overall_sentiment, confidence_score, primary_aspect, secondary_aspect,
        aspects_json, identified_issue, urgency_level, action_required,
        status, review_notes, assigned_to, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket_id,
        data.get('student_id', 'STU-WEB'),
        data.get('student_name', 'Student User'),
        data.get('department', 'CSE'),
        data.get('academic_year', '3rd Year'),
        data.get('semester', 'I'),
        data.get('course_name', 'Academic Subject'),
        data.get('faculty_name', 'Course Instructor'),
        data.get('rating', 4),
        data.get('feedback_text', ''),
        data.get('normalized_text', ''),
        data.get('overall_sentiment', 'Neutral'),
        data.get('confidence_score', 85.0),
        data.get('primary_aspect', 'General'),
        data.get('secondary_aspect', ''),
        aspects_json,
        data.get('identified_issue', 'None'),
        data.get('urgency_level', 'Standard'),
        data.get('action_required', 'No'),
        data.get('status', 'New'),
        data.get('review_notes', ''),
        data.get('assigned_to', 'Unassigned'),
        data.get('source', 'Web Submission')
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return get_feedback_record_by_id(new_id)

def get_feedback_records(search_query=None, sentiment_filter=None, department_filter=None,
                         urgency_filter=None, status_filter=None, page=1, per_page=15, sort_by="id_desc"):
    """Fetches paginated, filtered, and searched feedback records."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if search_query and search_query.strip():
        q = f"%{search_query.strip()}%"
        conditions.append("(ticket_id LIKE ? OR feedback_text LIKE ? OR student_name LIKE ? OR faculty_name LIKE ? OR course_name LIKE ? OR identified_issue LIKE ?)")
        params.extend([q, q, q, q, q, q])

    if sentiment_filter and sentiment_filter != "All":
        conditions.append("overall_sentiment = ?")
        params.append(sentiment_filter)

    if department_filter and department_filter != "All" and department_filter != "All Departments":
        conditions.append("department = ?")
        params.append(department_filter)

    if urgency_filter and urgency_filter != "All":
        conditions.append("urgency_level = ?")
        params.append(urgency_filter)

    if status_filter and status_filter != "All":
        conditions.append("status = ?")
        params.append(status_filter)

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    # Count total matching rows
    count_sql = f"SELECT COUNT(*) FROM feedback_records{where_clause}"
    cursor.execute(count_sql, params)
    total_records = cursor.fetchone()[0]

    # Order Clause
    order_clause = "ORDER BY id DESC"
    if sort_by == "id_asc":
        order_clause = "ORDER BY id ASC"
    elif sort_by == "sentiment":
        order_clause = "ORDER BY overall_sentiment ASC"
    elif sort_by == "urgency":
        order_clause = "ORDER BY CASE urgency_level WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END"
    elif sort_by == "rating":
        order_clause = "ORDER BY rating DESC"

    # Pagination
    offset = (max(1, page) - 1) * per_page
    data_sql = f"""
    SELECT id, ticket_id, student_id, student_name, department, academic_year, semester,
           course_name, faculty_name, rating, feedback_text, cleaned_text, overall_sentiment,
           confidence_score, primary_aspect, secondary_aspect, aspects_json,
           identified_issue, urgency_level, action_required, status, review_notes,
           assigned_to, source, created_at, updated_at
    FROM feedback_records
    {where_clause}
    {order_clause}
    LIMIT ? OFFSET ?
    """
    cursor.execute(data_sql, params + [per_page, offset])
    rows = cursor.fetchall()
    conn.close()

    records = [dict(row) for row in rows]
    total_pages = max(1, (total_records + per_page - 1) // per_page)

    return {
        "records": records,
        "total": total_records,
        "total_records": total_records,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }

def get_feedback_record_by_id(record_id):
    """Retrieves single feedback record with full detail."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM feedback_records WHERE id = ? OR ticket_id = ?", (record_id, str(record_id)))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    rec = dict(row)
    if rec.get('aspects_json'):
        try:
            rec['aspects_breakdown'] = json.loads(rec['aspects_json'])
        except Exception:
            rec['aspects_breakdown'] = []
    return rec

def update_feedback_record(record_id, update_fields):
    """Updates status, review notes, or assigned staff for a record."""
    conn = get_db_connection()
    cursor = conn.cursor()

    allowed = ["status", "review_notes", "assigned_to", "urgency_level", "action_required"]
    sets = []
    params = []

    for k, v in update_fields.items():
        if k in allowed:
            sets.append(f"{k} = ?")
            params.append(v)

    if not sets:
        conn.close()
        return False, "No valid fields to update."

    sets.append("updated_at = CURRENT_TIMESTAMP")
    params.append(record_id)

    sql = f"UPDATE feedback_records SET {', '.join(sets)} WHERE id = ? OR ticket_id = ?"
    cursor.execute(sql, params + [str(record_id)])
    conn.commit()
    conn.close()
    return True, get_feedback_record_by_id(record_id)

def delete_feedback_record(record_id):
    """Deletes a feedback record from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM feedback_records WHERE id = ? OR ticket_id = ?", (record_id, str(record_id)))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

# ---------------------------------------------------------------------------
# Audit Logging
# ---------------------------------------------------------------------------
def log_audit_event(username, action, details=None, ip="127.0.0.1"):
    """Records security and administrative activities."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO audit_logs (username, action, details, ip_address)
        VALUES (?, ?, ?, ?)
        """, (username, action, details or '', ip))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Audit Log Error]: {e}")

def get_recent_audit_logs(limit=25):
    """Retrieves recent system audit events."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_users():
    """Retrieves all registered users without exposing password hashes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, username, email, full_name, role, department, created_at
    FROM users
    ORDER BY id ASC
    """)
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

def get_feedback_records_count():
    """Returns total count of feedback records in SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM feedback_records")
    count = cursor.fetchone()[0]
    conn.close()
    return count

# Auto-initialize database on module import
init_db()
