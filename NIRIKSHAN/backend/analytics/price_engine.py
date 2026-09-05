from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz, process

class PriceBenchmarkingEngine:
    """
    Engine 1: GeM Price Benchmarking
    Compares extracted MPLADS item expenditure against external reference prices (GeM).
    Uses rapidfuzz for robust fuzzy item normalization and matching.
    """
    def __init__(self, tolerance_pct: float = 15.0):
        self.tolerance_pct = tolerance_pct

    def match_item(self, item_name: str, reference_catalog: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Fuzzy matches item_name against GeM catalog using token sort ratio.
        """
        if not reference_catalog or not item_name:
            return None
        
        choices = {ref["item_name"]: ref for ref in reference_catalog}
        match_result = process.extractOne(
            item_name,
            list(choices.keys()),
            scorer=fuzz.token_sort_ratio
        )
        
        if match_result:
            matched_name, score, _ = match_result
            ref = choices[matched_name]
            return {
                "matched_ref_id": ref.get("id"),
                "matched_item_name": ref.get("item_name"),
                "category": ref.get("category"),
                "unit": ref.get("unit"),
                "gem_reference_price": ref.get("gem_reference_price"),
                "match_confidence": round(float(score), 1),
                "tolerance_pct": ref.get("tolerance_pct", self.tolerance_pct)
            }
        return None

    def analyze_work_items(self, items: List[Dict[str, Any]], reference_catalog: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluates line items of a work against GeM reference catalog.
        Returns explainable module evidence receipt and signal score (0-100).
        """
        if not items:
            return {
                "score": 0.0,
                "items_analyzed": 0,
                "avg_variance_pct": 0.0,
                "high_variance_items": 0,
                "evidence_table": [],
                "explanation": "No itemizable goods found in this work record."
            }

        evidence_table = []
        total_variance_weighted = 0.0
        total_expenditure = 0.0
        high_variance_count = 0

        for item in items:
            item_name = item.get("item_name", "")
            unit_price = float(item.get("unit_price", 0.0))
            quantity = float(item.get("quantity", 1.0))
            line_total = unit_price * quantity
            total_expenditure += line_total

            matched = self.match_item(item_name, reference_catalog)
            if matched and matched["match_confidence"] >= 60.0:
                ref_price = matched["gem_reference_price"]
                diff = unit_price - ref_price
                variance_pct = round(((unit_price - ref_price) / ref_price) * 100, 1) if ref_price > 0 else 0.0
                
                # Check tolerance
                is_high_variance = variance_pct > matched["tolerance_pct"]
                if is_high_variance:
                    high_variance_count += 1
                
                risk_badge = "High" if variance_pct > 30 else ("Moderate" if variance_pct > 15 else "Normal")
                
                evidence_table.append({
                    "item_name": item_name,
                    "reported_price": unit_price,
                    "gem_reference_price": ref_price,
                    "quantity": quantity,
                    "unit": matched["unit"],
                    "absolute_difference": round(diff, 2),
                    "variance_pct": variance_pct,
                    "match_confidence": matched["match_confidence"],
                    "risk_badge": risk_badge
                })
                
                if variance_pct > 0:
                    total_variance_weighted += variance_pct * (line_total)
            else:
                evidence_table.append({
                    "item_name": item_name,
                    "reported_price": unit_price,
                    "gem_reference_price": None,
                    "quantity": quantity,
                    "unit": item.get("unit", "Unit"),
                    "absolute_difference": 0.0,
                    "variance_pct": 0.0,
                    "match_confidence": 0.0,
                    "risk_badge": "Unmatched"
                })

        avg_variance = (total_variance_weighted / total_expenditure) if total_expenditure > 0 else 0.0
        
        # Calculate normalized score 0 - 100
        # If average variance is +50% or higher, score approaches 90-100
        raw_score = min(100.0, max(0.0, (avg_variance / 60.0) * 100.0))
        final_score = round(raw_score, 1)

        explanation = (
            f"{high_variance_count} item(s) exhibit price variances above GeM benchmark (+{avg_variance:.1f}% avg variance). "
            f"Requires review for local transport, specifications, or tax variations."
            if high_variance_count > 0 else
            "Item prices are aligned with GeM market reference rates within acceptable tolerance."
        )

        return {
            "score": final_score,
            "items_analyzed": len(evidence_table),
            "avg_variance_pct": round(avg_variance, 1),
            "high_variance_items": high_variance_count,
            "evidence_table": evidence_table,
            "explanation": explanation
        }

price_engine = PriceBenchmarkingEngine()
