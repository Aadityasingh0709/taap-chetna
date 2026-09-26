"""
ml/scripts/download_environment_2001_2014.py
Downloads daily historical environmental telemetry (2001-2014) from NASA POWER
for the spatial grid matching all 24 Indian states in the mortality series.
Features robust caching, retries, resume capability, and schema alignment.
"""

import os
import sys
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Optional

import requests
import pandas as pd
import numpy as np

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ml.utils.heat_metrics import add_derived_heat_features
from ml.utils.geo_utils import StateBoundaryMatcher, STATE_CENTROID_POINTS, export_state_name_mapping

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(BASE_DIR, 'ml', 'cache', 'nasa_power')
DATA_DIR = os.path.join(BASE_DIR, 'ml', 'data')
OUTPUT_CSV = os.path.join(DATA_DIR, 'environmental_daily_2001_2014.csv')

START_DATE = '20010101'
END_DATE = '20141231'
EXPECTED_DAYS = 5113  # 14 years: 2001-2014 (including leap years 2004, 2008, 2012)

# Parameters requested from NASA POWER RE daily point endpoint:
# T2M_MAX: Daily max 2-meter air temperature (°C)
# RH2M: Relative humidity at 2m (%)
# WS10M: Wind speed at 10m (m/s)
# ALLSKY_SFC_SW_DWN: All Sky Insolation Incident on a Horizontal Surface (kWh/m^2/day)
# PRECTOTCORR: Precipitation Corrected (mm/day)
NASA_POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'
PARAMETERS = 'T2M_MAX,RH2M,WS10M,ALLSKY_SFC_SW_DWN,PRECTOTCORR'

MORTALITY_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Meghalaya', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]


def get_representative_grid_points() -> List[Tuple[float, float, str]]:
    """
    Selects representative grid points from the project's original 355-point grid
    to cover all 24 states in the mortality series.
    """
    matcher = StateBoundaryMatcher()
    orig_csv = os.path.join(BASE_DIR, 'environmental_training_dataset_2021_2025.csv')
    
    if os.path.exists(orig_csv):
        logger.info(f"Loading grid coordinates from {orig_csv}...")
        coords = pd.read_csv(orig_csv, usecols=['latitude', 'longitude']).drop_duplicates()
    else:
        logger.warning(f"Original dataset not found at {orig_csv}. Using centroid definitions.")
        coords = pd.DataFrame(
            [{'latitude': lat, 'longitude': lon} for lat, lon in STATE_CENTROID_POINTS.values()]
        )
        
    state_grid: Dict[str, List[Tuple[float, float]]] = {}
    for _, row in coords.iterrows():
        lat, lon = float(row['latitude']), float(row['longitude'])
        st = matcher.find_state(lat, lon)
        if st:
            state_grid.setdefault(st, []).append((lat, lon))
            
    # Explicitly ensure Delhi gets its representative point
    state_grid['Delhi'] = [(28.5, 77.5)]
    
    selected_points: List[Tuple[float, float, str]] = []
    for st in MORTALITY_STATES:
        pts = state_grid.get(st, [])
        c_lat, c_lon = STATE_CENTROID_POINTS.get(st, (20.0, 78.0))
        if not pts:
            pts = [(round(c_lat * 2) / 2, round(c_lon * 2) / 2)]
            
        pts_sorted = sorted(pts, key=lambda p: (p[0] - c_lat) ** 2 + (p[1] - c_lon) ** 2)
        count = 2 if len(pts) >= 10 else 1
        for p in pts_sorted[:count]:
            selected_points.append((p[0], p[1], st))
            
    logger.info(f"Selected {len(selected_points)} grid points across {len(MORTALITY_STATES)} states.")
    return selected_points


def fetch_point_with_cache(
    lat: float, lon: float, state: str, max_retries: int = 3
) -> Optional[Dict]:
    """
    Fetches daily data from NASA POWER for (lat, lon) with persistent JSON caching and retry logic.
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_file = os.path.join(CACHE_DIR, f"nasa_power_{lat:.4f}_{lon:.4f}_{START_DATE}_{END_DATE}.json")
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            tmax_dict = data.get('properties', {}).get('parameter', {}).get('T2M_MAX', {})
            if len(tmax_dict) == EXPECTED_DAYS:
                logger.info(f"Loaded cached data for ({lat:.2f}, {lon:.2f}) [{state}] ({len(tmax_dict)} days)")
                return data
        except Exception as e:
            logger.warning(f"Error reading cache for ({lat}, {lon}): {e}. Re-fetching.")

    params = {
        'parameters': PARAMETERS,
        'community': 'RE',
        'longitude': f"{lon:.4f}",
        'latitude': f"{lat:.4f}",
        'start': START_DATE,
        'end': END_DATE,
        'format': 'JSON'
    }
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Fetching ({lat:.2f}, {lon:.2f}) [{state}] attempt {attempt}/{max_retries}...")
            resp = requests.get(NASA_POWER_URL, params=params, timeout=40)
            if resp.status_code == 200:
                data = resp.json()
                tmax_dict = data.get('properties', {}).get('parameter', {}).get('T2M_MAX', {})
                if len(tmax_dict) == EXPECTED_DAYS:
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f)
                    logger.info(f"Successfully downloaded & cached ({lat:.2f}, {lon:.2f}) [{state}].")
                    return data
                else:
                    logger.warning(f"Incomplete record count ({len(tmax_dict)} / {EXPECTED_DAYS}) for ({lat}, {lon}). Retrying...")
            elif resp.status_code in [429, 500, 502, 503, 504]:
                wait_s = attempt * 3
                logger.warning(f"HTTP {resp.status_code} for ({lat}, {lon}). Backing off for {wait_s}s...")
                time.sleep(wait_s)
            else:
                logger.error(f"HTTP {resp.status_code} client error for ({lat}, {lon}): {resp.text[:200]}")
                break
        except requests.RequestException as re:
            wait_s = attempt * 3
            logger.warning(f"Network error on ({lat}, {lon}) (attempt {attempt}): {re}. Retrying in {wait_s}s...")
            time.sleep(wait_s)
            
    logger.error(f"Failed to fetch data for ({lat}, {lon}) [{state}] after {max_retries} attempts.")
    return None


def parse_nasa_power_records(json_data: Dict, lat: float, lon: float, state: str) -> pd.DataFrame:
    """
    Parses raw NASA POWER daily JSON structure into a clean DataFrame.
    Filters out NASA missing value sentinels (-999).
    """
    params = json_data['properties']['parameter']
    tmax_series = params.get('T2M_MAX', {})
    rh_series = params.get('RH2M', {})
    ws_series = params.get('WS10M', {})
    solar_series = params.get('ALLSKY_SFC_SW_DWN', {})
    precip_series = params.get('PRECTOTCORR', {})
    
    records = []
    for date_str in sorted(tmax_series.keys()):
        # Date string is YYYYMMDD
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        tmax = tmax_series.get(date_str)
        rh = rh_series.get(date_str)
        ws = ws_series.get(date_str)
        solar = solar_series.get(date_str)
        precip = precip_series.get(date_str, 0.0)
        
        # Replace NASA missing flags (-999.0) with NaN
        tmax = np.nan if (tmax is None or tmax <= -900) else float(tmax)
        rh = np.nan if (rh is None or rh <= -900) else float(rh)
        ws = np.nan if (ws is None or ws <= -900) else float(ws)
        solar = np.nan if (solar is None or solar <= -900) else float(solar)
        precip = 0.0 if (precip is None or precip <= -900) else float(precip)
        
        records.append({
            'date': formatted_date,
            'latitude': lat,
            'longitude': lon,
            'state': state,
            'tmax_c': tmax,
            'relative_humidity_pct': rh,
            'wind_speed_mps': ws,
            'solar_radiation_kwh_m2_day': solar,
            'precipitation_mm_day': precip,
        })
        
    df = pd.DataFrame(records)
    # Forward fill then backward fill any isolated sensor dropouts (never invent data)
    for col in ['tmax_c', 'relative_humidity_pct', 'wind_speed_mps', 'solar_radiation_kwh_m2_day']:
        if df[col].isnull().any():
            df[col] = df[col].ffill().bfill()
            
    # Add heat index and rolling features
    df = add_derived_heat_features(df)
    return df


def download_and_build_2001_2014_dataset(max_workers: int = 3) -> pd.DataFrame:
    """
    Main orchestration function to download, process, and compile the full 2001-2014 dataset.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    export_state_name_mapping()
    
    grid_points = get_representative_grid_points()
    all_dfs: List[pd.DataFrame] = []
    failed_points: List[Tuple[float, float, str]] = []
    
    logger.info(f"Starting concurrent download for {len(grid_points)} grid points (workers={max_workers})...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_point = {
            executor.submit(fetch_point_with_cache, lat, lon, state): (lat, lon, state)
            for lat, lon, state in grid_points
        }
        for future in as_completed(future_to_point):
            lat, lon, state = future_to_point[future]
            try:
                data = future.result()
                if data:
                    df_point = parse_nasa_power_records(data, lat, lon, state)
                    all_dfs.append(df_point)
                else:
                    failed_points.append((lat, lon, state))
            except Exception as e:
                logger.error(f"Exception processing point ({lat}, {lon}) [{state}]: {e}")
                failed_points.append((lat, lon, state))
                
    if failed_points:
        logger.warning(f"Encountered {len(failed_points)} failed points: {failed_points}")
        
    if not all_dfs:
        raise RuntimeError("No environmental data could be downloaded or retrieved from cache!")
        
    full_df = pd.concat(all_dfs, ignore_index=True)
    full_df = full_df.sort_values(['state', 'date', 'latitude', 'longitude']).reset_index(drop=True)
    
    logger.info(f"Compiled dataset shape: {full_df.shape}")
    logger.info(f"Unique states: {full_df['state'].nunique()} / {len(MORTALITY_STATES)}")
    logger.info(f"Date range: {full_df['date'].min()} to {full_df['date'].max()}")
    
    # Save to CSV
    full_df.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"Saved complete 2001-2014 environmental dataset to {OUTPUT_CSV}")
    return full_df


if __name__ == '__main__':
    download_and_build_2001_2014_dataset()
