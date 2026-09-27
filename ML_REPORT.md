# 📊 Taap Chetna — Audited Supervised Heat-Health Modeling Report

## 1. Audit Background & Target Leakage Correction

During architectural review of the initial modeling pipeline, a critical data leakage vulnerability was identified in the derivation of the `state_baseline_deaths` feature:
- **Previous Vulnerable Implementation**: Code computed `state_baseline_map = train_df.groupby("state")["heatstroke_deaths"].mean()` over the entire training set (2001–2010) and broadcasted it back to all training observations. Consequently, for any observation $(s, t)$ in the training set, its own target value $\text{deaths}_{s, t}$ contributed to its feature value.
- **Corrected Solution (Strict Expanding Temporal Prior)**:
  For every state-year observation $(s, t)$, `state_baseline_deaths` is strictly computed using only mortality information recorded prior to that year ($y < t$):
  - **2001**: Set to `0.0` (zero prior historical observations exist in the 2001–2014 series).
  - **2002**: Mean of 2001 mortality for state $s$.
  - **2003**: Mean of 2001–2002 mortality for state $s$.
  - **2011–2012 (Validation)**: Uses strictly 2001–2010 (and 2001–2011) historical records.
  - **2013–2014 (Test)**: Uses strictly 2001–2012 (and 2001–2013) historical records.
  - **Zero target leakage, zero self-contribution, zero future information.**

---

## 2. Controlled Experiment: Model A vs Model B

To rigorously evaluate whether target-derived state baselines are scientifically justified versus pure atmospheric and demographic features, two distinct XGBoost architectures were trained on identical chronological splits:

- **Model A (No Target Encoding)**: 22 features comprising pure environmental telemetry (temperature, heat index, humidity, wind, solar radiation, precipitation, heatwave days) and demographic exposure (population, density). Zero target-derived features.
- **Model B (Temporally Valid Baseline)**: 23 features comprising the identical 22 environmental/demographic features plus the strictly temporally valid prior `state_baseline_deaths`.
- **Baseline**: Scikit-Learn Decision Tree Regressor (`max_depth=4`, `min_samples_leaf=4`).

### Chronological Split:
- **Train Set**: 2001 – 2010 (10 years, 240 observations, 71.4%)
- **Validation Set**: 2011 – 2012 (2 years, 48 observations, 14.3%)
- **Held-Out Test Set**: 2013 – 2014 (2 years, 48 observations, 14.3%) — evaluated strictly once.

---

## 3. Comprehensive Performance Comparison Table

| Model Architecture | Features Evaluated | Split Evaluated | MAE | RMSE | R² |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Decision Tree Baseline** | Environmental + Demographic (22) | Validation (2011-2012) | **21.62** | **38.34** | **0.5341** |
| **Decision Tree Baseline** | Environmental + Demographic (22) | Test (2013-2014) | **32.78** | **67.02** | **0.3573** |
| **XGBoost Model A** | Environmental + Demographic only (22) | Validation (2011-2012) | **22.04** | **34.94** | **0.6129** |
| **XGBoost Model A** | Environmental + Demographic only (22) | Test (2013-2014) | **28.88** | **65.38** | **0.3885** |
| **XGBoost Model B** | Temporal Baseline + Env + Demo (23) | Validation (2011-2012) | **20.62** | **30.13** | **0.7123** |
| **XGBoost Model B** | Temporal Baseline + Env + Demo (23) | Test (2013-2014) | **25.10** | **61.33** | **0.4618** |

### Comparative Delta Analysis (Model B vs Model A):
- **Validation Set (2011–2012)**:
  - MAE: **20.62** vs **22.04** (Delta: -1.42 deaths)
  - RMSE: **30.13** vs **34.94** (Delta: -4.81 deaths)
  - R²: **0.7123** vs **0.6129** (Delta: +0.0994)
- **Held-Out Test Set (2013–2014)**:
  - MAE: **25.1** vs **28.88** (Delta: -3.78 deaths)
  - RMSE: **61.33** vs **65.38** (Delta: -4.05 deaths)
  - R²: **0.4618** vs **0.3885** (Delta: +0.0733)

**Scientific Conclusion on Feature Sets**:
Model B demonstrates superior generalization across both validation and held-out test splits. Including the temporally valid prior baseline accounts for unobserved state-level structural heterogeneity (such as geographical terrain, housing construction materials, and regional administrative reporting customs) without inducing data leakage. Both models are preserved as standalone serialized artifacts for reproducibility.

---

## 4. Rigorous Interpretation of Held-Out Test Set R² (~0.46)

> [!IMPORTANT]
> **A held-out test $R^2$ of approximately 0.46 on 48 observations does NOT indicate a highly accurate or precision clinical prediction instrument.**

In biometeorological epidemiology on small macro datasets (336 total state-year rows), this metric must be interpreted transparently:
1. **Severe Target Asymmetry & Extreme Outliers**: Recorded annual state heatstroke mortalities range from `0` (e.g. Meghalaya, Kerala) to `418` (e.g. Andhra Pradesh 2013). A few extreme heatwave years produce massive variance that disproportionately inflates squared-error penalties.
2. **Administrative Reporting Heterogeneity**: Historical NCRB Accidental Deaths and Suicides in India (ADSI) records reflect significant inter-state and inter-annual reporting variations, diagnostic discrepancies between heat exhaustion and heatstroke, and municipal classification differences.
3. **Macro Directional Utility**: An $R^2 pprox 0.46$ demonstrates that the non-linear interaction between prolonged thermal streaks, peak summer heat index, population exposure, and prior baseline explains roughly 46% of the variance across unseen future years. It is valuable as a **macro-level prioritization signal** for municipal cooling centers, water tanker deployments, and emergency hospital staffing, but possesses wide prediction uncertainty intervals.

---

## 5. Audit of Feature Definitions

### A. `heatwave_days`
- **Exact Operational Calculation**: Annual count of days where the daily statewide average maximum temperature $T_{\text{max}} \ge 40.0^\circ\text{C}$ OR the observation falls within an extended multi-day thermal stress streak (streak $\ge 3$ consecutive days where $T_{\text{max}} \ge 40^\circ\text{C}$ or $\text{Heat Index} \ge 40^\circ\text{C}$).
- **Meteorological Context**: The Indian Meteorological Department (IMD) defines heatwaves based on station-level daily maximum temperature departures of $\ge 4.5^\circ\text{C}$ above 30-year climatological normals for $\ge 2$ consecutive days in plains. Because satellite reanalysis spatial grids lack 30-year station-specific daily normal tables, `heatwave_days` serves as a documented operational proxy for prolonged compound heat-stress exposure.

### B. `heat_index_c` (NOAA / Rothfusz Equation)
- **Mathematical Basis**: 9-term polynomial approximation of Steadman's (1979) human biometeorological steady-state model in Celsius.
- **Operating Bounds**: Valid for ambient temperatures $T \ge 25.0^\circ\text{C}$ and Relative Humidity between 0% and 100%. Defaults to ambient temperature below $25^\circ\text{C}$. Capped at $75.0^\circ\text{C}$ to prevent polynomial divergence.
- **Non-Medical Boundary**: The Heat Index is strictly an atmospheric weather exposure index. It does NOT predict individual clinical outcomes or deterministic medical prognoses.

### C. Population Features (`population_millions`, `population_density_per_sq_km`)
- **Estimation Methodology**: Intercensal and postcensal exponential growth approximations $P(t) = P(0) \cdot e^{r \cdot t}$ anchored to the 2001 and 2011 Decennial Censuses of India.
- **Documentation**: These figures serve strictly as demographic exposure proxy normalizers for macro epidemiology; they are NOT official annual administrative census counts.

---

## 6. Feature Importance Comparison

### Model B: Temporally Valid Baseline (Primary)
| Rank | Feature Name | Importance Score |
| :---: | :--- | :---: |
| 1 | `state_baseline_deaths` | 0.2484 |
| 2 | `heatwave_days` | 0.0930 |
| 3 | `max_consecutive_hot_days` | 0.0589 |
| 4 | `population_millions` | 0.0553 |
| 5 | `extreme_hi_days_52` | 0.0510 |
| 6 | `annual_precip_mm` | 0.0447 |
| 7 | `annual_tmax_max` | 0.0433 |
| 8 | `summer_tmax_mean` | 0.0416 |
| 9 | `annual_tmax_mean` | 0.0415 |
| 10 | `summer_hi_max` | 0.0340 |

### Model A: No Target Encoding (Pure Environmental + Demographic)
| Rank | Feature Name | Importance Score |
| :---: | :--- | :---: |
| 1 | `heatwave_days` | 0.1836 |
| 2 | `population_millions` | 0.1009 |
| 3 | `extreme_hi_days_52` | 0.0716 |
| 4 | `summer_low_wind_high_rh_days` | 0.0658 |
| 5 | `summer_hi_mean` | 0.0616 |
| 6 | `annual_tmax_p90` | 0.0598 |
| 7 | `annual_tmax_max` | 0.0522 |
| 8 | `extreme_temp_days_40` | 0.0415 |
| 9 | `summer_tmax_max` | 0.0379 |
| 10 | `summer_tmax_p90` | 0.0378 |

---

## 7. Sample Test Set Predictions (2013–2014)

| State | Year | Actual Deaths | DT Baseline | Model A Pred | Model B Pred | Model B Residual |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Andhra Pradesh | 2013 | 418 | 62.5 | 73.2 | 84.6 | -333.4 |
| Andhra Pradesh | 2014 | 372 | 199.5 | 124.9 | 139.6 | -232.4 |
| Arunachal Pradesh | 2013 | 0 | 1.0 | 5.8 | 6.1 | +6.1 |
| Arunachal Pradesh | 2014 | 0 | 1.0 | 5.8 | 6.1 | +6.1 |
| Assam | 2013 | 5 | 6.1 | 11.4 | 9.5 | +4.5 |
| Assam | 2014 | 0 | 6.1 | 17.3 | 12.0 | +12.0 |
| Bihar | 2013 | 85 | 62.5 | 52.4 | 82.3 | -2.7 |
| Bihar | 2014 | 131 | 62.5 | 77.1 | 91.0 | -40.0 |
| Chhattisgarh | 2013 | 3 | 30.0 | 25.2 | 22.2 | +19.2 |
| Chhattisgarh | 2014 | 4 | 30.0 | 26.4 | 20.0 | +16.0 |
| Delhi | 2013 | 2 | 30.0 | 21.7 | 25.4 | +23.4 |
| Delhi | 2014 | 9 | 30.0 | 31.9 | 28.4 | +19.4 |
| Gujarat | 2013 | 26 | 30.0 | 40.3 | 38.5 | +12.5 |
| Gujarat | 2014 | 45 | 30.0 | 40.4 | 49.1 | +4.1 |
| Haryana | 2013 | 82 | 30.0 | 45.6 | 32.1 | -49.9 |
| Haryana | 2014 | 79 | 30.0 | 65.0 | 43.8 | -35.2 |

---

## 8. Ethical & Operational Safety Boundaries

1. **NO Individual Medical Outcome Prediction**: This model CANNOT predict whether any specific individual will suffer heat exhaustion, heatstroke, or death. It models aggregate, macro-level state-year epidemiological burdens.
2. **NO Causal Attribution**: Observational correlation between satellite surface telemetry and administrative records does NOT establish biophysical causality. Confounders such as healthcare access, air conditioning penetration, and behavioral adaptation are unobserved.
3. **Decision-Support Scope**: The output is designed solely to provide disaster response commissioners (NDMA/SDMA) with comparative seasonal heat burden bands (`LOW`, `MODERATE`, `ELEVATED`, `CRITICAL`) to guide proactive civic cooling interventions.
