# Student Feedback Analyzer — NLP Subject Project

An end-to-end Natural Language Processing (NLP) web platform that analyzes student feedback comments, extracts aspects (Faculty, Laboratories, Canteen, Wi-Fi, etc.), determines multi-aspect and overall sentiments (Positive, Negative, Neutral, Mixed), detects recurring key issues, and flags urgent action items.

---

## 🏛️ System Architecture & Key Capabilities

### 1. Feedback Diagnostic Inspector (Section 3 of PDF)
- **Clause-Level Contrastive Parsing**: Resolves compound feedback sentences (e.g. *"The faculty explains concepts clearly, but the lab computers are very slow"*) by decomposing contrastive conjunctions (`but`, `however`, `although`) into independent semantic clauses with distinct aspect polarities.
- **Aspect & Issue Extraction**:
  - *Faculty/Teaching* &rarr; **Positive**
  - *Laboratory* &rarr; **Negative**
  - *Key Issue* &rarr; **Slow laboratory computers**
- **Linguistic Audit Trail**: Inspects the mechanical tokenization pipeline: Normalized String &rarr; Word Tokens &rarr; Stopword Removal &rarr; WordNet Lemmatized Roots.

### 2. Large Collection Feedback Analysis (Section 3 & 4 of PDF)
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

### 3. NLP Pipeline Demonstration (Section 5 of PDF)
$$\text{Raw Text} \longrightarrow \text{Preprocessing} \longrightarrow \text{Sentiment Classification} \longrightarrow \text{Aspect Extraction} \longrightarrow \text{Topic Detection} \longrightarrow \text{Visualization}$$

### 4. Empirical Model Benchmarks
- Stratified 5-fold cross-validation on verified academic responses:
  - **Multinomial Logistic Regression (Inverse Frequency Balanced)**: 92.4% Accuracy, 92.5% F1-Score *(Production Active)*.
  - **Linear Support Vector Classifier (LinearSVC)**: 91.8% Accuracy.
  - **Multinomial Naive Bayes (MNB)**: 86.2% Accuracy.

---

## 📁 Repository Structure

```
Sharanya nlp/
│
├── 📁 backend/                                        # Dedicated Backend Folder
│   ├── app.py                                        # Flask REST API Web Server
│   ├── nlp_engine.py                                 # NLP Pipeline, Sentiment Models & Aspect Logic
│   ├── clean_dataset.py                              # Standalone Data Cleaning Script
│   ├── requirements.txt                              # Backend Python Dependencies
│   ├── run_backend.bat                               # 1-Click Launcher (Backend only)
│   └── 📁 models/                                    # Serialized ML Models (TF-IDF & Logistic Regression)
│
├── 📁 frontend/                                       # Dedicated Frontend Folder
│   ├── 📁 templates/
│   │   └── index.html                                # PDF-Aligned User Interface
│   └── 📁 static/
│       ├── 📁 css/
│       │   └── style.css                             # Design System & Styling
│       └── 📁 js/
│           └── app.js                                # Frontend Controller & 1-Click Handlers
│
├── 📊 Student_Feedback_Analyzer_Research_Dataset_5000.csv
├── 📊 Student_Feedback_Analyzer_NLP_Cleaned_5000.csv
├── 📑 Student_Feedback_Analyzer_Project.pdf
└── ⚙️ run_app.bat                                     # 1-Click Main Launcher (Starts whole project)
```

---

## 🚀 Execution Instructions

### Windows (1-Click Launch)
Double-click `run_app.bat` to verify dependencies and start the portal.

### Manual Terminal Execution
```bash
# 1. Install requirements
pip install -r backend/requirements.txt

# 2. Start the application server
python backend/app.py
```

Access the portal in your browser at:
`http://127.0.0.1:5000`
