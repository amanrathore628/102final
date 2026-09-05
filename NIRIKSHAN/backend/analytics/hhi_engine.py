from typing import List, Dict, Any

class VendorHHIEngine:
    """
    Engine 4: Vendor Concentration (Herfindahl-Hirschman Index - HHI)
    Measures vendor market share concentration per district / category.
    HHI = sum(s_i ^ 2) where s_i is market share percentage (0-100).
    """
    def calculate_hhi(self, vendor_expenditures: Dict[str, float], target_vendor_name: str = "") -> Dict[str, Any]:
        if not vendor_expenditures:
            return {
                "score": 10.0,
                "hhi_score": 500,
                "concentration_level": "COMPETITIVE MARKET",
                "vendor_shares": [],
                "target_vendor_share": 0.0,
                "explanation": "Diversified vendor allocation across the district."
            }

        total_exp = sum(vendor_expenditures.values())
        if total_exp <= 0:
            total_exp = 1.0

        vendor_shares = []
        hhi = 0.0
        target_share = 0.0

        # Sort descending by expenditure
        sorted_vendors = sorted(vendor_expenditures.items(), key=lambda x: x[1], reverse=True)

        for name, amount in sorted_vendors:
            share_pct = (amount / total_exp) * 100.0
            hhi += (share_pct ** 2)
            if name == target_vendor_name:
                target_share = share_pct
            
            vendor_shares.append({
                "vendor_name": name,
                "expenditure": round(amount, 2),
                "share_pct": round(share_pct, 1)
            })

        hhi_rounded = round(hhi, 0)

        # Standard HHI classification
        if hhi_rounded > 2500:
            concentration_level = "HIGH VENDOR CONCENTRATION - INCREASED RISK"
            # Normalize 2500-10000 into score 65-100
            raw_score = 65.0 + min(35.0, ((hhi_rounded - 2500) / 5000.0) * 35.0)
            top_vendor = vendor_shares[0]["vendor_name"] if vendor_shares else "Dominant Vendor"
            top_share = vendor_shares[0]["share_pct"] if vendor_shares else 0.0
            explanation = (
                f"District exhibits high vendor concentration (HHI: {int(hhi_rounded)}). "
                f"Top contractor '{top_vendor}' commands {top_share:.1f}% of total sanctioned expenditure."
            )
        elif hhi_rounded > 1500:
            concentration_level = "MODERATE CONCENTRATION"
            raw_score = 40.0 + ((hhi_rounded - 1500) / 1000.0) * 25.0
            explanation = f"Moderate vendor concentration (HHI: {int(hhi_rounded)}). Monitored for potential single-source trends."
        else:
            concentration_level = "HEALTHY COMPETITIVE DISTRIBUTION"
            raw_score = max(5.0, (hhi_rounded / 1500.0) * 35.0)
            explanation = f"Expenditure is broadly distributed across multiple contractors (HHI: {int(hhi_rounded)})."

        return {
            "score": round(float(raw_score), 1),
            "hhi_score": int(hhi_rounded),
            "concentration_level": concentration_level,
            "vendor_shares": vendor_shares[:10], # Top 10 for inspectability
            "target_vendor_share": round(target_share, 1),
            "explanation": explanation
        }

hhi_engine = VendorHHIEngine()
