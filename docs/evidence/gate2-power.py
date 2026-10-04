# mtg-table — gate 2's minimum detectable effect (D372), written before J051 reads.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
#
#   python3 docs/evidence/gate2-power.py
#
# Gate 2 (D354) scores d_i = truth(eval's pick) - truth(hand's pick) per decision
# and passes when the mean of d is above 0 with its 95% paired-bootstrap interval
# above 0, on >= 240 scored decisions (of 300).  The minimum detectable effect at
# 80% power is, in the normal approximation the percentile bootstrap follows,
#
#     MDE = (z_0.975 + z_0.80) * sd(d) / sqrt(n)
#
# and sd(d) comes from three things:
#   a        the share of decisions where the two rankers pick the same option:
#            d = 0 exactly there (the same truth number is subtracted from itself);
#   s_true   the spread of the TRUE win-rate gap between the two picks where they
#            differ (unknown before J051: a range);
#   s_noise  the truth table's noise on that gap: two options' win rates over m
#            common-random-number rounds, sqrt(2 * p(1-p) * (1 - rho) / m) at
#            p = 0.5.  m = 200 when both picks stay in the race; an option the race
#            retires stops at 40-200 rounds (D354: initial 40, every 20).
#
#     var(d) = (1 - a) * (s_true^2 + s_noise^2) + a * (1 - a) * mu_dis^2
#
# (mu_dis, the mean gap where the picks differ, is the effect itself over (1 - a);
# it is small and adds little.)  Nothing here reads a result: J050's truth and
# J051's ranks were not available when this was written.

import math

Z = 1.959964 + 0.841621   # two-sided 95% + 80% power


def s_noise(m1: int, m2: int, rho: float) -> float:
    # each option's rate over its own rounds; CRN correlation over the shared ones
    v = 0.25 / m1 + 0.25 / m2 - 2 * rho * 0.25 / max(m1, m2)
    return math.sqrt(max(v, 0.0))


def mde(n: int, a: float, s_true: float, sn: float) -> float:
    d = Z * math.sqrt((1 - a) * (s_true ** 2 + sn ** 2) / n)
    for _ in range(20):   # fixed point: var grows a little with the effect itself
        mu_dis = d / (1 - a)
        d = Z * math.sqrt(((1 - a) * (s_true ** 2 + sn ** 2) + a * (1 - a) * mu_dis ** 2) / n)
    return d


def main() -> None:
    noise = {"both picks to 200 rounds, rho 0": s_noise(200, 200, 0.0),
             "both to 200, CRN rho 0.3": s_noise(200, 200, 0.3),
             "one pick retired at 40": s_noise(200, 40, 0.0)}
    print("truth noise on a picks' gap (s_noise):")
    for k, v in noise.items():
        print(f"  {k:34s} {v:.4f}")
    print()
    print("MDE (win-rate points per decision) at 80% power, two-sided 95%:")
    print(f"{'n':>4} {'agree a':>8} {'s_true':>7} {'s_noise':>8} {'MDE':>7}")
    for n in (240, 300):
        for a in (0.5, 0.7):
            for st in (0.03, 0.06, 0.10):
                for sn in (noise["both picks to 200 rounds, rho 0"], noise["one pick retired at 40"]):
                    print(f"{n:4d} {a:8.1f} {st:7.2f} {sn:8.3f} {100 * mde(n, a, st, sn):6.2f}")
    print()
    central = mde(240, 0.5, 0.06, noise["both picks to 200 rounds, rho 0"])
    print(f"central case (n 240, agree 0.5, s_true 0.06, s_noise 0.050): MDE {100 * central:.2f} points")
    print(f"truth noise alone (s_true 0, worst noise, n 240, agree 0.5): "
          f"{100 * mde(240, 0.5, 0.0, noise['one pick retired at 40']):.2f} points")
    print(f"if the set is too small: n needed for MDE 1.0 point at the worst case above "
          f"(agree 0.5, s_true 0.10, s_noise {noise['one pick retired at 40']:.3f}): "
          f"{math.ceil(240 * (mde(240, 0.5, 0.10, noise['one pick retired at 40']) / 0.01) ** 2)}")


if __name__ == "__main__":
    main()
