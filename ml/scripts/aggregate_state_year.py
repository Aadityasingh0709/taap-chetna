"""
ml/scripts/aggregate_state_year.py
Aggregates state-day environmental observations (2001-2014) into state-year features
and joins with historical heatstroke mortality labels without future leakage.
"""

import os
import sys
import logging
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.utils.population_data import get_state_population_and_density

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

DAILY_CSV = os.path.join(BASE_DIR, 'ml', 'data', 'environmental_daily_2001_2014.csv')
MORTALITY_CSV = os.path.join(BASE_DIR, 'heatstroke_mortality_state_year_2001_2014.csv')
OUTPUT_DATA_CSV = os.path.join(BASE_DIR, 'ml', 'data', 'state_year_heat_health_training_dataset.csv')
ROOT_OUTPUT_CSV = os.path.join(BASE_DIR, 'state_year_heat_health_training_dataset.csv')


def build_state_year_features() -> pd.DataFrame:
    """
    Constructs the state-year training dataset.
    Aggregates daily telemetry strictly within each year (Jan 1 to Dec 31).
    Summer is defined as March 1 to June 30 (Day of Year ~60 to 181, months 3 to 6).
    """
    logger.info(f"Reading daily environmental observations from {DAILY_CSV}...")
    if not os.path.exists(DAILY_CSV):
        raise FileNotFoundError(f"Missing {DAILY_CSV}. Run download_environment_2001_2014.py first.")
        
    df_daily = pd.read_csv(DAILY_CSV)
    df_daily['date'] = pd.to_datetime(df_daily['date'])
    df_daily['year'] = df_daily['date'].dt.year
    df_daily['month'] = df_daily['date'].dt.month
    
    # Check mortality file
    if not os.path.exists(MORTALITY_CSV):
        raise FileNotFoundError(f"Missing {MORTALITY_CSV}.")
    df_mort = pd.read_csv(MORTALITY_CSV)
    logger.info(f"Loaded mortality dataset with {len(df_mort)} records across {df_mort['state'].nunique()} states.")
    
    # First: Aggregate daily grid points per state-day to get state-wide daily average
    daily_state_agg = df_daily.groupby(['state', 'date', 'year', 'month']).agg({
        'tmax_c': 'mean',
        'relative_humidity_pct': 'mean',
        'wind_speed_mps': 'mean',
        'solar_radiation_kwh_m2_day': 'mean',
        'precipitation_mm_day': 'mean',
        'heat_index_c': 'mean',
        'heat_band': 'max',
        'heat_streak': 'max',
    }).reset_index()
    
    records = []
    
    # Group by state and year
    grouped = daily_state_agg.groupby(['state', 'year'])
    for (state, year), group in grouped:
        # Full year slices
        annual_tmax = group['tmax_c']
        annual_hi = group['heat_index_c']
        annual_precip = group['precipitation_mm_day'].sum()
        
        # Summer slice (March, April, May, June)
        summer = group[group['month'].isin([3, 4, 5, 6])]
        if len(summer) == 0:
            summer = group
            
        summer_tmax = summer['tmax_c']
        summer_hi = summer['heat_index_c']
        summer_rh = summer['relative_humidity_pct']
        summer_ws = summer['wind_speed_mps']
        summer_solar = summer['solar_radiation_kwh_m2_day']
        
        # Extreme temperature day counts
        days_tmax_ge_40 = int((annual_tmax >= 40.0).sum())
        days_tmax_ge_42 = int((annual_tmax >= 42.0).sum())
        days_tmax_ge_45 = int((annual_tmax >= 45.0).sum())
        
        # Heat stress index counts
        days_hi_ge_44 = int((annual_hi >= 44.0).sum())
        days_hi_ge_52 = int((annual_hi >= 52.0).sum())
        
        # Heat streak / heatwave metrics
        max_heat_streak = int(group['heat_streak'].max())
        # Operational heatwave metric: days with Tmax >= 40.0°C OR days part of an extended
        # multi-day thermal stress streak (>= 3 consecutive days of Tmax >= 40°C or Heat Index >= 40°C).
        # Note: This is an operational biometeorological threshold proxy; regional IMD synoptic definitions
        # require departures >= 4.5°C from 30-year station normals which are not present in spatial grids.
        heatwave_days = int(((group['tmax_c'] >= 40.0) | (group['heat_streak'] >= 3)).sum())
        
        # Stifling weather: low wind (< 2.0 m/s) with high humidity (> 60%) in summer
        stifling_days = int(((summer_ws < 2.0) & (summer_rh > 60.0)).sum())
        
        # Historical population & density (intercensal exponential estimates anchored to 2001 & 2011 Censuses)
        pop_m, density = get_state_population_and_density(state, year)
        
        rec = {
            'state': state,
            'year': int(year),
            'annual_tmax_mean': round(float(annual_tmax.mean()), 2),
            'annual_tmax_max': round(float(annual_tmax.max()), 2),
            'annual_tmax_p90': round(float(np.percentile(annual_tmax, 90)), 2),
            'summer_tmax_mean': round(float(summer_tmax.mean()), 2),
            'summer_tmax_max': round(float(summer_tmax.max()), 2),
            'summer_tmax_p90': round(float(np.percentile(summer_tmax, 90)), 2),
            'summer_hi_mean': round(float(summer_hi.mean()), 2),
            'summer_hi_max': round(float(summer_hi.max()), 2),
            'extreme_temp_days_40': days_tmax_ge_40,
            'extreme_temp_days_42': days_tmax_ge_42,
            'extreme_temp_days_45': days_tmax_ge_45,
            'extreme_hi_days_44': days_hi_ge_44,
            'extreme_hi_days_52': days_hi_ge_52,
            'max_consecutive_hot_days': max_heat_streak,
            'heatwave_days': heatwave_days,
            'summer_rh_mean': round(float(summer_rh.mean()), 2),
            'summer_low_wind_high_rh_days': stifling_days,
            'summer_solar_radiation_mean': round(float(summer_solar.mean()), 2),
            'summer_solar_radiation_max': round(float(summer_solar.max()), 2),
            'annual_precip_mm': round(float(annual_precip), 1),
            'population_millions': pop_m,
            'population_density_per_sq_km': density,
        }
        records.append(rec)
        
    df_features = pd.DataFrame(records)
    logger.info(f"Engineered features shape: {df_features.shape}")
    
    # Merge with mortality ground truth
    df_final = pd.merge(df_features, df_mort, on=['state', 'year'], how='inner')
    
    # Compute temporally valid state_baseline_deaths (STRICT expanding prior window: year < current_year)
    # 2001 -> 0.0 (no prior historical records exist)
    # 2002 -> mean of 2001
    # 2003 -> mean of 2001-2002, etc.
    # An observation's own target NEVER contributes to its baseline. Zero future leakage.
    logger.info("Computing strictly temporally valid state baseline mortality...")
    temporal_baselines = []
    for _, row in df_final.iterrows():
        st = row['state']
        yr = row['year']
        prior_deaths = df_mort[(df_mort['state'] == st) & (df_mort['year'] < yr)]['heatstroke_deaths']
        if len(prior_deaths) > 0:
            temporal_baselines.append(round(float(prior_deaths.mean()), 2))
        else:
            temporal_baselines.append(0.0)
            
    df_final['state_baseline_deaths'] = temporal_baselines
    logger.info(f"Merged training dataset shape with temporal baseline: {df_final.shape}")
    
    # Validation checks
    assert len(df_final) == 336, f"Expected 336 rows, found {len(df_final)}"
    assert not df_final.isnull().any().any(), "Found unexpected null values in dataset!"
    assert (df_final['heatstroke_deaths'] >= 0).all(), "Negative deaths found!"
    assert df_final['year'].min() == 2001 and df_final['year'].max() == 2014, "Year range mismatch!"
    
    # Save both in ml/data/ and project root
    os.makedirs(os.path.dirname(OUTPUT_DATA_CSV), exist_ok=True)
    df_final.to_csv(OUTPUT_DATA_CSV, index=False)
    df_final.to_csv(ROOT_OUTPUT_CSV, index=False)
    logger.info(f"Successfully saved training table to {OUTPUT_DATA_CSV} and {ROOT_OUTPUT_CSV}")
    
    return df_final


if __name__ == '__main__':
    build_state_year_features()
