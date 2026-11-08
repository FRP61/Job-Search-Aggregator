"""Cost-of-living baseline shipped with the app, so a fresh database has an index
for every country without network access. `python -m app.cli refresh-col` replaces
it with the latest Eurostat release.

Downloaded from Eurostat on 2026-10-31:

* price level index: dataset ``prc_ppp_ind``, na_item=PLI_EU27_2020, ppp_cat=A01
  (actual individual consumption), EU27 = 100;
* net earnings: dataset ``earn_nt_net``, currency=EUR, estruct=NET,
  ecase=P1_NCH_AW100 (single person, no children, earning the average wage).
"""

BASELINE_YEAR = 2024
EUROSTAT_SOURCE = "Eurostat prc_ppp_ind (PLI_EU27_2020, A01) + earn_nt_net (P1_NCH_AW100)"

# EU27 average annual net earnings, EUR: the reference point of the index
EU_NET_EARNINGS_EUR = 28776.80

# ISO country code -> (price level index, annual net earnings in EUR)
BASELINE: dict[str, tuple[float, float]] = {
    "AT": (119.7, 41158.94),
    "BE": (118.7, 36110.94),
    "BG": (56.9, 12759.75),
    "HR": (73.3, 15198.41),
    "CY": (95.1, 27582.72),
    "CZ": (80.2, 19335.30),
    "DK": (142.8, 43926.65),
    "EE": (96.5, 21462.22),
    "FI": (127.2, 36607.40),
    "FR": (107.9, 31784.30),
    "DE": (109.1, 35482.87),
    "GR": (83.0, 20041.56),
    "HU": (68.3, 14194.47),
    "IE": (141.2, 44867.66),
    "IT": (98.1, 26593.36),
    "LV": (77.2, 17278.15),
    "LT": (78.2, 17617.72),
    "LU": (150.7, 53618.61),
    "MT": (93.1, 24768.44),
    "NL": (121.0, 38838.45),
    "PL": (70.2, 17339.93),
    "PT": (85.0, 20098.79),
    "RO": (57.4, 12773.90),
    "SK": (81.1, 16998.78),
    "SI": (91.0, 22236.80),
    "ES": (90.7, 26351.05),
    "SE": (123.0, 36106.31),
}
