"""
ML Inference Engine — XGBoost + Random Forest Ensemble + SHAP + LIME
"""
import os
import numpy as np
import joblib
from typing import Dict, Any, Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

_xgb_model = None
_rf_model = None
_encoders = None
_feature_cols = None


def _load_models():
    global _xgb_model, _rf_model, _encoders, _feature_cols
    if _xgb_model is None:
        _xgb_model = joblib.load(os.path.join(MODEL_DIR, "xgb_model.pkl"))
        _rf_model = joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl"))
        _encoders = joblib.load(os.path.join(MODEL_DIR, "encoders.pkl"))
        _feature_cols = joblib.load(os.path.join(MODEL_DIR, "feature_cols.pkl"))


def encode_features(donor_data: Dict, recipient_data: Dict) -> np.ndarray:
    _load_models()
    
    def safe_encode(encoder, val, default=0):
        try:
            return encoder.transform([val])[0]
        except Exception:
            return default

    donor_bg = donor_data.get("blood_group", "O+")
    recipient_bg = recipient_data.get("blood_group", "O+")

    # ABO/Rh
    abo_compat_map = {"O": ["O","A","B","AB"], "A":["A","AB"], "B":["B","AB"], "AB":["AB"]}
    donor_abo = donor_bg.replace("+","").replace("-","")
    recipient_abo = recipient_bg.replace("+","").replace("-","")
    abo_ok = int(recipient_abo in abo_compat_map.get(donor_abo, []))
    rh_ok = int("+" not in donor_bg or "+" in recipient_bg)

    hla_d = {"A": donor_data.get("hla_a","A*02"), "B": donor_data.get("hla_b","B*40"), "DR": donor_data.get("hla_dr","DR*15")}
    hla_r = {"A": recipient_data.get("hla_a","A*02"), "B": recipient_data.get("hla_b","B*40"), "DR": recipient_data.get("hla_dr","DR*15")}
    hla_mm = sum(1 for l in ["A","B","DR"] if hla_d[l] != hla_r[l])

    features = [
        abo_ok,
        rh_ok,
        hla_mm,
        abs(donor_data.get("age",35) - recipient_data.get("age",45)),
        donor_data.get("egfr", 85),
        donor_data.get("creatinine", 0.9),
        donor_data.get("alt", 25),
        donor_data.get("ast", 22),
        donor_data.get("ejection_fraction", 62),
        donor_data.get("fev1_percent", 85),
        donor_data.get("pra_percent", 5),
        recipient_data.get("egfr", 30),
        recipient_data.get("urgency_score", 5.0),
        recipient_data.get("pra_percent", 20),
        int(recipient_data.get("crossmatch_result","negative") == "negative"),
        safe_encode(_encoders["donor_blood_group"], donor_bg),
        safe_encode(_encoders["recipient_blood_group"], recipient_bg),
        safe_encode(_encoders["hla_a_donor"], hla_d["A"]),
        safe_encode(_encoders["hla_b_donor"], hla_d["B"]),
        safe_encode(_encoders["hla_dr_donor"], hla_d["DR"]),
        safe_encode(_encoders["hla_a_recipient"], hla_r["A"]),
        safe_encode(_encoders["hla_b_recipient"], hla_r["B"]),
        safe_encode(_encoders["hla_dr_recipient"], hla_r["DR"]),
    ]
    return np.array(features, dtype=np.float32).reshape(1, -1)


def predict_match(donor_data: Dict, recipient_data: Dict) -> Dict[str, Any]:
    _load_models()
    X = encode_features(donor_data, recipient_data)
    
    xgb_proba = float(_xgb_model.predict_proba(X)[0][1])
    rf_proba = float(_rf_model.predict_proba(X)[0][1])
    ensemble = 0.6 * xgb_proba + 0.4 * rf_proba
    
    if ensemble >= 0.75:
        compat_class = "High"
    elif ensemble >= 0.50:
        compat_class = "Medium"
    elif ensemble >= 0.25:
        compat_class = "Low"
    else:
        compat_class = "Incompatible"
    
    return {
        "xgb_score": round(xgb_proba, 4),
        "rf_score": round(rf_proba, 4),
        "ensemble_score": round(ensemble, 4),
        "compatibility_class": compat_class,
        "feature_names": _feature_cols,
        "feature_values": X[0].tolist(),
    }


def get_shap_explanation(donor_data: Dict, recipient_data: Dict) -> Dict:
    import shap
    _load_models()
    X = encode_features(donor_data, recipient_data)
    explainer = shap.TreeExplainer(_xgb_model)
    shap_values = explainer.shap_values(X)
    feature_names = _feature_cols
    return {
        "shap_values": dict(zip(feature_names, shap_values[0].tolist())),
        "base_value": float(explainer.expected_value),
    }


def get_lime_explanation(donor_data: Dict, recipient_data: Dict, num_features: int = 10) -> Dict:
    import lime.lime_tabular
    import pandas as pd
    _load_models()
    
    # Load training data for background distribution
    data_path = os.path.join(os.path.dirname(__file__), "data", "india_organ_match_data.csv")
    df = pd.read_csv(data_path)
    
    from ml.train import load_and_prepare
    X_train, _, _, _ = load_and_prepare()
    
    explainer = lime.lime_tabular.LimeTabularExplainer(
        X_train, feature_names=_feature_cols, class_names=["Incompatible", "Compatible"],
        mode="classification", discretize_continuous=True, random_state=42
    )
    X = encode_features(donor_data, recipient_data)[0]
    exp = explainer.explain_instance(X, _xgb_model.predict_proba, num_features=num_features)
    
    return {
        "lime_features": [{"feature": f, "weight": w} for f, w in exp.as_list()],
        "local_prediction": exp.local_pred.tolist() if hasattr(exp, 'local_pred') else [],
    }
