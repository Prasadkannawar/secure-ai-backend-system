"""
ContentIntelligenceEngine — custom multi-task NLP pipeline.

Combines two open-source transformer models:
  1. distilbert-base-uncased-finetuned-sst-2-english  →  binary sentiment (POSITIVE / NEGATIVE)
  2. j-hartmann/emotion-english-distilroberta-base     →  7-class emotion (anger, disgust, fear,
                                                           joy, neutral, sadness, surprise)

Custom output layer: content health score (0-100), risk level, and actionable business insights.

Industry use cases this engine addresses:
  - Customer service: route angry/fearful tickets to senior agents automatically
  - Content moderation: flag critical-health content before publishing
  - E-commerce: batch-score product reviews for quality dashboards
  - HR analytics: measure employee sentiment across survey responses
  - Brand monitoring: track emotional tone of brand mentions over time
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

EMOTION_LABELS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

RISK_COLORS = {
    "LOW":      "#10b981",   # emerald
    "MEDIUM":   "#f59e0b",   # amber
    "HIGH":     "#f97316",   # orange
    "CRITICAL": "#ef4444",   # red
}


class ContentIntelligenceEngine:
    """Singleton multi-model NLP engine."""

    def __init__(self):
        self._sentiment = None
        self._emotion = None

    # ── Lifecycle ────────────────────────────────────────────────────────────

    def load(self):
        from transformers import pipeline
        logger.info("Loading sentiment model (DistilBERT)…")
        self._sentiment = pipeline(
            "text-classification",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1,
        )
        logger.info("Loading emotion model (DistilRoBERTa)…")
        self._emotion = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=-1,
        )
        logger.info("ContentIntelligenceEngine ready.")

    @property
    def is_ready(self) -> bool:
        return self._sentiment is not None and self._emotion is not None

    # ── Public analysis methods ───────────────────────────────────────────────

    def analyze_sentiment(self, text: str) -> dict[str, Any]:
        raw = self._sentiment(text[:512])[0]
        return {
            "label": raw["label"],             # POSITIVE | NEGATIVE
            "score": round(float(raw["score"]), 4),
        }

    def analyze_emotion(self, text: str) -> dict[str, Any]:
        raw = self._emotion(text[:512])[0]
        emotions = {r["label"]: round(float(r["score"]), 4) for r in raw}
        primary = max(emotions, key=emotions.get)
        return {
            "primary_emotion": primary,
            "emotions": emotions,
        }

    def analyze_full(self, text: str) -> dict[str, Any]:
        sentiment = self.analyze_sentiment(text)
        emotion   = self.analyze_emotion(text)
        em        = emotion["emotions"]

        # ── Custom health score formula ──────────────────────────────────────
        # Negative drivers: anger (35%), disgust (25%), fear (15%), sadness (10%)
        # Positive drivers: joy (30%), surprise bonus (10%)
        # Sentiment modifier: 40% weight
        negative_load = (
            em.get("anger", 0)   * 0.35 +
            em.get("disgust", 0) * 0.25 +
            em.get("fear", 0)    * 0.15 +
            em.get("sadness", 0) * 0.10
        )
        positive_load = (
            em.get("joy", 0)      * 0.30 +
            em.get("surprise", 0) * 0.10
        )
        sentiment_factor = (
            sentiment["score"] if sentiment["label"] == "POSITIVE"
            else 1.0 - sentiment["score"]
        )
        health_score = round(max(0.0, min(100.0, (
            sentiment_factor  * 0.40 +
            positive_load     * 0.30 +
            (1 - negative_load) * 0.30
        ) * 100)), 1)

        # ── Risk level ───────────────────────────────────────────────────────
        if health_score >= 75:
            risk_level = "LOW"
        elif health_score >= 50:
            risk_level = "MEDIUM"
        elif health_score >= 25:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        return {
            "sentiment":    sentiment,
            "emotion":      emotion,
            "health_score": health_score,
            "risk_level":   risk_level,
            "risk_color":   RISK_COLORS[risk_level],
            "insights":     self._insights(sentiment, em, health_score),
        }

    def analyze_batch(self, texts: list[str]) -> list[dict[str, Any]]:
        return [
            {
                "index":        i,
                "text_preview": t[:100] + ("…" if len(t) > 100 else ""),
                **self.analyze_full(t),
            }
            for i, t in enumerate(texts)
        ]

    # ── Private ──────────────────────────────────────────────────────────────

    def _insights(self, sentiment: dict, em: dict, health: float) -> list[str]:
        out = []
        if em.get("anger", 0) > 0.40:
            out.append("High anger signal — escalate to a senior support agent immediately.")
        if em.get("disgust", 0) > 0.35:
            out.append("Disgust detected — investigate product or service quality issues.")
        if em.get("fear", 0) > 0.35:
            out.append("Anxiety or fear present — provide clear reassurance and next steps.")
        if em.get("sadness", 0) > 0.40:
            out.append("Sadness detected — respond with empathy and proactive support.")
        if em.get("joy", 0) > 0.55:
            out.append("Strong positive emotion — great candidate for testimonial or case study.")
        if sentiment["label"] == "NEGATIVE" and sentiment["score"] > 0.92:
            out.append("Very high-confidence negative sentiment — flag for immediate review.")
        if health < 25:
            out.append("Critical content health — do not publish without moderation approval.")
        if not out:
            if sentiment["label"] == "POSITIVE":
                out.append("Positive content — safe to publish and suitable for promotional use.")
            else:
                out.append("Neutral or mixed content — standard review recommended.")
        return out


engine = ContentIntelligenceEngine()
