import sqlite3, os, json, sys

def export_static_api():
    conn = sqlite3.connect("census_data.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    os.makedirs("docs/api/counties", exist_ok=True)
    os.makedirs("docs/api/tracts", exist_ok=True)

    cur.execute("SELECT * FROM geographies WHERE level = 'state'")
    states = {}
    for row in cur.fetchall():
        gid = row['geoid']
        cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
        states[gid] = { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], 
                        "details": [dict(r) for r in cur.fetchall()] }
    
    with open("docs/api/states.json", "w") as f:
        json.dump(states, f)

    cur.execute("SELECT geoid FROM geographies WHERE level = 'state'")
    state_list = [r[0] for r in cur.fetchall()]
    for s_fips in state_list:
        cur.execute("SELECT * FROM geographies WHERE level = 'county' AND geoid LIKE ?", (s_fips+'%',))
        counties = { row['geoid']: { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], "details": [] } for row in cur.fetchall() }
        for gid in counties:
            cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
            counties[gid]["details"] = [dict(r) for r in cur.fetchall()]
        
        with open(f"docs/api/counties/{s_fips}.json", "w") as f:
            json.dump(counties, f)

    cur.execute("SELECT geoid FROM geographies WHERE level = 'county'")
    county_list = [r[0] for r in cur.fetchall()]
    for c_geoid in county_list:
        cur.execute("SELECT * FROM geographies WHERE level = 'tract' AND geoid LIKE ?", (c_geoid+'%',))
        tracts = { row['geoid']: { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], "details": [] } for row in cur.fetchall() }
        for gid in tracts:
            cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
            tracts[gid]["details"] = [dict(r) for r in cur.fetchall()]
        
        with open(f"docs/api/tracts/{c_geoid}.json", "w") as f:
            json.dump(tracts, f)

    conn.close()

def export_income_static_api():
    """Exports income data from census_income_data.db to JSON files."""
    conn = sqlite3.connect("census_income_data.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    os.makedirs("docs/api/income/counties", exist_ok=True)
    os.makedirs("docs/api/income/tracts", exist_ok=True)

    # Export state income data
    cur.execute("SELECT * FROM income_data WHERE level = 'state'")
    states = {}
    for row in cur.fetchall():
        gid = row['geoid']
        states[gid] = {
            "name": row['name'],
            "median_household_income": row['median_household_income'],
            "median_family_income": row['median_family_income'],
            "per_capita_income": row['per_capita_income']
        }
    
    with open("docs/api/income/states.json", "w") as f:
        json.dump(states, f)

    # Export county income data by state
    cur.execute("SELECT geoid FROM income_data WHERE level = 'state'")
    state_list = [r[0] for r in cur.fetchall()]
    for s_fips in state_list:
        cur.execute("SELECT * FROM income_data WHERE level = 'county' AND geoid LIKE ?", (s_fips+'%',))
        counties = {}
        for row in cur.fetchall():
            counties[row['geoid']] = {
                "name": row['name'],
                "median_household_income": row['median_household_income'],
                "median_family_income": row['median_family_income'],
                "per_capita_income": row['per_capita_income']
            }
        
        with open(f"docs/api/income/counties/{s_fips}.json", "w") as f:
            json.dump(counties, f)

    # Export tract income data by county
    cur.execute("SELECT geoid FROM income_data WHERE level = 'county'")
    county_list = [r[0] for r in cur.fetchall()]
    for c_geoid in county_list:
        cur.execute("SELECT * FROM income_data WHERE level = 'tract' AND geoid LIKE ?", (c_geoid+'%',))
        tracts = {}
        for row in cur.fetchall():
            tracts[row['geoid']] = {
                "name": row['name'],
                "median_household_income": row['median_household_income'],
                "median_family_income": row['median_family_income'],
                "per_capita_income": row['per_capita_income']
            }
        
        with open(f"docs/api/income/tracts/{c_geoid}.json", "w") as f:
            json.dump(tracts, f)

    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "income":
        print("Exporting income data only...")
        export_income_static_api()
    else:
        print("Exporting all data...")
        export_static_api()
        export_income_static_api()