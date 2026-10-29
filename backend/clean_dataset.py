"""
Student Feedback Analyzer - Data Preprocessing Module
Standalone dataset cleaning and tokenization utility.
"""

import os
import re
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

def setup_nltk():
    packages = ['punkt', 'stopwords', 'wordnet', 'omw-1.4', 'punkt_tab']
    for pkg in packages:
        try:
            nltk.download(pkg, quiet=True)
        except Exception:
            pass

setup_nltk()

stemmer = PorterStemmer()
lemmatizer = WordNetLemmatizer()
try:
    stop_words = set(stopwords.words('english'))
except Exception:
    stop_words = set()

def clean_raw_text(text: str) -> str:
    if pd.isna(text) or not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def tokenize(text: str) -> list:
    if not text:
        return []
    try:
        return word_tokenize(text)
    except Exception:
        return text.split()

def remove_stop_words(tokens: list) -> list:
    return [w for w in tokens if w not in stop_words and len(w) > 1]

def stem_tokens(tokens: list) -> list:
    return [stemmer.stem(w) for w in tokens]

def clean_feedback_dataset(input_csv_path: str, output_csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(input_csv_path)
    df['duplicate_feedback'] = df['feedback_text'].duplicated(keep='first').map({True: 'Yes', False: 'No'})
    df['cleaned_text'] = df['feedback_text'].apply(clean_raw_text)
    df['tokens'] = df['cleaned_text'].apply(tokenize)
    df['token_count'] = df['tokens'].apply(len)
    df['tokens_no_stopwords'] = df['tokens'].apply(remove_stop_words)
    df['lemmatized_tokens'] = df['tokens_no_stopwords'].apply(stem_tokens)
    df['final_nlp_text'] = df['lemmatized_tokens'].apply(lambda t: ' '.join(t))
    df['final_token_count'] = df['lemmatized_tokens'].apply(len)
    df.to_csv(output_csv_path, index=False)
    return df

if __name__ == "__main__":
    src = os.path.join(PROJECT_ROOT, "Student_Feedback_Analyzer_Research_Dataset_5000.csv")
    dst = os.path.join(PROJECT_ROOT, "Student_Feedback_Analyzer_NLP_Cleaned_5000.csv")
    if os.path.exists(src):
        clean_feedback_dataset(src, dst)
        print("Cleaning completed successfully.")
