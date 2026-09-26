"""
ml/utils/geo_utils.py
Geographic processing, India state boundary mapping, and coordinate assignment.
"""

import os
import json
import requests
import pandas as pd
from typing import Dict, List, Optional, Tuple
from shapely.geometry import shape, Point
from shapely.prepared import prep

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
GEOJSON_PATH = os.path.join(DATA_DIR, 'india_states.geojson')
MAPPING_CSV_PATH = os.path.join(DATA_DIR, 'state_name_mapping.csv')

GEOJSON_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson'

STATE_NAME_MAPPING = {
    'Orissa': 'Odisha',
    'Uttaranchal': 'Uttarakhand',
    'Jammu and Kashmir': 'Jammu & Kashmir',
    'Telangana': 'Andhra Pradesh',  # Unified in 2001-2014 NCRB dataset
}

# Explicit representative climate points for capital / core meteorological zones of each state
STATE_CENTROID_POINTS = {
    'Andhra Pradesh': (16.5, 80.6),      # Vijayawada / Amaravati
    'Arunachal Pradesh': (27.1, 93.6),   # Itanagar
    'Assam': (26.2, 91.7),               # Guwahati / Dispur
    'Bihar': (25.6, 85.1),               # Patna
    'Chhattisgarh': (21.3, 81.6),        # Raipur
    'Delhi': (28.6, 77.2),               # New Delhi
    'Gujarat': (23.2, 72.6),             # Gandhinagar / Ahmedabad
    'Haryana': (29.1, 76.8),             # Rohtak / Central Haryana
    'Himachal Pradesh': (31.1, 77.2),    # Shimla
    'Jammu & Kashmir': (34.1, 74.8),     # Srinagar / Jammu
    'Jharkhand': (23.4, 85.3),           # Ranchi
    'Karnataka': (12.9, 77.6),           # Bengaluru
    'Kerala': (8.5, 76.9),               # Thiruvananthapuram
    'Madhya Pradesh': (23.3, 77.4),      # Bhopal
    'Maharashtra': (19.0, 72.8),         # Mumbai / Western Maharashtra
    'Meghalaya': (25.6, 91.9),           # Shillong
    'Odisha': (20.3, 85.8),              # Bhubaneswar
    'Punjab': (30.9, 75.8),              # Ludhiana / Central Punjab
    'Rajasthan': (26.9, 75.8),           # Jaipur
    'Tamil Nadu': (13.1, 80.3),          # Chennai
    'Tripura': (23.8, 91.3),             # Agartala
    'Uttar Pradesh': (26.8, 80.9),       # Lucknow
    'Uttarakhand': (30.3, 78.0),         # Dehradun
    'West Bengal': (22.6, 88.4),         # Kolkata
}


def ensure_geojson_downloaded() -> str:
    """Ensures the India states GeoJSON exists locally, downloading if necessary."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(GEOJSON_PATH):
        print(f"Downloading India states boundary GeoJSON from {GEOJSON_URL}...")
        resp = requests.get(GEOJSON_URL, timeout=30)
        resp.raise_for_status()
        with open(GEOJSON_PATH, 'w', encoding='utf-8') as f:
            f.write(resp.text)
        print(f"Saved GeoJSON to {GEOJSON_PATH}")
    return GEOJSON_PATH


def export_state_name_mapping():
    """Generates state_name_mapping.csv for reproducible documentation."""
    mapping_data = [
        {'source_name': 'Orissa', 'target_name': 'Odisha', 'reason': 'Official constitutional renaming in 2011'},
        {'source_name': 'Uttaranchal', 'target_name': 'Uttarakhand', 'reason': 'Official constitutional renaming in 2007'},
        {'source_name': 'Jammu and Kashmir', 'target_name': 'Jammu & Kashmir', 'reason': 'Ampersand typography normalization'},
        {'source_name': 'Telangana', 'target_name': 'Andhra Pradesh', 'reason': 'Historical administrative union during 2001-2014 mortality recording'},
        {'source_name': 'Andhra Pradesh', 'target_name': 'Andhra Pradesh', 'reason': 'Identity match'},
        {'source_name': 'Delhi', 'target_name': 'Delhi', 'reason': 'Identity match (National Capital Territory)'},
    ]
    df = pd.DataFrame(mapping_data)
    os.makedirs(DATA_DIR, exist_ok=True)
    df.to_csv(MAPPING_CSV_PATH, index=False)
    print(f"Saved state name mapping to {MAPPING_CSV_PATH}")
    return df


class StateBoundaryMatcher:
    """Matches latitude/longitude points to Indian States using polygon containment."""
    
    def __init__(self):
        geojson_file = ensure_geojson_downloaded()
        with open(geojson_file, 'r', encoding='utf-8') as f:
            gj = json.load(f)
            
        self.state_geoms = {}
        for feat in gj.get('features', []):
            raw_name = (
                feat['properties'].get('NAME_1')
                or feat['properties'].get('ST_NM')
                or feat['properties'].get('name')
            )
            norm_name = STATE_NAME_MAPPING.get(raw_name, raw_name)
            geom = shape(feat['geometry'])
            if norm_name in self.state_geoms:
                self.state_geoms[norm_name] = self.state_geoms[norm_name].union(geom)
            else:
                self.state_geoms[norm_name] = geom
                
        self.state_preps = {name: prep(geom) for name, geom in self.state_geoms.items()}
        
    def find_state(self, lat: float, lon: float) -> Optional[str]:
        """Finds state containing (lat, lon), or closest boundary if within 0.5 degrees."""
        # Special check for Delhi bounding box to avoid boundary clipping
        if 28.3 <= lat <= 28.9 and 76.8 <= lon <= 77.4:
            return 'Delhi'
            
        pt = Point(lon, lat)
        for name, p_geom in self.state_preps.items():
            if p_geom.contains(pt) or p_geom.intersects(pt):
                return name
                
        # Nearest fallback for coastal or borderline grid coordinates
        min_dist = 999.0
        nearest = None
        for name, geom in self.state_geoms.items():
            d = geom.distance(pt)
            if d < min_dist:
                min_dist = d
                nearest = name
                
        if min_dist < 0.6:  # within ~60km of boundary/coast
            return nearest
        return None
