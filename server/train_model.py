#!/usr/bin/env python3
"""
train_model.py

Robust training script for AgriSense prediction model.

- Auto-detects target column from candidates or chooses a numeric column heuristically.
- Preprocesses numeric + low-cardinality categorical features.
- Trains a RandomForestRegressor.
- Computes metrics (R2, RMSE, MAE).
- Estimates per-sample uncertainty from ensemble std and converts to a simple confidence %
- Saves pipeline+model to server/models/model.pkl

Usage:
    python train_model.py --csv server/data/predictions_dataset.csv
"""
import argparse
import os
import joblib
import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

# ---------------------
# Config / defaults
# ---------------------
DEFAULT_CSV = "data/predictions_dataset.csv"
OUT_MODEL_DIR = "server/models"
OUT_MODEL_PATH = os.path.join(OUT_MODEL_DIR, "model.pkl")

# Potential names for yield target (lowercased)
TARGET_CANDIDATES = [
    "estimated_yield_t_ha",
    "estimated_yield",
    "yield_t_ha",
    "yield",
    "yield_estimate",
    "predicted_yield",
    "target",
    "label",
    "y"
]

# ---------------------
# Helpers
# ---------------------
def find_target_column(df):
    cols_lower = {c.lower(): c for c in df.columns}
    # 1) direct match candidates
    for cand in TARGET_CANDIDATES:
        if cand in cols_lower:
            print(f"[info] Selected target from candidate list: '{cols_lower[cand]}'")
            return cols_lower[cand]

    # 2) find numeric columns with "yield" substring
    for c in df.columns:
        if "yield" in c.lower():
            try:
                if pd.to_numeric(df[c], errors="coerce").notnull().sum() > 0:
                    print(f"[info] Selected target by 'yield' substring heuristic: '{c}'")
                    return c
            except Exception:
                continue

    # 3) pick the first numeric column that is not an obvious id/metadata
    blacklist = {"id", "cid", "provider", "txhash", "timestamp", "time", "date", "name"}
    numeric_cols = []
    for c in df.columns:
        if c.lower() in blacklist:
            continue
        try:
            s = pd.to_numeric(df[c], errors="coerce")
            non_null = s.notnull().sum()
            # require at least 30 numeric values to be a candidate
            if non_null >= 30:
                numeric_cols.append((non_null, c))
        except Exception:
            pass
    numeric_cols = sorted(numeric_cols, reverse=True)
    if numeric_cols:
        chosen = numeric_cols[0][1]
        print(f"[info] Auto-selected target as numeric column: '{chosen}'")
        return chosen

    # 4) fail: no target found
    return None


def compute_confidence_from_std(std_values, y_mean):
    """
    Convert ensemble std (same units as target) to a simple percentage confidence:
      confidence = max(0, 100 * (1 - std / (scale)))
    where scale uses the mean/scale of the target so small std -> high confidence.
    """
    scale = max(abs(y_mean), 1.0)
    confs = np.clip(100.0 * (1.0 - (std_values / (scale * 1.5))), 0.0, 100.0)
    return confs


# ---------------------
# Main
# ---------------------
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default=DEFAULT_CSV, help="Path to CSV file")
    p.add_argument("--test-size", type=float, default=0.2, help="Test split fraction")
    p.add_argument("--random-state", type=int, default=42, help="RNG seed")
    args = p.parse_args()

    csv_path = args.csv
    if not os.path.exists(csv_path):
        raise SystemExit(f"[error] CSV file not found at: {csv_path}")

    print(f"[info] Loading CSV: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"[info] Loaded {len(df)} rows and {len(df.columns)} columns.")
    print("[info] Columns:", df.columns.tolist()[:200])

    print("\nSample rows:")
    print(df.head(3).to_string(index=False))

    # 1) find target column
    target_col = find_target_column(df)
    if not target_col:
        print("\n[error] Could not auto-detect a target column. Available columns:")
        for c in df.columns:
            print("  -", c)
        raise SystemExit("[error] Please set a target column name or adjust CSV header.")

    # ensure numeric target
    df[target_col] = pd.to_numeric(df[target_col], errors="coerce")
    df = df[df[target_col].notnull()].copy()
    print(f"[info] Using target column: '{target_col}'  — rows after dropping NA: {len(df)}")

    # 2) feature selection — drop obvious non-features
    non_feature_keywords = {"id", "cid", "provider", "txhash", "timestamp", "time", "date", "name", "tokenuri"}
    feature_cols = []
    for c in df.columns:
        if c == target_col:
            continue
        if c.lower() in non_feature_keywords:
            continue
        non_null = df[c].notnull().sum()
        if non_null == 0:
            continue
        feature_cols.append(c)

    print(f"[info] Candidate feature columns ({len(feature_cols)}): {feature_cols[:40]}{'...' if len(feature_cols)>40 else ''}")

    # split features into numeric and categorical (small cardinality)
    numeric_feats = []
    categorical_feats = []
    for c in feature_cols:
        if pd.api.types.is_numeric_dtype(df[c]):
            numeric_feats.append(c)
        else:
            nunq = df[c].nunique(dropna=True)
            if nunq <= 30:
                categorical_feats.append(c)
            else:
                print(f"[info] Skipping high-cardinality text column for now: {c} (unique={nunq})")

    print(f"[info] Numeric features: {numeric_feats}")
    print(f"[info] Categorical features (one-hot): {categorical_feats}")

    # 3) prepare X, y
    X = df[numeric_feats + categorical_feats].copy()
    y = df[target_col].astype(float).copy()

    # numeric transformer
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    # categorical transformer - using sparse_output (newer sklearn) so we avoid 'sparse' arg mismatch
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        # sklearn v1.2+ uses sparse_output; set to False to get dense array
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_feats),
            ("cat", categorical_transformer, categorical_feats),
        ],
        remainder="drop",
        sparse_threshold=0  # force dense output
    )

    # 4) model pipeline
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        random_state=args.random_state,
        n_jobs=-1
    )

    pipeline = Pipeline([
        ("pre", preprocessor),
        ("model", model)
    ])

    # 5) split and fit
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=args.test_size, random_state=args.random_state)
    print(f"[info] Training on {len(X_train)} rows, validating on {len(X_test)} rows...")
    pipeline.fit(X_train, y_train)
    print("[info] Training complete.")

    # 6) predictions and metrics
    preds = pipeline.predict(X_test)
    r2 = r2_score(y_test, preds)
    mse = mean_squared_error(y_test, preds)
    rmse = mse ** 0.5   
    mae = mean_absolute_error(y_test, preds)
    print("\n[metrics]")
    print(f" R²   : {r2:.4f}")
    print(f" RMSE : {rmse:.4f}")
    print(f" MAE  : {mae:.4f}")

    # 7) per-sample uncertainty: use individual trees in RandomForest
    try:
        pre = pipeline.named_steps["pre"]
        Xt_test = pre.transform(X_test)
        rf = pipeline.named_steps["model"]
        all_preds = np.vstack([est.predict(Xt_test) for est in rf.estimators_])
        stds = np.std(all_preds, axis=0)
        mean_std = float(np.mean(stds))
        y_mean = float(np.mean(y_train))
        confidences = compute_confidence_from_std(stds, y_mean)

        print(f"[uncertainty] mean std across test set: {mean_std:.4f}")
        # properly named short list for printing
        confidences_short = (confidences[:5].tolist() if len(confidences) > 0 else [])
        print(f"[uncertainty] sample confidence (example first 5): {confidences_short}")
        avg_confidence = float(np.mean(confidences)) if len(confidences) > 0 else None
        print(f"[uncertainty] average confidence ≈ {avg_confidence:.2f}%")
    except Exception as e:
        print("[warn] Could not compute per-sample uncertainty from RF ensemble:", e)
        stds = np.zeros_like(preds)
        confidences = np.zeros_like(preds)
        avg_confidence = None

    # 8) Save model + metadata
    os.makedirs(OUT_MODEL_DIR, exist_ok=True)
    model_artifact = {
        "pipeline": pipeline,
        "target_col": target_col,
        "numeric_features": numeric_feats,
        "categorical_features": categorical_feats,
        "metrics": {"r2": r2, "rmse": rmse, "mae": mae, "avg_confidence": float(avg_confidence) if avg_confidence is not None else None},
    }
    joblib.dump(model_artifact, OUT_MODEL_PATH)
    print(f"[info] Saved model artifact to: {OUT_MODEL_PATH}")

    # 9) Export a small JSON summary (to be consumed by frontend/server)
    summary = {
        "n_rows": len(df),
        "n_features": len(numeric_feats) + len(categorical_feats),
        "target_col": target_col,
        "metrics": model_artifact["metrics"]
    }
    with open(os.path.join(OUT_MODEL_DIR, "model_summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2)
    print(f"[info] Wrote model summary to: {os.path.join(OUT_MODEL_DIR, 'model_summary.json')}")
    print("[done]")


if __name__ == "__main__":
    main()
