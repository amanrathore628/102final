from typing import Dict, Any
from config import settings

class CompositeRiskScorer:
    """
    Transparent Composite Risk Scoring Engine
    Combines the 5 independent detection signals into an explainable 0-100 score.
    Weights are configurable and transparently exposed to the human auditor.
    """
    def __init__(
        self,
        weight_price: float = None,
        weight_iqr: float = None,
        weight_benford: float = None,
        weight_hhi: float = None,
        weight_photo: float = None
    ):
        self.w_price = weight_price if weight_price is not None else settings.WEIGHT_PRICE_BENCHMARK
        self.w_iqr = weight_iqr if weight_iqr is not None else settings.WEIGHT_IQR_OUTLIER
        self.w_benford = weight_benford if weight_benford is not None else settings.WEIGHT_BENFORD_LAW
        self.w_hhi = weight_hhi if weight_hhi is not None else settings.WEIGHT_VENDOR_HHI
        self.w_photo = weight_photo if weight_photo is not None else settings.WEIGHT_PHOTO_SIMILARITY

    def calculate_composite_score(
        self,
        price_evidence: Dict[str, Any],
        iqr_evidence: Dict[str, Any],
        benford_evidence: Dict[str, Any],
        hhi_evidence: Dict[str, Any],
        photo_evidence: Dict[str, Any]
    ) -> Dict[str, Any]:
        s_price = float(price_evidence.get("score", 0.0))
        s_iqr = float(iqr_evidence.get("score", 0.0))
        s_benford = float(benford_evidence.get("score", 0.0))
        s_hhi = float(hhi_evidence.get("score", 0.0))
        s_photo = float(photo_evidence.get("score", 0.0))

        contrib_price = round(s_price * self.w_price, 2)
        contrib_iqr = round(s_iqr * self.w_iqr, 2)
        contrib_benford = round(s_benford * self.w_benford, 2)
        contrib_hhi = round(s_hhi * self.w_hhi, 2)
        contrib_photo = round(s_photo * self.w_photo, 2)

        total_composite = round(
            contrib_price + contrib_iqr + contrib_benford + contrib_hhi + contrib_photo,
            0
        )
        total_composite = min(100.0, max(0.0, total_composite))

        if total_composite >= 80.0:
            risk_level = "HIGH"
            priority = "High"
        elif total_composite >= 50.0:
            risk_level = "MEDIUM"
            priority = "Medium"
        else:
            risk_level = "LOW"
            priority = "Low"

        # Signal breakdown for UI receipt
        signal_breakdown = [
            {
                "signal_key": "price_anomaly",
                "label": "Price Anomaly (GeM Benchmark)",
                "raw_score": s_price,
                "weight_pct": int(self.w_price * 100),
                "contribution": contrib_price,
                "status": "Flagged" if s_price >= 60 else "Normal"
            },
            {
                "signal_key": "iqr_outlier",
                "label": "Statistical Outlier (IQR)",
                "raw_score": s_iqr,
                "weight_pct": int(self.w_iqr * 100),
                "contribution": contrib_iqr,
                "status": "Flagged" if s_iqr >= 60 else "Normal"
            },
            {
                "signal_key": "benfords_law",
                "label": "Benford's Law Deviation",
                "raw_score": s_benford,
                "weight_pct": int(self.w_benford * 100),
                "contribution": contrib_benford,
                "status": "Flagged" if s_benford >= 60 else "Normal"
            },
            {
                "signal_key": "vendor_hhi",
                "label": "Vendor Concentration (HHI)",
                "raw_score": s_hhi,
                "weight_pct": int(self.w_hhi * 100),
                "contribution": contrib_hhi,
                "status": "Flagged" if s_hhi >= 60 else "Normal"
            },
            {
                "signal_key": "photo_similarity",
                "label": "Photo & Geo Similarity",
                "raw_score": s_photo,
                "weight_pct": int(self.w_photo * 100),
                "contribution": contrib_photo,
                "status": "Flagged" if s_photo >= 60 else "Normal"
            }
        ]

        # Top contributing signals
        active_signals = [s["label"] for s in signal_breakdown if s["raw_score"] >= 60]
        if active_signals:
            explanation = (
                f"Multi-signal prioritization: elevated risk driven primarily by {', '.join(active_signals)}. "
                f"Full evidence receipts available for human review."
            )
        else:
            explanation = "Work expenditure and implementation parameters are within normal expected bounds."

        return {
            "composite_score": int(total_composite),
            "risk_level": risk_level,
            "priority": priority,
            "signal_breakdown": signal_breakdown,
            "disclaimer": "Risk score is a prioritization signal, not a fraud verdict.",
            "explanation": explanation,
            "price_evidence": price_evidence,
            "iqr_evidence": iqr_evidence,
            "benford_evidence": benford_evidence,
            "hhi_evidence": hhi_evidence,
            "photo_evidence": photo_evidence
        }

composite_scorer = CompositeRiskScorer()
