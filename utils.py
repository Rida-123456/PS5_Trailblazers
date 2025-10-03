"""Utility functions and constants for vehicle color sampling.

This module provides color constants, a band-mapping helper, and a
deterministic vehicle generator for quick demos.
"""

from random import Random
from typing import Dict, List

# Public constants
COLORS: List[str] = [
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
    "C9",
    "C10",
    "C11",
    "C12",
]

DISTRIBUTION: List[float] = [
    0.40,
    0.25,
    0.12,
    0.08,
    0.03,
    0.02,
    0.02,
    0.02,
    0.02,
    0.02,
    0.02,
    0.01,
]


def get_band(color: str) -> str:
    """Return the rarity band for a given color: 'high', 'medium', or 'rare'."""

    if color in {"C1", "C2"}:
        return "high"
    if color in {"C3", "C4", "C5", "C6"}:
        return "medium"
    return "rare"


def generate_vehicles(total: int = 200, seed: int = 42) -> List[Dict[str, object]]:
    """Generate a list of vehicles with colors sampled by DISTRIBUTION.

    Args:
        total: Number of vehicles to create (default 200).
        seed: Seed for deterministic sampling and shuffling (default 42).

    Returns:
        A list of dicts like {'id': int, 'color': str, 'oven': None}.
    """

    rng = Random(seed)
    sampled_colors = rng.choices(COLORS, weights=DISTRIBUTION, k=total)
    rng.shuffle(sampled_colors)

    vehicles: List[Dict[str, object]] = [
        {"id": i + 1, "color": color, "oven": None}
        for i, color in enumerate(sampled_colors)
    ]

    return vehicles


__all__ = [
    "COLORS",
    "DISTRIBUTION",
    "get_band",
    "generate_vehicles",
]


