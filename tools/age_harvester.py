import sqlite3
import time
import requests
import os
from dotenv import load_dotenv

load_dotenv()
# Try both CENSUS_API_KEY and API_KEY
CENSUS_KEY = os.getenv("CENSUS_API_KEY") or os.getenv("API_KEY") or ""

if not CENSUS_KEY:
    print("WARNING: Census API key not found in environment!")
    print("Make sure your .env file exists in the project root and contains either:")
    print("  CENSUS_API_KEY=your_key_here")
    print("  or API_KEY=your_key_here")
else:
    print(f"Census API key loaded successfully (length: {len(CENSUS_KEY)} chars)")

ACS_URL = "https://api.census.gov/data/2020/acs/acs5/subject"
DB_PATH = "census_age_data.db"
GEOGRAPHIES_DB_PATH = "census_data.db"

# Age variables from ACS S0101 table
AGE_VARS = {
    "S0101_C01_002E": "under_5",
    "S0101_C01_003E": "age_5_9",
    "S0101_C01_004E": "age_10_14",
    "S0101_C01_005E": "age_15_19",
    "S0101_C01_006E": "age_20_24",
    "S0101_C01_007E": "age_25_29",
    "S0101_C01_008E": "age_30_34",
    "S0101_C01_009E": "age_35_39",
    "S0101_C01_010E": "age_40_44",
    "S0101_C01_011E": "age_45_49",
    "S0101_C01_012E": "age_50_54",
    "S0101_C01_013E": "age_55_59",
    "S0101_C01_014E": "age_60_64",
    "S0101_C01_015E": "age_65_69",
    "S0101_C01_016E": "age_70_74",
    "S0101_C01_017E": "age_75_79",
    "S0101_C01_018E": "age_80_84",
    "S0101_C01_019E": "age_85_plus"
}

def init_age_db():
    """Initializes the SQLite database with age data tables."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    col_defs = ", ".join([f"{col_name} INTEGER" for col_name in AGE_VARS.values()])
    
    cur.execute(f'''CREATE TABLE IF NOT EXISTS age_data 
                   (geoid TEXT PRIMARY KEY, 
                    name TEXT, 
                    level TEXT, 
                    {col_defs})''')
    
    cur.execute('CREATE INDEX IF NOT EXISTS idx_age_geoid ON age_data(geoid)')
    conn.commit()
    return conn

def save_age_data(conn, data_dict, level):
    """Inserts age data into the SQLite database."""
    cur = conn.cursor()
    print(f"Saving {len(data_dict)} {level} age records to database...")
    
    age_cols = list(AGE_VARS.values())
    placeholders = ", ".join(["?"] * (3 + len(age_cols)))
    col_names = "geoid, name, level, " + ", ".join(age_cols)
    
    for geoid, data in data_dict.items():
        values = [geoid, data['name'], level]
        for col_name in age_cols:
            values.append(data.get(col_name))
        
        cur.execute(f"""INSERT OR REPLACE INTO age_data ({col_names})
                       VALUES ({placeholders})""", values)
    
    conn.commit()
    print("Done.")

def fetch_age_data(geo_for, in_clause=None, state_fips=None, county_fips=None):
    """Fetches age data from Census ACS API."""
    var_string = ",".join(AGE_VARS.keys())
    
    params = {
        "get": f"{var_string},NAME",
        "for": geo_for,
        "key": CENSUS_KEY
    }
    
    if in_clause:
        params["in"] = in_clause
    
    r = requests.get(ACS_URL, params=params, timeout=30)
    r.raise_for_status()
    
    try:
        return r.json()
    except requests.exceptions.JSONDecodeError:
        print(f"ERROR: API returned invalid JSON")
        print(f"Status Code: {r.status_code}")
        print(f"Response Text: {r.text[:500]}")
        raise

def process_age_response(json_data, level, state_fips=None, county_fips=None):
    """Processes the Census API response and returns age data dictionary."""
    headers = json_data[0]
    idx = {h: i for i, h in enumerate(headers)}
    
    var_indices = {var: idx[var] for var in AGE_VARS.keys()}
    name_idx = idx["NAME"]
    level_key = level
    
    result = {}
    
    for row in json_data[1:]:
        short_id = row[idx[level_key]]
        
        if level == "state":
            full_id = short_id
        elif level == "county":
            full_id = state_fips + short_id
        elif level == "tract":
            full_id = state_fips + county_fips + short_id
        else:
            continue
        
        geo_name = row[name_idx]
        
        def get_age_value(var_key):
            val = row[var_indices[var_key]]
            if val and val != "-":
                try:
                    return int(float(val))
                except (ValueError, TypeError):
                    return None
            return None
        
        result[full_id] = {
            "name": geo_name,
            **{col_name: get_age_value(var_key) for var_key, col_name in AGE_VARS.items()}
        }
    
    return result

def harvest_state_age():
    """Harvests age data for all 50 states + DC."""
    print("Starting State Age Harvest...")
    conn = init_age_db()
    
    try:
        print("Fetching age data for all states...")
        json_data = fetch_age_data("state:*")
        processed = process_age_response(json_data, "state")
        save_age_data(conn, processed, "state")
        
    except Exception as e:
        print(f"Error during state age harvest: {e}")
    finally:
        conn.close()
        time.sleep(2)

def harvest_county_age(state_fips):
    """Harvests age data for all counties in a state."""
    print(f"--- Harvesting County Age for State: {state_fips} ---")
    conn = init_age_db()
    
    try:
        print(f"Fetching age data for counties in state {state_fips}...")
        json_data = fetch_age_data(
            "county:*",
            in_clause=f"state:{state_fips}",
            state_fips=state_fips
        )
        processed = process_age_response(json_data, "county", state_fips=state_fips)
        save_age_data(conn, processed, "county")
        
    except Exception as e:
        print(f"Error harvesting counties for state {state_fips}: {e}")
    finally:
        conn.close()
        time.sleep(2)

def harvest_all_county_age():
    """Harvests age data for all counties in all states."""
    geo_conn = sqlite3.connect(GEOGRAPHIES_DB_PATH)
    geo_cur = geo_conn.cursor()
    
    geo_cur.execute("SELECT DISTINCT geoid FROM geographies WHERE level = 'state'")
    all_states = [r[0] for r in geo_cur.fetchall()]
    geo_conn.close()
    
    if not all_states:
        print("ERROR: No states found in geographies table. Please run the ethnicity harvester first.")
        return
    
    print(f"Found {len(all_states)} states. Starting county age harvest for all states...")
    
    for state_fips in all_states:
        harvest_county_age(state_fips)

def is_tract_finished(conn, county_geoid):
    """Checks if we already have tract age data for this county."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM age_data WHERE level = 'tract' AND geoid LIKE ? LIMIT 1", 
                (f"{county_geoid}%",))
    return cur.fetchone() is not None

def harvest_all_tract_age():
    """Harvests age data for all tracts in the country."""
    geo_conn = sqlite3.connect(GEOGRAPHIES_DB_PATH)
    geo_cur = geo_conn.cursor()
    
    geo_cur.execute("SELECT geoid, name FROM geographies WHERE level = 'county'")
    all_counties = geo_cur.fetchall()
    geo_conn.close()
    
    if not all_counties:
        print("ERROR: No counties found in geographies table. Please run the ethnicity harvester first.")
        return
    
    print(f"Found {len(all_counties)} counties. Starting tract age harvest...")
    
    for co_id, co_name in all_counties:
        if is_tract_finished(sqlite3.connect(DB_PATH), co_id):
            print(f"[{co_id}] Already harvested. Skipping...")
            continue
        
        state_fips = co_id[:2]
        county_fips = co_id[2:]
        
        success = False
        retries = 0
        max_retries = 3
        
        while not success and retries < max_retries:
            try:
                print(f"[{co_id}] Harvesting {co_name} (Attempt {retries + 1})...")
                
                json_data = fetch_age_data(
                    "tract:*",
                    in_clause=f"state:{state_fips} county:{county_fips}",
                    state_fips=state_fips,
                    county_fips=county_fips
                )
                
                processed = process_age_response(
                    json_data, "tract",
                    state_fips=state_fips,
                    county_fips=county_fips
                )
                
                conn = init_age_db()
                save_age_data(conn, processed, "tract")
                conn.close()
                
                success = True
                time.sleep(1.5)
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    print("!!! 429 Detected (Rate Limit). Cooling down for 5 minutes...")
                    time.sleep(300)
                    retries += 1
                    continue
                else:
                    print(f"!!! HTTP Error {e.response.status_code}. Waiting 30s...")
                    time.sleep(30)
                    retries += 1
                    continue
            except Exception as e:
                print(f"!!! Unexpected Error: {e}")
                time.sleep(10)
                retries += 1
    
    print("ALL TRACT AGE DATA HARVESTED SUCCESSFULLY.")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "states":
            harvest_state_age()
        elif sys.argv[1] == "counties":
            if len(sys.argv) > 2:
                harvest_county_age(sys.argv[2])
            else:
                print("Usage: python age_harvester.py counties <state_fips>")
        elif sys.argv[1] == "tracts":
            harvest_all_tract_age()
        else:
            print("Unknown argument. Use 'states', 'counties <fips>', or 'tracts'")
    else:
        print("Running full age data harvest (states, counties, and tracts)...")
        harvest_state_age()
        harvest_all_county_age()
        harvest_all_tract_age()
