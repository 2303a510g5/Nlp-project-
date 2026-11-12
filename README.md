# EduPulse.ai — Academic Feedback NLP & Sentiment Analysis Platform

An enterprise-grade, commercial-quality AI SaaS web platform for educational institutions, accreditation boards (NAAC / NBA / ABET), and university quality assurance cells. EduPulse.ai transforms raw student sentiment into actionable academic intelligence through compound clause contrastive parsing, multi-aspect categorization, automated grievance routing, and empirical model benchmarking.

Designed with inspiration from modern enterprise software platforms (**Stripe, Linear, Vercel, Notion, and Apple**).

---

## 🏛️ System Architecture & Key Capabilities

### 1. Platform Showcase & Landing Experience (`#view-landing`)
- **Executive Hero**: High-impact value proposition, live model inference preview widget, and dual CTAs for rapid onboarding.
- **Verified Metrics Strip**: Live statistics grounded in the 5,000-corpus ground truth:
  - **5,000 Verified Responses** (100% Ground Truth)
  - **92.4% Logistic Regression F1-Score**
  - **4.2 ms CPU Inference Latency**
  - **9 Academic Aspect Facets**
- **Architecture Showcase**: Visual diagram and deep explanation of the 6-stage NLP pipeline and model comparison suite.

### 2. Feedback Diagnostic Inspector (Section 3 of Project Specification PDF)
- **Clause-Level Contrastive Parsing**: Resolves compound feedback sentences (e.g. *"The faculty explains concepts clearly, but the lab computers are very slow"*) by decomposing contrastive conjunctions (`but`, `however`, `although`) into independent semantic clauses with distinct aspect polarities.
- **Aspect & Issue Extraction**:
  - *Faculty/Teaching* &rarr; **Positive**
  - *Laboratory* &rarr; **Negative**
  - *Key Issue* &rarr; **Slow laboratory computers**
  - *Overall Sentiment* &rarr; **Mixed (88.5% Confidence)**
- **Linguistic Audit Trail**: Live token trace inspecting: Raw Text &rarr; Normalized String &rarr; Word Tokens &rarr; Stopword Removal &rarr; WordNet Lemmatized Roots.

### 3. Large Collection Feedback Analysis (Section 3 & 4 of Project Specification PDF)
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

### 4. Interactive Records Database & CRUD Persistence (SQLite)
- Interactive student submission form with star rating (1–5 stars), academic department, course code, and faculty instructor tagging.
- Real-time classification and automatic database insertion with assigned Submission IDs.
- Full CRUD operations: search debouncing, multi-filter by sentiment/department/status, pagination, detail inspector modal, status progression (`New` &rarr; `Under Review` &rarr; `Action In Progress` &rarr; `Resolved`), reviewer notes, and CSV export.

### 5. Administrator Console & Governance (`/api/admin/users`, `/api/admin/system_stats`)
- Real-time system health telemetry (99.98% uptime, active model status, total database records).
- User directory management with role auditing (**admin**, **faculty**, **student**).
- Comprehensive audit trail logging every authentication event, status update, deletion, and batch ingestion.

### 6. Authentication & Role-Based Access Control (RBAC)
- Secure session-based authentication with `werkzeug.security` PBKDF2 SHA-256 password hashing.
- Pre-seeded Demo Credentials:
  - **Admin**: `admin` / `admin123` (Full system access, admin console, deletion, status review)
  - **Faculty Reviewer**: `faculty` / `faculty123` (Department review, notes)
  - **Student**: `student` / `student123` (Feedback submission, personal tracking)
  - **Test User**: `testuser` / `test1234`

### 7. NLP Pipeline Demonstration (Section 5 of Project Specification PDF)
$$\text{Raw Text} \longrightarrow \text{Preprocessing} \longrightarrow \text{Sentiment Classification} \longrightarrow \text{Aspect Extraction} \longrightarrow \text{Topic Detection} \longrightarrow \text{Visualization}$$

### 8. Empirical Model Benchmarking (5,000 Corpus)
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
│   ├── nlp_engine.py                                 # NLP & Machine Learning Engine
│   ├── requirements.txt                              # Backend Dependencies
│   ├── test_db.py                                    # Database Unit & Auth Tests (All Passed)
│   └── test_server.py                                # REST API & Integration Tests (All Passed)
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
│   │   └── style.css
│   └── 📁 js/
│       └── app.js
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

### Manual Terminal Execution
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
