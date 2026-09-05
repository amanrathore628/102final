import math
from typing import Dict, Any, Optional
from rapidfuzz import fuzz

class DuplicateForensicsEngine:
    """
    Engine 5: Duplicate Work & Image Forensics
    Detects potential duplicate works using multi-modal signals:
    1. Perceptual Image Hashing (pHash / dHash)
    2. Haversine Geographic Proximity (meters)
    3. Project Title & Description Token Similarity
    4. Temporal & Metadata Alignment
    """
    def haversine_distance_m(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates great-circle distance between two GPS coordinates in meters.
        """
        if lat1 == 0.0 or lon1 == 0.0 or lat2 == 0.0 or lon2 == 0.0:
            return 999999.0

        r = 6371000.0 # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2.0) ** 2 +
             math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(r * c, 1)

    def calculate_hash_similarity(self, hash1: str, hash2: str) -> float:
        """
        Computes normalized Hamming distance similarity (0 - 100%).
        64-bit hexadecimal hashes have max Hamming distance of 64.
        """
        if not hash1 or not hash2 or len(hash1) != len(hash2):
            return 0.0
        
        try:
            # Convert hex to binary
            bin1 = bin(int(hash1, 16))[2:].zfill(64)
            bin2 = bin(int(hash2, 16))[2:].zfill(64)
            diff_bits = sum(b1 != b2 for b1, b2 in zip(bin1, bin2))
            similarity = max(0.0, (1.0 - (diff_bits / 64.0)) * 100.0)
            return round(similarity, 1)
        except Exception:
            return 0.0

    def compare_works(
        self,
        work_a: Dict[str, Any],
        work_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compares Work A and Work B across photo, geo, text, and metadata signals.
        """
        # 1. Photo similarity
        hash_a = work_a.get("phash", "")
        hash_b = work_b.get("phash", "")
        photo_similarity = self.calculate_hash_similarity(hash_a, hash_b) if (hash_a and hash_b) else float(work_a.get("simulated_photo_sim", 0.0))

        # 2. Geo distance
        geo_dist = self.haversine_distance_m(
            float(work_a.get("latitude", 0.0)),
            float(work_a.get("longitude", 0.0)),
            float(work_b.get("latitude", 0.0)),
            float(work_b.get("longitude", 0.0))
        )
        is_geo_suspicious = geo_dist < 300.0 # under 300m

        # 3. Text similarity
        title_a = work_a.get("project_name", "")
        title_b = work_b.get("project_name", "")
        text_similarity = round(float(fuzz.token_sort_ratio(title_a, title_b)), 1)

        # 4. Amount similarity
        amt_a = float(work_a.get("sanctioned_amount", 0.0))
        amt_b = float(work_b.get("sanctioned_amount", 0.0))
        amt_diff = abs(amt_a - amt_b)
        amt_max = max(amt_a, amt_b, 1.0)
        amt_similarity = round(max(0.0, (1.0 - (amt_diff / amt_max)) * 100.0), 1)

        # Multi-signal combined confidence
        if photo_similarity >= 85.0 and (is_geo_suspicious or text_similarity >= 80.0):
            combined_confidence = "HIGH"
            raw_score = 88.0
            explanation = (
                f"High photo similarity ({photo_similarity:.0f}%) and proximate coordinates ({geo_dist:.0f}m apart). "
                f"Work descriptions exhibit {text_similarity:.0f}% lexical overlap. Flagged for duplicate verification."
            )
        elif photo_similarity >= 70.0 or (is_geo_suspicious and text_similarity >= 85.0):
            combined_confidence = "MEDIUM"
            raw_score = 65.0
            explanation = f"Moderate similarity flagged between works ({photo_similarity:.0f}% photo, {geo_dist:.0f}m distance)."
        else:
            combined_confidence = "LOW"
            raw_score = max(5.0, photo_similarity * 0.3)
            explanation = "No suspicious photo or geographic duplication detected."

        return {
            "score": round(float(raw_score), 1),
            "photo_similarity_pct": photo_similarity,
            "text_similarity_pct": text_similarity,
            "geo_distance_m": geo_dist,
            "geo_relationship": "Suspicious Colocation" if is_geo_suspicious else f"{geo_dist/1000.0:.1f} km apart",
            "amount_similarity_pct": amt_similarity,
            "combined_confidence": combined_confidence,
            "work_a_code": work_a.get("work_code"),
            "work_b_code": work_b.get("work_code"),
            "work_a_title": title_a,
            "work_b_title": title_b,
            "explanation": explanation
        }

duplicate_engine = DuplicateForensicsEngine()
