"""
=============================================================================
Student Feedback Analyzer - NLP Data Cleaning & Preprocessing Pipeline
Project: Student Feedback Analyzer (NLP Subject Project)
Description:
    This script loads the raw student feedback dataset, performs comprehensive
    text cleaning, tokenization, stop-word removal, and stemming/lemmatization,
    and exports the final cleaned dataset ready for Sentiment Analysis & Aspect Extraction.
=============================================================================
"""

import os
import re
import ast
import pandas as pd
import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer

# ---------------------------------------------------------------------------
# 1. Download Required NLTK Resources
# ---------------------------------------------------------------------------
def setup_nltk():
    """Ensure all required NLTK tokenizers, corpora, and lexicons are downloaded."""
    packages = ['punkt', 'stopwords', 'wordnet', 'omw-1.4', 'punkt_tab']
    for pkg in packages:
        try:
            nltk.download(pkg, quiet=True)
        except Exception as e:
            print(f"Note: Could not download {pkg}: {e}")

setup_nltk()

# ---------------------------------------------------------------------------
# 2. Text Preprocessing Helper Functions
# ---------------------------------------------------------------------------
stemmer = PorterStemmer()
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def clean_raw_text(text: str) -> str:
    """
    Standard text normalization:
    1. Handle NaN / non-string values
    2. Lowercase text
    3. Remove URLs, mentions, HTML tags
    4. Remove punctuation and special characters (retain alphanumeric and spaces)
    5. Collapse multiple spaces
    """
    if pd.isna(text) or not isinstance(text, str):
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove HTML tags & URLs if present
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Remove punctuation and special characters
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def tokenize(text: str) -> list:
    """Tokenize normalized text into a list of words."""
    if not text:
        return []
    try:
        return word_tokenize(text)
    except Exception:
        # Fallback to regex splitting if NLTK tokenizer isn't available
        return text.split()

def remove_stop_words(tokens: list, custom_stopwords: set = None) -> list:
    """Remove common English stopwords from token list."""
    current_stopwords = stop_words if custom_stopwords is None else custom_stopwords
    return [word for word in tokens if word not in current_stopwords and len(word) > 1]

def stem_tokens(tokens: list) -> list:
    """Apply Porter Stemmer to reduce words to their base/root form."""
    return [stemmer.stem(word) for word in tokens]

def lemmatize_tokens(tokens: list) -> list:
    """Apply WordNet Lemmatizer to reduce words to dictionary lemmas."""
    return [lemmatizer.lemmatize(word) for word in tokens]

# ---------------------------------------------------------------------------
# 3. Main Data Cleaning & Transformation Pipeline
# ---------------------------------------------------------------------------
def clean_feedback_dataset(input_csv_path: str, output_csv_path: str = None) -> pd.DataFrame:
    """
    Full pipeline to clean the Student Feedback dataset:
    - Loads raw dataset
    - Handles missing values & duplicates
    - Runs text preprocessing (lowercasing, cleaning, tokenization, stop-word removal, stemming)
    - Computes token counts
    - Exports the cleaned CSV
    """
    print(f"--> [1/5] Loading raw dataset from: {input_csv_path}")
    if not os.path.exists(input_csv_path):
        raise FileNotFoundError(f"Input file not found: {input_csv_path}")
    
    df = pd.read_csv(input_csv_path)
    total_records = len(df)
    print(f"    Loaded {total_records:,} records with {df.shape[1]} columns.")

    # 1. Check for duplicates in feedback_text
    print("--> [2/5] Checking duplicates and missing values...")
    is_duplicate = df['feedback_text'].duplicated(keep='first')
    df['duplicate_feedback'] = is_duplicate.map({True: 'Yes', False: 'No'})
    num_duplicates = is_duplicate.sum()
    print(f"    Identified {num_duplicates} duplicate feedback entries.")

    # Fill missing values for optional text/aspect fields
    text_cols_to_fill = ['secondary_aspect', 'aspect_2_sentiment', 'key_issue']
    for col in text_cols_to_fill:
        if col in df.columns:
            df[col] = df[col].fillna('')

    # 2. Text Normalization (Cleaned Text)
    print("--> [3/5] Cleaning and normalizing feedback text...")
    df['cleaned_text'] = df['feedback_text'].apply(clean_raw_text)

    # 3. Tokenization
    print("--> [4/5] Tokenizing, removing stopwords, and stemming...")
    df['tokens'] = df['cleaned_text'].apply(tokenize)
    df['token_count'] = df['tokens'].apply(len)

    # Stopwords Removal
    df['tokens_no_stopwords'] = df['tokens'].apply(remove_stop_words)

    # Stemming / Lemmatization (Porter Stemmer matches standard academic pipelines)
    df['lemmatized_tokens'] = df['tokens_no_stopwords'].apply(stem_tokens)

    # Final processed text string for TF-IDF / Word2Vec / Sentiment Models
    df['final_nlp_text'] = df['lemmatized_tokens'].apply(lambda tokens: ' '.join(tokens))
    df['final_token_count'] = df['lemmatized_tokens'].apply(len)

    # 4. Summary Statistics
    print("--> [5/5] Generating Summary & Quality Checks:")
    avg_tokens_before = df['token_count'].mean()
    avg_tokens_after = df['final_token_count'].mean()
    reduction = ((avg_tokens_before - avg_tokens_after) / avg_tokens_before) * 100
    
    print(f"    * Average tokens before cleaning: {avg_tokens_before:.2f}")
    print(f"    * Average tokens after cleaning:  {avg_tokens_after:.2f}")
    print(f"    * Vocabulary / token reduction:   {reduction:.1f}%")

    if 'overall_sentiment' in df.columns:
        print("\n--- Sentiment Distribution ---")
        sentiment_dist = df['overall_sentiment'].value_counts(normalize=True) * 100
        for sentiment, pct in sentiment_dist.items():
            print(f"    {sentiment:10}: {pct:.1f}%")

    if 'primary_aspect' in df.columns:
        print("\n--- Top Feedback Aspects ---")
        top_aspects = df['primary_aspect'].value_counts().head(5)
        for aspect, count in top_aspects.items():
            print(f"    {aspect:15}: {count} feedbacks")

    # 5. Save Output
    if output_csv_path:
        df.to_csv(output_csv_path, index=False)
        print(f"\n[SUCCESS] Cleaned dataset saved to: {output_csv_path}")

    return df

# ---------------------------------------------------------------------------
# 4. Script Execution Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # File Paths (relative to current project directory)
    input_file = "Student_Feedback_Analyzer_Research_Dataset_5000.csv"
    output_file = "Student_Feedback_Analyzer_NLP_Cleaned_5000.csv"

    print("=" * 70)
    print("  STUDENT FEEDBACK ANALYZER: NLP DATASET CLEANING & PREPROCESSING")
    print("=" * 70)

    try:
        cleaned_df = clean_feedback_dataset(input_file, output_file)
        
        # Display sample transformation
        print("\n--- Sample Row Transformation (Before vs After) ---")
        sample = cleaned_df.iloc[0]
        print(f"Original Text  : {sample['feedback_text']}")
        print(f"Cleaned Text   : {sample['cleaned_text']}")
        print(f"Tokens         : {sample['tokens']}")
        print(f"No Stopwords   : {sample['tokens_no_stopwords']}")
        print(f"Stemmed/Lemmat : {sample['lemmatized_tokens']}")
        print(f"Final NLP Text : {sample['final_nlp_text']}")
        print("=" * 70)
    except Exception as err:
        print(f"Error during preprocessing: {err}")
