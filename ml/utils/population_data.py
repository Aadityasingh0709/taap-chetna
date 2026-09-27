"""
ml/utils/population_data.py
Historical demographic and population exposure figures based on Census of India (2001 & 2011).
Computes annual intercensal interpolated and postcensal projected population and density per state (2001-2014).

CRITICAL METHODOLOGICAL NOTE:
  The Republic of India conducts Decennial National Population Censuses (specifically 2001 and 2011).
  The annual figures generated here for non-census years (2002-2010 and 2012-2014) are mathematical
  intercensal exponential growth approximations P(t) = P(0) * e^(r*t).
  These figures serve strictly as demographic exposure proxy normalizers for macro epidemiology;
  they MUST NOT be cited or described as official annual administrative census enumerations.
"""

import math
from typing import Dict, Tuple

# Official Census of India benchmarks: (pop_2001, pop_2011, area_sq_km)
# Note: Andhra Pradesh represents unified state (including Telangana) as in the 2001-2014 NCRB mortality series.
CENSUS_BENCHMARKS: Dict[str, Tuple[int, int, float]] = {
    'Andhra Pradesh': (76210007, 84580777, 275045.0),
    'Arunachal Pradesh': (1097968, 1383727, 83743.0),
    'Assam': (26655528, 31205576, 78438.0),
    'Bihar': (82998509, 104099452, 94163.0),
    'Chhattisgarh': (20833803, 25545198, 135192.0),
    'Delhi': (13850507, 16787941, 1484.0),
    'Gujarat': (50671017, 60439692, 196024.0),
    'Haryana': (21144564, 25351462, 44212.0),
    'Himachal Pradesh': (6077900, 6864602, 55673.0),
    'Jammu & Kashmir': (10143700, 12541302, 222236.0),
    'Jharkhand': (26945829, 32988134, 79714.0),
    'Karnataka': (52850562, 61095297, 191791.0),
    'Kerala': (31841374, 33406061, 38863.0),
    'Madhya Pradesh': (60348023, 72626809, 308245.0),
    'Maharashtra': (96878627, 112374333, 307713.0),
    'Meghalaya': (2318822, 2966889, 22429.0),
    'Odisha': (36804660, 41974218, 155707.0),
    'Punjab': (24358999, 27743338, 50362.0),
    'Rajasthan': (56507188, 68548437, 342239.0),
    'Tamil Nadu': (62405679, 72147030, 130058.0),
    'Tripura': (3199203, 3673917, 10486.0),
    'Uttar Pradesh': (166197921, 199812341, 240928.0),
    'Uttarakhand': (8489349, 10086292, 53483.0),
    'West Bengal': (80176197, 91276115, 88752.0),
}


def get_state_population_and_density(state: str, year: int) -> Tuple[float, float]:
    """
    Returns (population_in_millions, population_density_per_sq_km) for a state and year.
    Uses standard intercensal exponential growth rate: P(t) = P(0) * e^(r*t).
    """
    benchmarks = CENSUS_BENCHMARKS.get(state)
    if not benchmarks:
        return (10.0, 300.0)  # Neutral fallback if unknown
        
    p2001, p2011, area = benchmarks
    # Annual growth rate between 2001 and 2011
    growth_rate = math.log(p2011 / p2001) / 10.0
    
    # Intercensal / postcensal estimate
    dt = year - 2001
    pop = p2001 * math.exp(growth_rate * dt)
    pop_millions = round(pop / 1_000_000.0, 3)
    density = round(pop / area, 2)
    
    return pop_millions, density
