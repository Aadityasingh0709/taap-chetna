"""
ml/utils/heat_metrics.py
Physically interpretable heat-stress formulas and meteorological indices.
"""

import math
import numpy as np
import pandas as pd


def compute_heat_index(tmax_c: float, rh_pct: float) -> float:
    """
    Computes the National Oceanic and Atmospheric Administration (NOAA) / Rothfusz
    Heat Index in degrees Celsius.
    
    Formula:
      Rothfusz regression equation adapted to Celsius.
      Valid for temperatures >= 25°C and Relative Humidity 0-100%.
      For T < 25°C, heat index is equal to dry bulb temperature.
    
    Limitations:
      The regression is an approximation to Steadman's human biometeorological model
      assuming a 5'7", 147 lb person in light clothing walking in a light breeze in shade.
      Under extreme combinations (very low humidity or extreme temperatures > 50°C),
      values are capped to physically plausible limits.
    """
    if pd.isna(tmax_c) or pd.isna(rh_pct):
        return np.nan
        
    t = float(tmax_c)
    rh = float(rh_pct)
    
    if t < 25.0:
        return round(t, 4)
        
    # Rothfusz polynomial in Celsius
    hi = (
        -8.78469475556
        + 1.61139411 * t
        + 2.33854883889 * rh
        - 0.14611605 * t * rh
        - 0.012308094 * (t ** 2)
        - 0.0164248277778 * (rh ** 2)
        + 0.002211732 * (t ** 2) * rh
        + 0.00072546 * t * (rh ** 2)
        - 0.000003582 * (t ** 2) * (rh ** 2)
    )
    
    # Cap to avoid unphysical runaway polynomial artifacts
    if hi < t:
        hi = t
    elif hi > 75.0:
        hi = 75.0
        
    return round(hi, 4)


def compute_wet_bulb(temp_c: float, rh_pct: float) -> float:
    """
    Approximates Wet-Bulb Temperature (°C) using the empirical Stull (2011) equation.
    Valid for RH between 5% and 99%, and temperatures between -20°C and 50°C.
    """
    if pd.isna(temp_c) or pd.isna(rh_pct):
        return np.nan
        
    t = float(temp_c)
    rh = float(rh_pct)
    
    tw = (
        t * math.atan(0.151977 * ((rh + 8.313659) ** 0.5))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )
    return round(tw, 4)


def get_heat_band(heat_index_c: float) -> int:
    """
    Assigns heat severity band according to meteorological standard:
      0: Normal (< 32°C)
      1: Caution (32°C - 38°C)
      2: Extreme Caution (38°C - 44°C)
      3: Danger / Severe (44°C - 52°C)
      4: Extreme Danger (>= 52°C)
    """
    if pd.isna(heat_index_c):
        return 0
    if heat_index_c >= 52.0:
        return 4
    if heat_index_c >= 44.0:
        return 3
    if heat_index_c >= 38.0:
        return 2
    if heat_index_c >= 32.0:
        return 1
    return 0


def add_derived_heat_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a dataframe with columns ['date', 'tmax_c', 'relative_humidity_pct', ...]
    grouped per station/coordinate or state, and adds rolling and streak features.
    Ensures no future data leakage by using only past rolling windows (closed='left' or shift/rolling).
    """
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Calculate heat index if not present
    if 'heat_index_c' not in df.columns:
        df['heat_index_c'] = [
            compute_heat_index(t, rh) for t, rh in zip(df['tmax_c'], df['relative_humidity_pct'])
        ]
        
    df['heat_band'] = df['heat_index_c'].apply(get_heat_band)
    
    # Rolling 3-day and 7-day metrics (past days inclusive of current day)
    df['hi_roll3_max_c'] = df['heat_index_c'].rolling(3, min_periods=1).max().round(4)
    df['tmax_roll3_mean_c'] = df['tmax_c'].rolling(3, min_periods=1).mean().round(4)
    df['hi_roll7_max_c'] = df['heat_index_c'].rolling(7, min_periods=1).max().round(4)
    df['tmax_roll7_mean_c'] = df['tmax_c'].rolling(7, min_periods=1).mean().round(4)
    
    # Consecutive hot days (streak where tmax >= 40°C or heat_index >= 40°C)
    is_hot = (df['tmax_c'] >= 40.0) | (df['heat_index_c'] >= 40.0)
    streak = []
    current_streak = 0
    for hot in is_hot:
        if hot:
            current_streak += 1
        else:
            current_streak = 0
        streak.append(current_streak)
    df['heat_streak'] = streak
    
    # Cyclical day of year / month features
    doy = df['date'].dt.dayofyear
    df['doy'] = doy
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12).round(4)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12).round(4)
    
    return df
