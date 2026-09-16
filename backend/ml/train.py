"""
Train XGBoost + Random Forest ensemble on India organ match dataset.
Saves models to ml/models/ directory.
"""
import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_auc_score, classification_report
import xgboost as xgb

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "india_organ_match_data.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CATEGORICAL_COLS = [
    "donor_blood_group", "recipient_blood_group",
    "hla_a_donor", "hla_b_donor", "hla_dr_donor",
    "hla_a_recipient", "hla_b_recipient", "hla_dr_recipient",
]
FEATURE_COLS = [
    "abo_compatible", "rh_compatible", "hla_mismatch_score",
    "age_difference", "donor_egfr", "donor_creatinine",
    "donor_alt", "donor_ast", "donor_ejection_fraction",
    "donor_fev1_percent", "donor_pra_percent",
    "recipient_egfr", "recipient_urgency_score",
    "recipient_pra_percent", "crossmatch_negative",
    # Encoded categoricals
    "donor_bg_encoded", "recipient_bg_encoded",
    "hla_a_d_enc", "hla_b_d_enc", "hla_dr_d_enc",
    "hla_a_r_enc", "hla_b_r_enc", "hla_dr_r_enc",
]


def load_and_prepare():
    df = pd.read_csv(DATA_PATH)

    encoders = {}
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        new_col = col + "_enc" if "hla" in col else col.replace("_blood_group", "_bg_encoded")
        # fix naming
        if col == "donor_blood_group":
            new_col = "donor_bg_encoded"
        elif col == "recipient_blood_group":
            new_col = "recipient_bg_encoded"
        elif col == "hla_a_donor":
            new_col = "hla_a_d_enc"
        elif col == "hla_b_donor":
            new_col = "hla_b_d_enc"
        elif col == "hla_dr_donor":
            new_col = "hla_dr_d_enc"
        elif col == "hla_a_recipient":
            new_col = "hla_a_r_enc"
        elif col == "hla_b_recipient":
            new_col = "hla_b_r_enc"
        elif col == "hla_dr_recipient":
            new_col = "hla_dr_r_enc"
        df[new_col] = le.fit_transform(df[col])
        encoders[col] = le

    X = df[FEATURE_COLS].values
    y = df["compatible"].values
    return X, y, encoders, df


def train():
    print("Loading data...")
    X, y, encoders, df = load_and_prepare()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # ── XGBoost ──────────────────────────────────────────────────────────────
    print("\nTraining XGBoost...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, use_label_encoder=False,
        eval_metric="logloss", random_state=42, n_jobs=-1
    )
    xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
    print(f"XGBoost AUC-ROC: {roc_auc_score(y_test, xgb_proba):.4f}")
    print(classification_report(y_test, xgb_model.predict(X_test)))

    # ── Random Forest ─────────────────────────────────────────────────────────
    print("\nTraining Random Forest...")
    rf_model = RandomForestClassifier(
        n_estimators=200, max_depth=10, min_samples_split=5,
        random_state=42, n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_proba = rf_model.predict_proba(X_test)[:, 1]
    print(f"Random Forest AUC-ROC: {roc_auc_score(y_test, rf_proba):.4f}")

    # ── Ensemble ──────────────────────────────────────────────────────────────
    ensemble_proba = 0.6 * xgb_proba + 0.4 * rf_proba
    print(f"Ensemble AUC-ROC: {roc_auc_score(y_test, ensemble_proba):.4f}")

    # Save
    joblib.dump(xgb_model, os.path.join(MODEL_DIR, "xgb_model.pkl"))
    joblib.dump(rf_model, os.path.join(MODEL_DIR, "rf_model.pkl"))
    joblib.dump(encoders, os.path.join(MODEL_DIR, "encoders.pkl"))
    joblib.dump(FEATURE_COLS, os.path.join(MODEL_DIR, "feature_cols.pkl"))
    print(f"\nModels saved to {MODEL_DIR}")


if __name__ == "__main__":
    train()
