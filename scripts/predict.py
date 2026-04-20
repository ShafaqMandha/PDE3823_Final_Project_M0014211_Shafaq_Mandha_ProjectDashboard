import json
import os
import sys
from datetime import datetime


def _read_stdin_json():
    raw = sys.stdin.read()
    if not raw.strip():
        raise ValueError("Empty stdin")
    return json.loads(raw)


def _load_model(model_path: str):
    try:
        import joblib  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Missing Python dependency: joblib. Install with: pip install joblib"
        ) from e
    return joblib.load(model_path)


def _unwrap_model(obj):
    """
    Some training code saves a dict with the real estimator under a key like
    'model', 'estimator', 'pipeline', etc. Unwrap common patterns.
    """
    seen = set()
    cur = obj
    for _ in range(10):
        oid = id(cur)
        if oid in seen:
            break
        seen.add(oid)

        if hasattr(cur, "predict") or hasattr(cur, "predict_proba"):
            return cur

        if isinstance(cur, dict):
            for key in (
                # project-specific common keys
                "xgb_model",
                "rf_model",
                "model",
                "estimator",
                "pipeline",
                "clf",
                "classifier",
                "regressor",
                "best_estimator_",
                "booster",
            ):
                if key in cur:
                    cur = cur[key]
                    break
            else:
                # No known key: give up.
                return cur
        else:
            return cur

    return cur

def _select_default_model(obj):
    # If the pickle is a dict of multiple estimators, pick the XGB one by default.
    if isinstance(obj, dict):
        for key in ("xgb_model", "model", "estimator", "pipeline", "clf", "classifier"):
            if key in obj:
                return obj[key]
        # fallback: first value
        for v in obj.values():
            return v
    return obj


def _get_feature_names(model):
    names = getattr(model, "feature_names_in_", None)
    if names is None:
        return None
    return list(names)

def _numeric_feature_dict(d: dict):
    return {k: v for k, v in d.items() if isinstance(v, (int, float))}


def _predict(model, X):
    # XGBoost Booster support
    try:
        import xgboost as xgb  # type: ignore
    except Exception:
        xgb = None

    if xgb is not None and isinstance(model, getattr(xgb, "Booster", ())):
        dmat = xgb.DMatrix(X)
        pred = model.predict(dmat)
        return float(pred[0])

    # Try predict_proba -> take class 1 probability.
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)
        # Handle shape (n,2) or (n,) edge cases
        try:
            return float(proba[0][1])
        except Exception:
            return float(proba[0])
    # Fallback: predict (assume already 0..1)
    y = model.predict(X)
    return float(y[0])


def _feature_importance(model, feature_names):
    if feature_names is None:
        return {}

    if hasattr(model, "feature_importances_"):
        imp = getattr(model, "feature_importances_")
        try:
            total = float(sum(imp)) or 1.0
            return {feature_names[i]: float(imp[i]) / total for i in range(min(len(imp), len(feature_names)))}
        except Exception:
            return {}

    if hasattr(model, "coef_"):
        coef = getattr(model, "coef_")
        try:
            # binary: shape (1, n)
            weights = coef[0] if hasattr(coef[0], "__len__") else coef
            absw = [abs(float(w)) for w in weights]
            total = float(sum(absw)) or 1.0
            return {feature_names[i]: absw[i] / total for i in range(min(len(absw), len(feature_names)))}
        except Exception:
            return {}

    return {}


def _risk_category(score: float):
    if score < 0.33:
        return "Low"
    if score < 0.66:
        return "Medium"
    return "High"


def main():
    payload = _read_stdin_json()
    features = payload.get("features", {})
    if not isinstance(features, dict) or not features:
        raise ValueError("Payload must include non-empty 'features' object")

    # Drop common non-feature columns that may be present in raw CSV rows.
    for k in (
        "event_id",
        "mission_id",
    ):
        if k in features:
            features.pop(k, None)

    model_path = os.path.join(os.getcwd(), "models", "hybrid_model.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")

    model_obj = _load_model(model_path)

    rf_model = None
    xgb_model = None
    if isinstance(model_obj, dict):
        rf_model = model_obj.get("rf_model")
        xgb_model = model_obj.get("xgb_model")

    if rf_model is None or xgb_model is None:
        raise TypeError(
            "hybrid_model.pkl must be a dict with keys 'rf_model' and 'xgb_model'."
        )

    rf_model = _unwrap_model(rf_model)
    xgb_model = _unwrap_model(xgb_model)

    try:
        import numpy as np  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Missing Python dependency: numpy. Install with: pip install numpy"
        ) from e

    # =========================================================
    # MATCH YOUR TRAINING PIPELINE EXACTLY:
    # - RF regression on base features
    # - Append rf_pred as last column
    # - XGB multi-class prediction on hybrid features
    # =========================================================
    numeric = _numeric_feature_dict(features)

    rf_feature_names = _get_feature_names(rf_model)
    if rf_feature_names is None:
        raise TypeError("rf_model is missing feature_names_in_. Re-save with sklearn >= 1.0.")

    missing = [n for n in rf_feature_names if n not in numeric]
    if missing:
        raise ValueError(f"Missing required RF features: {missing[:25]}" + ("..." if len(missing) > 25 else ""))

    X_base = np.array([[float(numeric[n]) for n in rf_feature_names]], dtype=float)
    rf_pred = float(rf_model.predict(X_base)[0])

    X_hybrid = np.concatenate([X_base, np.array([[rf_pred]], dtype=float)], axis=1)

    # XGBClassifier returns probabilities for 3 classes
    if not hasattr(xgb_model, "predict_proba"):
        raise TypeError("xgb_model does not support predict_proba(). Expected XGBClassifier.")

    proba = xgb_model.predict_proba(X_hybrid)[0]
    probs = [float(p) for p in proba]
    pred_class = int(np.argmax(probs))

    # training mapping: 0=high, 1=medium, 2=low
    class_to_level = {0: "High", 1: "Medium", 2: "Low"}
    risk_level = class_to_level.get(pred_class, "Low")

    # riskScore for UI: probability of "High" class (index 0)
    risk_score = float(probs[0]) if len(probs) > 0 else 0.0
    risk_score = max(0.0, min(1.0, risk_score))

    # Feature importance: for XGB, names aren't stored; expose RF feature names + rf_pred
    hybrid_feature_names = list(rf_feature_names) + ["rf_pred"]
    fi = _feature_importance(xgb_model, hybrid_feature_names)

    result = {
        "riskScore": risk_score,
        "riskCategory": risk_level,
        "collisionProbability": risk_score,
        "confidence": 0.9,
        "featureImportance": fi,
        "modelVersion": "hybrid_model.pkl",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()

