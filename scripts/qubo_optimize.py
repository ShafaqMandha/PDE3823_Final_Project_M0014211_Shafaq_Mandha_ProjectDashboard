import json
import math
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


def _read_stdin_json() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        raise ValueError("Empty stdin")
    return json.loads(raw)


def _utc_now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def collision_probability_after(pc0: float, dv_total: float, scale: float) -> float:
    # Pc_after = pc0 * exp(-scale * dv_total)
    return float(pc0) * math.exp(-float(scale) * float(dv_total))


def make_variables_grid(axes: List[str], levels: List[float]) -> Tuple[List[str], Dict[str, float]]:
    var_names: List[str] = []
    var_to_dv: Dict[str, float] = {}
    for ax in axes:
        for i, lvl in enumerate(levels):
            name = f"dv_{ax}_{i}"
            var_names.append(name)
            var_to_dv[name] = float(lvl)
    return var_names, var_to_dv


def _axis_vars(var_names: List[str], axes: List[str]) -> Dict[str, List[str]]:
    return {ax: [v for v in var_names if v.startswith(f"dv_{ax}_")] for ax in axes}


def _add_onehot_exactly_one(bqm: Any, vars_for_axis: List[str], gamma: float) -> None:
    """
    Add penalty gamma*(sum(x_i) - 1)^2.
    For binary vars: (sum-1)^2 = 1 - sum(x_i) + 2*sum_{i<j} x_i x_j
    """
    bqm.offset += gamma
    for v in vars_for_axis:
        bqm.add_variable(v, bqm.linear.get(v, 0.0) - gamma)
    for i in range(len(vars_for_axis)):
        for j in range(i + 1, len(vars_for_axis)):
            bqm.add_quadratic(vars_for_axis[i], vars_for_axis[j], 2.0 * gamma)


def build_bqm_for_conjunction(
    pc0: float,
    axes: List[str],
    dv_levels: List[float],
    pc_reduction_scale: float,
    w_pc: float,
    w_dv: float,
) -> Tuple[Any, List[str], Dict[str, float]]:
    try:
        import dimod  # type: ignore
        from dimod import BinaryQuadraticModel  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Missing Python dependency: dimod. Install with: pip install dimod"
        ) from e

    var_names, var_to_dv = make_variables_grid(axes=axes, levels=dv_levels)
    axis_vars = _axis_vars(var_names, axes)

    bqm = BinaryQuadraticModel({}, {}, 0.0, vartype="BINARY")

    s = float(pc_reduction_scale)
    pc0f = float(pc0)

    # Linear terms: Δv cost + proxy for Pc reduction (monotone with dv)
    for v in var_names:
        dv = var_to_dv[v]
        # Encourage Δv (lower energy) when pc0 high, but trade off with fuel cost.
        # Use a bounded proxy: (1 - exp(-s*dv)) in [0,1).
        pc_proxy = w_pc * pc0f * (1.0 - math.exp(-s * dv))
        bqm.add_variable(v, w_dv * dv - pc_proxy)

    # Quadratic terms: reward combined Δv across axes (second-order)
    # Negative coefficient rewards selecting pairs in minimization.
    # Keep modest to avoid overpowering one-hot constraints.
    quad_scale = w_pc * pc0f * ((s ** 2) / 2.0)
    for i, vi in enumerate(var_names):
        dvi = var_to_dv[vi]
        for j in range(i + 1, len(var_names)):
            vj = var_names[j]
            dvj = var_to_dv[vj]
            coef = quad_scale * (dvi * dvj)
            if coef != 0.0:
                bqm.add_quadratic(vi, vj, -coef)

    # One-hot per axis (exactly one level, including the 0-level)
    max_dv = max(var_to_dv.values()) if var_to_dv else 0.0
    gamma = max(10.0, w_dv * max_dv * 50.0, w_pc * max(1e-12, pc0f) * 2.0)
    for ax in axes:
        _add_onehot_exactly_one(bqm, axis_vars[ax], gamma=gamma)

    return bqm, var_names, var_to_dv


@dataclass
class _Solution:
    sample: Dict[str, int]
    energy: float
    runtime_s: float


def _solve_exact(bqm: Any) -> _Solution:
    from dimod import ExactSolver  # type: ignore

    t0 = time.perf_counter()
    ss = ExactSolver().sample(bqm)
    t1 = time.perf_counter()
    first = ss.first
    return _Solution(sample=dict(first.sample), energy=float(first.energy), runtime_s=t1 - t0)


def _solve_sa(bqm: Any, num_reads: int) -> _Solution:
    from dimod import SimulatedAnnealingSampler  # type: ignore

    t0 = time.perf_counter()
    ss = SimulatedAnnealingSampler().sample(bqm, num_reads=int(num_reads))
    t1 = time.perf_counter()
    first = ss.first
    return _Solution(sample=dict(first.sample), energy=float(first.energy), runtime_s=t1 - t0)


def _solve_greedy_onehot(bqm: Any, var_names: List[str], axes: List[str]) -> _Solution:
    # Choose the best (lowest linear) per axis. Ignores quadratic terms but is always feasible wrt one-hot.
    t0 = time.perf_counter()
    axis_vars = _axis_vars(var_names, axes)
    sample = {v: 0 for v in var_names}
    for ax in axes:
        best_v = min(axis_vars[ax], key=lambda v: float(bqm.linear.get(v, 0.0)))
        sample[best_v] = 1
    e = float(bqm.energy(sample))
    t1 = time.perf_counter()
    return _Solution(sample=sample, energy=e, runtime_s=t1 - t0)


def _decode_dv_components(sample: Dict[str, int], var_to_dv: Dict[str, float], axes: List[str]) -> Dict[str, float]:
    out: Dict[str, float] = {ax: 0.0 for ax in axes}
    for v, x in sample.items():
        if not x:
            continue
        # v is dv_{ax}_{i}
        parts = v.split("_")
        if len(parts) >= 3:
            ax = parts[1]
            if ax in out:
                out[ax] += float(var_to_dv.get(v, 0.0))
    return out


def _pick_maneuver_type(dv_components: Dict[str, float]) -> str:
    # Map dominant axis to one of the UI enum values.
    # r -> Radial-Out, t -> Prograde, n -> Normal. (Sign is not modeled here.)
    ax = max(dv_components.keys(), key=lambda k: abs(dv_components[k]) if dv_components[k] is not None else 0.0)
    if ax == "r":
        return "Radial-Out"
    if ax == "n":
        return "Normal"
    return "Prograde"


def main() -> None:
    payload = _read_stdin_json()

    conj_id = str(payload.get("conjunctionId") or payload.get("id") or "")
    if not conj_id:
        raise ValueError("Payload must include 'conjunctionId'")

    # Accept either Pc0 or riskScore; clamp to [0,1] for dashboard usage.
    pc0 = payload.get("Pc0")
    if pc0 is None:
        pc0 = payload.get("riskScore")
    if pc0 is None:
        raise ValueError("Payload must include 'Pc0' or 'riskScore'")
    pc0f = _clamp01(float(pc0))

    axes = payload.get("axes") or ["r", "t", "n"]
    dv_levels = payload.get("dvLevels") or [0.0, 0.01, 0.03, 0.06]
    max_dv_allow = float(payload.get("maxDeltaV", 0.3))
    pc_reduction_scale = float(payload.get("pcReductionScale", 5.0))

    w_pc = float(payload.get("wPc", 1000.0))
    w_dv = float(payload.get("wDv", 50.0))

    # Solver config
    solver_name = str(payload.get("solver", "SA"))
    sa_reads = int(payload.get("saReads", 300))

    t0_all = time.perf_counter()
    bqm, var_names, var_to_dv = build_bqm_for_conjunction(
        pc0=pc0f,
        axes=list(axes),
        dv_levels=[float(x) for x in dv_levels],
        pc_reduction_scale=pc_reduction_scale,
        w_pc=w_pc,
        w_dv=w_dv,
    )

    # Solve
    if solver_name == "Exact":
        sol = _solve_exact(bqm)
        iterations = 1
    elif solver_name == "Greedy":
        sol = _solve_greedy_onehot(bqm, var_names=var_names, axes=list(axes))
        iterations = 1
    else:
        sol = _solve_sa(bqm, num_reads=sa_reads)
        iterations = sa_reads

    dv_components = _decode_dv_components(sol.sample, var_to_dv=var_to_dv, axes=list(axes))
    dv_total = float(sum(dv_components.values()))
    pc_after = float(collision_probability_after(pc0f, dv_total, scale=pc_reduction_scale))
    feasible = dv_total <= max_dv_allow + 1e-12

    # Convert into OptimizationResult (dashboard type)
    # Note: this dashboard's riskScore is 0..1; we return Pc_after as "newRiskScore".
    risk_reduction_pct = 0.0
    if pc0f > 0:
        risk_reduction_pct = (pc0f - pc_after) / pc0f * 100.0

    compute_time_ms = (time.perf_counter() - t0_all) * 1000.0

    best_maneuver = None
    message = "Optimization completed successfully" if feasible else "Best solution exceeds maxDeltaV constraint"
    success = True

    if feasible:
        maneuver_type = _pick_maneuver_type(dv_components)
        burn_duration_s = max(1.0, dv_total * 50.0)
        fuel_cost_pct = max(0.0, min(100.0, dv_total * 10.0))
        best_maneuver = {
            "id": f"man-{conj_id}",
            "type": maneuver_type,
            "deltaV": dv_total,
            "burnDuration": burn_duration_s,
            "executionTime": _utc_now_iso(),
            "newMissDistance": float(payload.get("missDistance", 0.0)) + dv_total * 1000.0,
            "newRiskScore": pc_after,
            "riskReduction": risk_reduction_pct,
            "fuelCost": fuel_cost_pct,
            "confidence": 0.85,
        }

    result = {
        "success": success,
        "conjunctionId": conj_id,
        "originalRiskScore": pc0f,
        "bestManeuver": best_maneuver,
        "alternativeManeuvers": [],
        "quboEnergy": float(sol.energy),
        "solverIterations": int(iterations),
        "computeTime": float(compute_time_ms),
        "message": message,
        "timestamp": _utc_now_iso(),
        "debug": {
            "solver": solver_name,
            "dvComponents": dv_components,
            "dvLevels": dv_levels,
            "axes": axes,
            "pcReductionScale": pc_reduction_scale,
            "maxDeltaV": max_dv_allow,
            "Pc_after": pc_after,
            "feasible": feasible,
        },
    }

    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()

