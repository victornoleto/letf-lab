"""Lei 14.754/2023 (Brasil) — DARF anual sobre ganhos realizados.

Port do `studies/letf_rotation_hunt/tax_layer.py`. Mantém a lógica
``annual_realize`` (que é o modo das estratégias swing/T1+):

- 15% de DARF sobre o ganho realizado no ano
- Prejuízo carrega adiante indefinidamente
- Imposto pago apenas no último pregão de cada ano-calendário

A entrada é a equity curve bruta (que já vem do engine compondo
``(1 + retornos).cumprod()`` a partir de 1.0). A saída é a equity
curve líquida com a mesma indexação temporal.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

DARF_RATE = 0.15


def apply_annual_darf(
    gross_equity: pd.Series,
    returns: pd.Series,
    initial: float | None = None,
) -> pd.Series:
    """Aplica DARF anual (Lei 14.754) sobre uma equity curve bruta.

    ``gross_equity.iloc[0]`` é o valor APÓS o retorno do primeiro pregão,
    não o capital inicial. ``initial`` é inferido a partir de ``returns``
    se não passado: ``initial = gross_equity[0] / (1 + returns[0])``.
    """
    if initial is None:
        if returns is None or len(returns) == 0:
            raise ValueError("Não dá pra inferir initial sem returns")
        initial = float(gross_equity.iloc[0]) / (1.0 + float(returns.iloc[0]))
    return _apply_annual_darf(gross_equity, initial)


def _apply_annual_darf(gross_equity: pd.Series, initial: float) -> pd.Series:
    """15% DARF sobre ganho anual; perda acumula como carry-forward.

    Dentro do ano, a equity líquida é a equity bruta rebaseada para o
    anchor líquido do final do ano anterior (preserva compounding diário).
    No último bar do ano-calendário, o imposto é descontado.
    """
    net_equity = gross_equity.copy().astype(float)
    carry_forward_loss = 0.0

    gross_arr = gross_equity.values.astype(float)
    years = np.array(gross_equity.index.year)
    unique_years = sorted(set(years))

    for year in unique_years:
        year_idx = np.where(years == year)[0]
        if len(year_idx) == 0:
            continue
        start_idx = year_idx[0]
        end_idx = year_idx[-1]

        if start_idx == 0:
            start_net = initial
            gross_base = initial
        else:
            start_net = float(net_equity.iloc[start_idx - 1])
            gross_base = gross_arr[start_idx - 1]

        if gross_base > 0:
            ratios = gross_arr[start_idx:end_idx + 1] / gross_base
            net_equity.iloc[start_idx:end_idx + 1] = start_net * ratios

        end_net_pretax = float(net_equity.iloc[end_idx])
        gain = end_net_pretax - start_net
        taxable_gain = gain - carry_forward_loss
        if taxable_gain > 0:
            tax = DARF_RATE * taxable_gain
            carry_forward_loss = 0.0
        else:
            tax = 0.0
            carry_forward_loss = -taxable_gain

        net_equity.iloc[end_idx] = end_net_pretax - tax

    return net_equity


def net_returns_from_curve(net_equity: pd.Series) -> pd.Series:
    """Retornos diários derivados da equity líquida (incluindo o ‘furo’ de
    DARF no último dia do ano)."""
    return net_equity.pct_change().fillna(0.0)
