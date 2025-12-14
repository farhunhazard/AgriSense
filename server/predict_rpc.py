#!/usr/bin/env python3
# server/predict_rpc.py
import json,sys,os
import pandas as pd
import pickle
import numpy as np

BASE = os.path.dirname(__file__)
MODEL_PKL = os.path.join(BASE, "models", "model.pkl")
SUMMARY_JSON = os.path.join(BASE, "models", "model_summary.json")

# load model & summary
with open(MODEL_PKL, "rb") as f:
    model = pickle.load(f)

try:
    with open(SUMMARY_JSON, "r") as f:
        summary = json.load(f)
except:
    summary = {}

# expected input features (if saved in summary use that, else fallback)
expected_features = summary.get("feature_names", None)
if expected_features is None:
    # guess from training (random forest with feature_names_in_ or from summary)
    if hasattr(model, "feature_names_in_"):
        expected_features = list(model.feature_names_in_)
    else:
        expected_features = []

def read_stdin_json():
    raw = sys.stdin.read()
    if not raw:
        return {}
    return json.loads(raw)

def build_row(input_json):
    # input_json should contain keys matching expected_features
    # create a record with default NaN, fill from input_json
    row = {}
    for f in expected_features:
        row[f] = input_json.get(f, None)
    # also allow common names mapping
    # if "ndvi" not in expected and present, include it
    for k,v in input_json.items():
        if k not in row:
            row[k] = v
    return row

def main():
    try:
        inp = read_stdin_json()
        # Build dataframe with one row
        row = build_row(inp)
        df = pd.DataFrame([row])
        # Basic preprocessing: for columns numeric try convert
        for col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except:
                pass
        # Fill NaN with 0 for numeric; for categorical allow model pipeline to handle missing
        df = df.fillna(0)
        # If model pipeline expects different order, we assume saved pipeline handles this. Try direct predict.
        # If model has predict_proba or estimators_, we can compute per-tree predictions for RF.
        pred = None
        std = None
        try:
            pred = float(model.predict(df)[0])
        except Exception as e:
            # If model is a pipeline expecting specific columns, try to pass df as dict
            pred = float(model.predict(df)[0])

        # per-tree predictions if available (RandomForestRegressor)
        per_tree = None
        try:
            if hasattr(model, "estimators_"):
                preds = np.array([est.predict(df)[0] for est in model.estimators_])
                per_tree = preds.tolist()
                std = float(np.std(preds))
        except Exception:
            per_tree = None
            std = None

        out = {
            "predicted": pred,
            "std": std,
            "per_tree": per_tree,
            "model_accuracy": summary.get("r2", None) or summary.get("r2_score", None),
            "feature_inputs": row
        }
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
