"""Simulation engine for buffer assignment and main conveyor picking.

Provides multiple assignment strategies (fifo, greedy, hybrid), picking logic,
and KPI calculations. Deterministic behavior is ensured via a local RNG seeded
by the provided seed.
"""

from __future__ import annotations

from random import Random
from typing import Dict, List, Optional, Tuple

from utils import COLORS, DISTRIBUTION, get_band, generate_vehicles

# Lanes explicitly marked unavailable (e.g., maintenance)
UNAVAILABLE_LANES: set[str] = set()


def mark_buffer_unavailable(buffer_name: str) -> None:
    """Mark a buffer lane as unavailable for assignment."""
    UNAVAILABLE_LANES.add(buffer_name)


def mark_buffer_available(buffer_name: str) -> None:
    """Mark a buffer lane as available for assignment."""
    UNAVAILABLE_LANES.discard(buffer_name)


# Constants
BUFFER_CAPS: Dict[str, int] = {
    "L1": 14,
    "L2": 14,
    "L3": 14,
    "L4": 14,
    "L5": 16,
    "L6": 16,
    "L7": 16,
    "L8": 16,
    "L9": 16,
}

MAIN_PICK_TIME: int = 30  # seconds per pick (for JPH calculation)


def init_buffers() -> Dict[str, List[Dict[str, object]]]:
    """Return initial buffers dict mapping lane to list of vehicles (empty)."""

    return {lane: [] for lane in BUFFER_CAPS.keys()}


def _is_available(lane: str, buffers: Dict[str, List[Dict[str, object]]]) -> bool:
    return len(buffers[lane]) < BUFFER_CAPS[lane]


def _tail_color(lane: str, buffers: Dict[str, List[Dict[str, object]]]) -> Optional[str]:
    buf = buffers[lane]
    return buf[-1]["color"] if buf else None


def _score_buffer(
    lane: str,
    vehicle_color: str,
    buffers: Dict[str, List[Dict[str, object]]],
    oven: str,
) -> int:
    same_tail = 1 if _tail_color(lane, buffers) == vehicle_color else 0
    tail_band_same = 0
    if _tail_color(lane, buffers) is not None:
        tail_band_same = 1 if get_band(_tail_color(lane, buffers)) == get_band(vehicle_color) else 0
    capacity_left = BUFFER_CAPS[lane] - len(buffers[lane])
    oven_penalty = -30 if (oven == "O1" and lane in {"L5", "L6", "L7", "L8", "L9"}) else 0
    return 50 * same_tail + 20 * tail_band_same + capacity_left + oven_penalty


def assign_buffer_hybrid(
    vehicle: Dict[str, object],
    buffers: Dict[str, List[Dict[str, object]]],
    oven: str = "O1",
) -> Tuple[Optional[str], bool]:
    """Assign a vehicle to a buffer using hybrid rules.

    Rules:
      1) If any available buffer has tail color equal to vehicle color, prefer it.
      2) If vehicle color is 'rare', choose the emptiest available buffer.
      3) Otherwise compute score per available buffer and pick max.
      4) If none available, return (None, False).

    Returns:
      (selected_lane_name or None, oven_penalty_applied_bool)
    """

    color = str(vehicle["color"])  # type: ignore[index]

    available_lanes = [lane for lane in buffers if _is_available(lane, buffers)]
    if not available_lanes:
        return None, False

    # 1) Prefer tail color match
    tail_match_lanes = [lane for lane in available_lanes if _tail_color(lane, buffers) == color]
    if tail_match_lanes:
        chosen = tail_match_lanes[0]
        penalty = bool(oven == "O1" and chosen in {"L5", "L6", "L7", "L8", "L9"})
        return chosen, penalty

    # 2) Rare -> emptiest
    if get_band(color) == "rare":
        chosen = max(available_lanes, key=lambda ln: BUFFER_CAPS[ln] - len(buffers[ln]))
        penalty = bool(oven == "O1" and chosen in {"L5", "L6", "L7", "L8", "L9"})
        return chosen, penalty

    # 3) Score-based selection
    best_lane = None
    best_score = None
    for lane in available_lanes:
        score = _score_buffer(lane, color, buffers, oven)
        if best_score is None or score > best_score:
            best_score = score
            best_lane = lane
    if best_lane is None:
        return None, False

    penalty = bool(oven == "O1" and best_lane in {"L5", "L6", "L7", "L8", "L9"})
    return best_lane, penalty


def _assign_fifo(vehicle: Dict[str, object], buffers: Dict[str, List[Dict[str, object]]], oven: str) -> Tuple[Optional[str], bool]:
    for lane in BUFFER_CAPS:
        if _is_available(lane, buffers):
            penalty = bool(oven == "O1" and lane in {"L5", "L6", "L7", "L8", "L9"})
            return lane, penalty
    return None, False


def _assign_greedy(vehicle: Dict[str, object], buffers: Dict[str, List[Dict[str, object]]], oven: str) -> Tuple[Optional[str], bool]:
    color = str(vehicle["color"])  # type: ignore[index]
    available_lanes = [lane for lane in BUFFER_CAPS if _is_available(lane, buffers)]
    if not available_lanes:
        return None, False
    tail_match_lanes = [lane for lane in available_lanes if _tail_color(lane, buffers) == color]
    chosen = tail_match_lanes[0] if tail_match_lanes else available_lanes[0]
    penalty = bool(oven == "O1" and chosen in {"L5", "L6", "L7", "L8", "L9"})
    return chosen, penalty


def pick_from_buffers(buffers: Dict[str, List[Dict[str, object]]]) -> Tuple[Optional[Dict[str, object]], Optional[str]]:
    """Pop car from the buffer whose front color has most support; break ties by longest buffer.

    Returns (vehicle_dict or None, lane_name or None).
    """

    # Gather fronts
    fronts: List[Tuple[str, str]] = []  # (lane, color)
    for lane, buf in buffers.items():
        if buf:
            fronts.append((lane, buf[0]["color"]))
    if not fronts:
        return None, None

    # Count support per color
    support: Dict[str, int] = {}
    for _, c in fronts:
        support[c] = support.get(c, 0) + 1
    # Pick color with max support
    target_color = max(support.items(), key=lambda kv: kv[1])[0]

    # Among lanes with that front color, choose longest buffer
    candidate_lanes = [lane for lane, c in fronts if c == target_color]
    chosen_lane = max(candidate_lanes, key=lambda ln: len(buffers[ln]))

    vehicle = buffers[chosen_lane].pop(0)
    return vehicle, chosen_lane


def rebalance_buffers(buffers: Dict[str, List[Dict[str, object]]], threshold: float = 0.8) -> int:
    """Move vehicles from overloaded lanes to underfilled lanes to smooth load.

    If any lane has fill_ratio > threshold and some lane has fill_ratio < 0.5,
    iteratively move a single vehicle from the tail of the most loaded lane to
    the tail of the emptiest lane. Returns the number of moves performed.
    """

    def fill_ratio(lane: str) -> float:
        cap = BUFFER_CAPS[lane]
        return (len(buffers[lane]) / cap) if cap else 0.0

    moves = 0
    while True:
        overloaded = [ln for ln in BUFFER_CAPS if len(buffers[ln]) > 0 and fill_ratio(ln) > threshold]
        underfilled = [ln for ln in BUFFER_CAPS if len(buffers[ln]) < BUFFER_CAPS[ln] and fill_ratio(ln) < 0.5]
        if not overloaded or not underfilled:
            break

        src = max(overloaded, key=lambda ln: fill_ratio(ln))
        dst = min(underfilled, key=lambda ln: fill_ratio(ln))
        if src == dst:
            break

        if len(buffers[dst]) >= BUFFER_CAPS[dst]:
            underfilled = [ln for ln in underfilled if ln != dst]
            if not underfilled:
                break
            dst = min(underfilled, key=lambda ln: fill_ratio(ln))

        vehicle = buffers[src].pop()
        buffers[dst].append(vehicle)
        moves += 1

    return moves


def run_simulation(
    strategy: str = "hybrid",
    total_vehicles: int = 200,
    seed: int = 42,
    simulate_breakdown: Optional[Tuple[str, int]] = None,
):
    """Run the simulation with the specified strategy.

    Args:
        strategy: 'fifo', 'greedy', or 'hybrid'.
        total_vehicles: number of vehicles to generate.
        seed: random seed for determinism.
        simulate_breakdown: optional tuple ('Lx', step_at_assignment) to make a buffer unavailable after N assignments.

    Returns:
        Dict with KPIs, final buffers state, and painted sequence.
    """

    rng = Random(seed)

    # Setup
    buffers = init_buffers()
    vehicles = generate_vehicles(total=total_vehicles, seed=seed)

    total_input = len(vehicles)
    total_assigned = 0
    overflows_count = 0
    o1_to_l5_l9_count = 0
    breakdown_lane: Optional[str] = None
    breakdown_at: Optional[int] = None
    reroute_count = 0
    assignments_done = 0
    rebalance_moves = 0

    if simulate_breakdown:
        breakdown_lane, breakdown_at = simulate_breakdown

    # Helper to check if lane is currently available considering breakdown
    def lane_available_considering_breakdown(lane: str) -> bool:
        if lane in UNAVAILABLE_LANES:
            return False
        if breakdown_lane and breakdown_at is not None and assignments_done >= breakdown_at and lane == breakdown_lane:
            return False
        return _is_available(lane, buffers)

    # Oven choice: 50/50 O1 vs O2 per vehicle; O2 should prefer L5-L9 when assigning
    def choose_oven() -> str:
        return "O1" if rng.random() < 0.5 else "O2"

    # Dispatcher per strategy
    def assign(vehicle: Dict[str, object]) -> Tuple[Optional[str], bool]:
        nonlocal reroute_count
        oven = choose_oven()
        vehicle["oven"] = oven

        # If O2, prefer L5-L9 by attempting there first when possible
        lanes_order: List[str]
        if oven == "O2":
            lanes_order = ["L5", "L6", "L7", "L8", "L9", "L1", "L2", "L3", "L4"]
        else:
            lanes_order = list(BUFFER_CAPS.keys())

        # Wrapper to temporarily mask unavailable lanes (capacity/breakdown)
        masked_buffers = {ln: buffers[ln] for ln in BUFFER_CAPS if lane_available_considering_breakdown(ln)}

        if strategy == "fifo":
            for ln in lanes_order:
                if ln in masked_buffers and _is_available(ln, buffers):
                    penalty = bool(oven == "O1" and ln in {"L5", "L6", "L7", "L8", "L9"})
                    return ln, penalty
            return None, False

        if strategy == "greedy":
            color = str(vehicle["color"])  # type: ignore[index]
            tail_matches = [ln for ln in lanes_order if ln in masked_buffers and _tail_color(ln, buffers) == color]
            if tail_matches:
                ln = tail_matches[0]
                penalty = bool(oven == "O1" and ln in {"L5", "L6", "L7", "L8", "L9"})
                return ln, penalty
            for ln in lanes_order:
                if ln in masked_buffers and _is_available(ln, buffers):
                    penalty = bool(oven == "O1" and ln in {"L5", "L6", "L7", "L8", "L9"})
                    return ln, penalty
            return None, False

        # hybrid
        selected, penalty = assign_buffer_hybrid(vehicle, masked_buffers, oven=oven)
        return selected, penalty

    # Assignment phase (oven outputs)
    for v in vehicles:
        selected_lane, penalty = assign(v)

        # Breakdown handling: if selection landed on broken lane, count reroute and treat as overflow/skip
        if selected_lane is not None and breakdown_lane and breakdown_at is not None and assignments_done >= breakdown_at and selected_lane == breakdown_lane:
            reroute_count += 1
            selected_lane = None

        if selected_lane is None:
            overflows_count += 1
        else:
            buffers[selected_lane].append(v)
            total_assigned += 1
            if penalty:
                o1_to_l5_l9_count += 1

        assignments_done += 1

        # Periodic rebalancing every 30 assignments
        if assignments_done > 0 and assignments_done % 30 == 0:
            rebalance_moves += rebalance_buffers(buffers, threshold=0.8)

    # Picking phase: sequential until all buffers empty
    painted_sequence: List[Dict[str, object]] = []
    last_color: Optional[str] = None
    changeovers = 0
    while any(buffers[lane] for lane in buffers):
        vehicle, lane = pick_from_buffers(buffers)
        if vehicle is None:
            break
        painted_sequence.append(vehicle)
        current_color = vehicle["color"]  # type: ignore[index]
        if last_color is not None and current_color != last_color:
            changeovers += 1
        last_color = current_color

    total_picked = len(painted_sequence)

    # JPH estimate
    simulated_main_time_sec = MAIN_PICK_TIME * total_picked
    simulated_main_time_hours = simulated_main_time_sec / 3600.0
    estimated_JPH = (total_picked / simulated_main_time_hours) if simulated_main_time_hours > 0 else 0.0

    return {
        "inputs": {
            "strategy": strategy,
            "total_vehicles": total_vehicles,
            "seed": seed,
            "simulate_breakdown": simulate_breakdown,
        },
        "kpis": {
            "total_input": total_input,
            "total_assigned": total_assigned,
            "total_picked": total_picked,
            "overflows_count": overflows_count,
            "changeovers": changeovers,
            "o1_to_l5_l9_count": o1_to_l5_l9_count,
            "reroute_count": reroute_count,
            "breakdown_reroutes": reroute_count,
            "rebalance_moves": rebalance_moves,
            "estimated_JPH": estimated_JPH,
        },
        "buffers": buffers,
        "painted_sequence": painted_sequence,
    }


__all__ = [
    "BUFFER_CAPS",
    "MAIN_PICK_TIME",
    "init_buffers",
    "assign_buffer_hybrid",
    "pick_from_buffers",
    "run_simulation",
]
if __name__ == "__main__":
    from simulation import run_simulation
    result = run_simulation(strategy="hybrid", total_vehicles=50, seed=1)
    print("KPIs:", result["kpis"])

