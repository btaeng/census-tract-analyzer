import sqlite3
import time
import requests
from tools.census_client import (
    get_pl_total_pops, 
    process_detailed_data, 
    DEC_URL, 
    CENSUS_KEY
)

DB_PATH = "census_data.db"

def init_db():
    """Initializes the SQLite database with the required tables."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    cur.execute('''CREATE TABLE IF NOT EXISTS geographies 
                   (geoid TEXT PRIMARY KEY, 
                    name TEXT, 
                    level TEXT, 
                    mce TEXT, 
                    total_pop INTEGER)''')
    
    cur.execute('''CREATE TABLE IF NOT EXISTS details 
                   (geoid TEXT, 
                    label TEXT, 
                    pop INTEGER, 
                    percent_alone REAL, 
                    percent_of_geo REAL)''')
    
    cur.execute('CREATE INDEX IF NOT EXISTS idx_geoid ON details(geoid)')
    conn.commit()
    return conn

def save_harvest(conn, processed_data, level):
    """Inserts processed Census data into the SQLite database."""
    cur = conn.cursor()
    print(f"Saving {len(processed_data)} {level} records to database...")
    
    for geoid, data in processed_data.items():
        cur.execute("INSERT OR REPLACE INTO geographies VALUES (?, ?, ?, ?, ?)",
                    (geoid, data['name'], level, data['mce'], data['total_geo_pop']))
        
        cur.execute("DELETE FROM details WHERE geoid = ?", (geoid,))
        
        for eth in data['details']:
            cur.execute("INSERT INTO details VALUES (?, ?, ?, ?, ?)",
                        (geoid, eth['label'], eth['pop'], eth['percent_alone'], eth['percent_of_geo']))
    
    conn.commit()
    print("Done.")

def harvest_states():
    """Harvests data for all 50 states + DC."""
    print("Starting State Harvest...")
    conn = init_db()
    
    try:
        print("Fetching total population denominators...")
        totals = get_pl_total_pops("state:*")
        
        print("Fetching detailed ethnicity data (this may take a moment)...")
        r = requests.get(DEC_URL, params={
            "get": "group(T01001),NAME", 
            "POPGROUP": "*", 
            "for": "state:*", 
            "key": CENSUS_KEY
        })
        r.raise_for_status()
        
        processed = process_detailed_data(r.json(), totals, "state")
        save_harvest(conn, processed, 'state')
        
    except Exception as e:
        print(f"Error during harvest: {e}")
    finally:
        conn.close()
        time.sleep(5)

def harvest_counties(state_fips):
    print(f"--- Harvesting State: {state_fips} ---")
    conn = init_db()
    print("Fetching total population denominators...")
    totals = get_pl_total_pops("county:*", state_fips=state_fips)
    print("Fetching detailed ethnicity data (this may take a moment)...")
    r = requests.get(DEC_URL, params={
        "get": "group(T01001),NAME", 
        "POPGROUP": "*", 
        "for": "county:*", 
        "in": f"state:{state_fips}",
        "key": CENSUS_KEY
    })
    processed = process_detailed_data(r.json(), totals, "county", state_fips=state_fips)
    
    save_harvest(conn, processed, 'county')
    conn.close()
    time.sleep(5)

def is_county_finished(conn, county_geoid):
    """Checks if we already have tract data for this county."""
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM geographies WHERE level = 'tract' AND geoid LIKE ? LIMIT 1", 
                (f"{county_geoid}%",))
    return cur.fetchone() is not None

def harvest_all_tracts():
    conn = init_db()
    cur = conn.cursor()
    cur.execute("SELECT geoid, name FROM geographies WHERE level = 'county'")
    all_counties = cur.fetchall()
    print(f"Found {len(all_counties)} counties. Starting tract harvest...")

    for co_id, co_name in all_counties:
        if is_county_finished(conn, co_id):
            continue

        state_fips = co_id[:2]
        county_fips = co_id[2:]
        
        success = False
        retries = 0
        max_retries = 3

        while not success and retries < max_retries:
            try:
                print(f"[{co_id}] Harvesting {co_name} (Attempt {retries + 1})...")
                
                totals = get_pl_total_pops("tract:*", state_fips=state_fips, county_fips=county_fips)
                
                r = requests.get(DEC_URL, params={
                    "get": "group(T01001),NAME", 
                    "POPGROUP": "*", 
                    "for": "tract:*", 
                    "in": f"state:{state_fips} county:{county_fips}",
                    "key": CENSUS_KEY
                }, timeout=30)

                if r.status_code == 429:
                    print("!!! 429 Detected (Rate Limit). Cooling down for 5 minutes...")
                    time.sleep(300) # Wait 5 minutes
                    retries += 1
                    continue
                
                if r.status_code != 200:
                    print(f"!!! Server returned status {r.status_code}. Waiting 30s...")
                    time.sleep(30)
                    retries += 1
                    continue

                processed = process_detailed_data(
                    r.json(), totals, "tract", 
                    state_fips=state_fips, county_fips=county_fips
                )
                
                save_harvest(conn, processed, 'tract')
                success = True
                time.sleep(1.5)

            except Exception as e:
                print(f"!!! Unexpected Error: {e}")
                time.sleep(10)
                retries += 1

    conn.close()
    print("ALL TRACTS HARVESTED SUCCESSFULLY.")

if __name__ == "__main__":
    harvest_all_tracts()