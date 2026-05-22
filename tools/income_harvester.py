import sqlite3
import time
import requests
import os
from dotenv import load_dotenv

load_dotenv()
CENSUS_KEY = os.getenv("CENSUS_API_KEY") or ""

ACS_URL = "https://api.census.gov/data/2020/acs/acs5/subject"
DB_PATH = "census_income_data.db"
GEOGRAPHIES_DB_PATH = "census_data.db"

# Income variables from ACS S1902 table
# S1902_C03_001E - Median household income
# S1902_C03_012E - Median family income
# S1902_C03_019E - Per capita income
INCOME_VARS = {
    "S1902_C03_001E": "median_household_income",
    "S1902_C03_012E": "median_family_income",
    "S1902_C03_019E": "per_capita_income"
}

def init_income_db():
    """Initializes the SQLite database with income data tables."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    cur.execute('''CREATE TABLE IF NOT EXISTS income_data 
                   (geoid TEXT PRIMARY KEY, 
                    name TEXT, 
                    level TEXT, 
                    median_household_income INTEGER,
                    median_family_income INTEGER,
                    per_capita_income INTEGER)''')
    
    cur.execute('CREATE INDEX IF NOT EXISTS idx_income_geoid ON income_data(geoid)')
    conn.commit()
    return conn

def save_income_data(conn, data_dict, level):
    """Inserts income data into the SQLite database."""
    cur = conn.cursor()
    print(f"Saving {len(data_dict)} {level} income records to database...")
    
    for geoid, data in data_dict.items():
        cur.execute("""INSERT OR REPLACE INTO income_data 
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (geoid, data['name'], level, 
                     data['median_household_income'],
                     data['median_family_income'],
                     data['per_capita_income']))
    
    conn.commit()
    print("Done.")

def fetch_income_data(geo_for, in_clause=None, state_fips=None, county_fips=None):
    """Fetches income data from Census ACS API."""
    var_string = ",".join(INCOME_VARS.keys())
    
    params = {
        "get": f"{var_string},NAME",
        "for": geo_for,
        "key": CENSUS_KEY
    }
    
    if in_clause:
        params["in"] = in_clause
    
    r = requests.get(ACS_URL, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def process_income_response(json_data, level, state_fips=None, county_fips=None):
    """Processes the Census API response and returns income data dictionary."""
    headers = json_data[0]
    idx = {h: i for i, h in enumerate(headers)}
    
    # Map header indices
    var_indices = {var: idx[var] for var in INCOME_VARS.keys()}
    name_idx = idx["NAME"]
    level_key = level
    
    result = {}
    
    for row in json_data[1:]:
        short_id = row[idx[level_key]]
        
        # Build full GEOID
        if level == "state":
            full_id = short_id
        elif level == "county":
            full_id = state_fips + short_id
        elif level == "tract":
            full_id = state_fips + county_fips + short_id
        else:
            continue
        
        geo_name = row[name_idx]
        
        # Extract income values (convert to int, handle None/empty)
        def get_income_value(var_key):
            val = row[var_indices[var_key]]
            if val and val != "-":
                try:
                    return int(float(val))
                except (ValueError, TypeError):
                    return None
            return None
        
        result[full_id] = {
            "name": geo_name,
            "median_household_income": get_income_value("S1902_C03_001E"),
            "median_family_income": get_income_value("S1902_C03_012E"),
            "per_capita_income": get_income_value("S1902_C03_019E")
        }
    
    return result

def harvest_state_income():
    """Harvests income data for all 50 states + DC."""
    print("Starting State Income Harvest...")
    conn = init_income_db()
    
    try:
        print("Fetching income data for all states...")
        json_data = fetch_income_data("state:*")
        processed = process_income_response(json_data, "state")
        save_income_data(conn, processed, "state")
        
    except Exception as e:
        print(f"Error during state income harvest: {e}")
    finally:
        conn.close()
        time.sleep(2)

def harvest_county_income(state_fips):
    """Harvests income data for all counties in a state."""
    print(f"--- Harvesting County Income for State: {state_fips} ---")
    conn = init_income_db()
    
    try:
        print(f"Fetching income data for counties in state {state_fips}...")
        json_data = fetch_income_data(
            "county:*",
            in_clause=f"state:{state_fips}",
            state_fips=state_fips
        )
        processed = process_income_response(json_data, "county", state_fips=state_fips)
        save_income_data(conn, processed, "county")
        
    except Exception as e:
        print(f"Error harvesting counties for state {state_fips}: {e}")
    finally:
        conn.close()
        time.sleep(2)

def is_tract_finished(conn, county_geoid):
    """Checks if we already have tract income data for this county."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM income_data WHERE level = 'tract' AND geoid LIKE ? LIMIT 1", 
                (f"{county_geoid}%",))
    return cur.fetchone() is not None

def harvest_all_tract_income():
    """Harvests income data for all tracts in the country."""
    geo_conn = sqlite3.connect(GEOGRAPHIES_DB_PATH)
    geo_cur = geo_conn.cursor()
    
    # Get all counties from the existing geographies table
    geo_cur.execute("SELECT geoid, name FROM geographies WHERE level = 'county'")
    all_counties = geo_cur.fetchall()
    geo_conn.close()
    
    if not all_counties:
        print("ERROR: No counties found in geographies table. Please run the ethnicity harvester first.")
        return
    
    print(f"Found {len(all_counties)} counties. Starting tract income harvest...")
    
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
                
                json_data = fetch_income_data(
                    "tract:*",
                    in_clause=f"state:{state_fips} county:{county_fips}",
                    state_fips=state_fips,
                    county_fips=county_fips
                )
                
                processed = process_income_response(
                    json_data, "tract",
                    state_fips=state_fips,
                    county_fips=county_fips
                )
                
                conn = init_income_db()
                save_income_data(conn, processed, "tract")
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
    
    print("ALL TRACT INCOME DATA HARVESTED SUCCESSFULLY.")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "states":
            harvest_state_income()
        elif sys.argv[1] == "counties":
            if len(sys.argv) > 2:
                harvest_county_income(sys.argv[2])
            else:
                print("Usage: python income_harvester.py counties <state_fips>")
        elif sys.argv[1] == "tracts":
            harvest_all_tract_income()
        else:
            print("Unknown argument. Use 'states', 'counties <fips>', or 'tracts'")
    else:
        print("Harvesting all income data...")
        harvest_state_income()
        time.sleep(2)
        
        # Get all state FIPS codes from the geographies table
        geo_conn = sqlite3.connect(GEOGRAPHIES_DB_PATH)
        geo_cur = geo_conn.cursor()
        geo_cur.execute("SELECT DISTINCT geoid FROM geographies WHERE level = 'state' ORDER BY geoid")
        states = [row[0] for row in geo_cur.fetchall()]
        geo_conn.close()
        
        if not states:
            print("ERROR: No states found in geographies table. Please run the ethnicity harvester first.")
        else:
            for state_fips in states:
                harvest_county_income(state_fips)
                time.sleep(2)
            
            time.sleep(2)
            harvest_all_tract_income()
        
        print("\nINCOME DATA HARVEST COMPLETE!")
