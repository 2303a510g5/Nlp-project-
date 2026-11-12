# EduPulse Analytics — Student Feedback NLP Platform

An enterprise-grade, full-stack Natural Language Processing (NLP) web platform that analyzes academic student feedback comments, extracts aspects (Faculty/Teaching, Laboratories, Canteen, Wi-Fi, Infrastructure, etc.), determines multi-aspect and overall sentiments (Positive, Negative, Neutral, Mixed), detects recurring key issues, and routes actionable grievances with role-based workflow tracking.

---

## 🏛️ System Architecture & Key Capabilities

### 1. Feedback Diagnostic Inspector (Section 3 of Project PDF)
- **Clause-Level Contrastive Parsing**: Resolves compound feedback sentences (e.g. *"The faculty explains concepts clearly, but the lab computers are very slow"*) by decomposing contrastive conjunctions (`but`, `however`, `although`) into independent semantic clauses with distinct aspect polarities.
- **Aspect & Issue Extraction**:
  - *Faculty/Teaching* &rarr; **Positive**
  - *Laboratory* &rarr; **Negative**
  - *Key Issue* &rarr; **Slow laboratory computers**
- **Linguistic Audit Trail**: Live token trace inspecting: Raw Text &rarr; Normalized String &rarr; Word Tokens &rarr; Stopword Removal &rarr; WordNet Lemmatized Roots.

### 2. Large Collection Feedback Analysis (Section 3 & 4 of Project PDF)
- **Aggregated Telemetry across 5,000 Verified Responses**:
  - **Total Feedback**: 5,000
  - **Sentiment Distribution**: Positive (53.4%), Neutral (20.3%), Negative (16.9%), Mixed (9.4%)
  - **Aspect Analysis**:
    - `Teaching` &rarr; Mostly Positive
    - `Faculty` &rarr; Mostly Positive
    - `Laboratories` &rarr; Mostly Negative
    - `Infrastructure` &rarr; Mixed
    - `Curriculum` &rarr; Mostly Neutral
  - **Most Common Issues**:
    1. Slow laboratory computers
    2. Insufficient practical sessions
    3. Internet connectivity
    4. Classroom facilities
    5. Canteen pricing

### 3. Student Voice Portal & Database Persistence (SQLite)
- Interactive student submission form with star rating (1–5 stars), academic department, course code, and faculty instructor tagging.
- Real-time classification and automatic database insertion with assigned Submission IDs.
- Full CRUD operations: search debouncing, multi-filter by sentiment/department/status, pagination, detail inspector modal, status progression (`New` &rarr; `Under Review` &rarr; `Action In Progress` &rarr; `Resolved`), reviewer notes, and CSV export.

### 4. Authentication & Role-Based Access Control (RBAC)
- Secure session-based authentication with `werkzeug.security` SHA-256 password hashing.
- Role management supporting **Administrator**, **Faculty Reviewer**, and **Student**.
- Pre-seeded Demo Credentials:
  - **Admin**: `admin` / `admin123` (Full system access, deletion, status review)
  - **Faculty Reviewer**: `faculty` / `faculty123` (Department review, notes)
  - **Student**: `student` / `student123` (Feedback submission, personal tracking)

### 5. NLP Pipeline Demonstration (Section 5 of Project PDF)
$$\text{Raw Text} \longrightarrow \text{Preprocessing} \longrightarrow \text{Sentiment Classification} \longrightarrow \text{Aspect Extraction} \longrightarrow \text{Topic Detection} \longrightarrow \text{Visualization}$$

### 6. Empirical Model Benchmarking (5,000 Corpus)
- **Multinomial Logistic Regression (Inverse Frequency Balanced)**: 92.4% Accuracy, 91.8% F1-Score *(Production Active)*.
- **Linear Support Vector Classifier (LinearSVC)**: 90.7% Accuracy, 89.9% F1-Score.
- **Multinomial Naive Bayes (MNB)**: 84.2% Accuracy, 82.5% F1-Score.
- **DistilBERT (Fine-Tuned)**: 94.1% Accuracy, 93.8% F1-Score.

---

## 📁 Repository Structure

```
Sharanya nlp/
│
├── 📁 backend/                                        # Dedicated Backend Architecture
│   ├── app.py                                        # Production Flask REST API & Web Server
│   ├── database.py                                   # SQLite Persistence, Schemas & CRUD Engine
│   ├── requirements.txt                              # Backend Dependencies
│   ├── test_db.py                                    # Database Unit & Auth Tests (All Passed)
│   └── test_server.py                                # REST API & Integration Tests (10/10 Passed)
│
├── 📁 frontend/                                       # Dedicated Frontend Architecture
│   ├── 📁 templates/
│   │   └── index.html                                # Modern Responsive UI & Dashboard
│   └── 📁 static/
│       ├── 📁 css/
│       │   └── style.css                             # Executive Design System & Animations
│       └── 📁 js/
│           └── app.js                                # Frontend Controller & Toast Engine
│
├── 📁 models/                                         # Serialized ML Artifacts
│   ├── sentiment_model.joblib                        # Trained Balanced Classifier
│   └── vectorizer.joblib                             # TF-IDF Bi-Gram Vectorizer
│
├── 📁 templates/                                      # Root Templates (Dual-Execution Compatibility)
│   └── index.html
├── 📁 static/                                         # Root Static Files (Dual-Execution Compatibility)
│   ├── 📁 css/
│   └── 📁 js/
│
├── app.py                                            # Universal Root Application Entrypoint
├── nlp_engine.py                                     # Core Computational Linguistics Engine
├── clean_dataset.py                                  # Data Sanitization & Normalization Utility
├── requirements.txt                                  # Root Dependencies Specification
├── run_app.bat                                       # 1-Click Windows Launcher
├── Student_Feedback_Analyzer_Research_Dataset_5000.csv
├── Student_Feedback_Analyzer_NLP_Cleaned_5000.csv
└── Student_Feedback_Analyzer_Project.pdf             # Official Project Specification
```

---

## 🚀 Execution Instructions

### Windows (1-Click Launch)
Double-click `run_app.bat` to verify packages and launch the server.

### Manual Terminal Execution (VS Code / PowerShell / CMD)
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run from workspace root OR backend/
python app.py
# (or)
python backend/app.py
```

Open your browser at:
`http://127.0.0.1:5000`

### Automated Verification & Testing
```bash
# Run database unit tests
python backend/test_db.py

# Run complete REST API & NLP integration suite
python backend/test_server.py
```
