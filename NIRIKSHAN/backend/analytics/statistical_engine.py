from typing import List, Dict, Any
import numpy as np

class IQROutlierEngine:
    """
    Engine 2: Statistical IQR Outlier Detection
    Uses Interquartile Range method across category & district cohorts.
    Calculates Q1, Q3, IQR, Upper/Lower bounds, and exposes transparent boxplot values.
    """
    def analyze_work(self, expenditure: float, cohort_expenditures: List[float], cohort_name: str = "District Cohort") -> Dict[str, Any]:
        if not cohort_expenditures or len(cohort_expenditures) < 3:
            # Fallback if cohort is small
            return {
                "score": 30.0,
                "observed_value": expenditure,
                "median": expenditure,
                "q1": expenditure * 0.8,
                "q3": expenditure * 1.2,
                "iqr": expenditure * 0.4,
                "lower_bound": max(0.0, expenditure * 0.2),
                "upper_bound": expenditure * 1.8,
                "outlier_status": "NORMAL",
                "outlier_level": "GREEN",
                "explanation": f"Cohort sample size too small for statistical divergence in {cohort_name}."
            }

        arr = np.array(cohort_expenditures, dtype=float)
        q1 = float(np.percentile(arr, 25))
        median = float(np.median(arr))
        q3 = float(np.percentile(arr, 75))
        iqr = q3 - q1
        
        lower_bound = max(0.0, float(q1 - 1.5 * iqr))
        upper_bound = float(q3 + 1.5 * iqr)
        extreme_bound = float(q3 + 3.0 * iqr)

        if expenditure > extreme_bound:
            outlier_status = "EXTREME OUTLIER"
            outlier_level = "RED"
            raw_score = min(100.0, 80.0 + ((expenditure - extreme_bound) / (extreme_bound or 1.0)) * 20.0)
            explanation = f"Expenditure ₹{expenditure:,.0f} significantly exceeds upper IQR threshold (₹{upper_bound:,.0f}) by statistical anomaly margin."
        elif expenditure > upper_bound:
            outlier_status = "ELEVATED RISK OUTLIER"
            outlier_level = "ORANGE"
            raw_score = 65.0 + ((expenditure - upper_bound) / ((extreme_bound - upper_bound) or 1.0)) * 15.0
            explanation = f"Expenditure ₹{expenditure:,.0f} exceeds standard cohort upper bound ₹{upper_bound:,.0f}."
        elif expenditure < lower_bound:
            outlier_status = "LOW EXPENDITURE OUTLIER"
            outlier_level = "YELLOW"
            raw_score = 40.0
            explanation = f"Expenditure ₹{expenditure:,.0f} is unusually below district cohort median ₹{median:,.0f}."
        else:
            outlier_status = "WITHIN STATISTICAL BOUNDS"
            outlier_level = "GREEN"
            # Scale smoothly from 0 to 45
            rel_pos = (expenditure - q1) / (iqr or 1.0)
            raw_score = max(5.0, min(50.0, 25.0 + rel_pos * 15.0))
            explanation = f"Expenditure ₹{expenditure:,.0f} is within normal interquartile distribution range for {cohort_name}."

        return {
            "score": round(float(raw_score), 1),
            "observed_value": round(float(expenditure), 2),
            "median": round(float(median), 2),
            "q1": round(float(q1), 2),
            "q3": round(float(q3), 2),
            "iqr": round(float(iqr), 2),
            "lower_bound": round(float(lower_bound), 2),
            "upper_bound": round(float(upper_bound), 2),
            "outlier_status": outlier_status,
            "outlier_level": outlier_level,
            "cohort_count": len(cohort_expenditures),
            "explanation": explanation
        }

iqr_engine = IQROutlierEngine()
