import sqlite3, os, json

def export_static_api():
    conn = sqlite3.connect("census_data.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    os.makedirs("dist/api/counties", exist_ok=True)
    os.makedirs("dist/api/tracts", exist_ok=True)

    cur.execute("SELECT * FROM geographies WHERE level = 'state'")
    states = {}
    for row in cur.fetchall():
        gid = row['geoid']
        cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
        states[gid] = { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], 
                        "details": [dict(r) for r in cur.fetchall()] }
    
    with open("dist/api/states.json", "w") as f:
        json.dump(states, f)

    cur.execute("SELECT geoid FROM geographies WHERE level = 'state'")
    state_list = [r[0] for r in cur.fetchall()]
    for s_fips in state_list:
        cur.execute("SELECT * FROM geographies WHERE level = 'county' AND geoid LIKE ?", (s_fips+'%',))
        counties = { row['geoid']: { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], "details": [] } for row in cur.fetchall() }
        for gid in counties:
            cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
            counties[gid]["details"] = [dict(r) for r in cur.fetchall()]
        
        with open(f"dist/api/counties/{s_fips}.json", "w") as f:
            json.dump(counties, f)

    cur.execute("SELECT geoid FROM geographies WHERE level = 'county'")
    county_list = [r[0] for r in cur.fetchall()]
    for c_geoid in county_list:
        cur.execute("SELECT * FROM geographies WHERE level = 'tract' AND geoid LIKE ?", (c_geoid+'%',))
        tracts = { row['geoid']: { "name": row['name'], "mce": row['mce'], "total_geo_pop": row['total_pop'], "details": [] } for row in cur.fetchall() }
        for gid in tracts:
            cur.execute("SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ?", (gid,))
            tracts[gid]["details"] = [dict(r) for r in cur.fetchall()]
        
        with open(f"dist/api/tracts/{c_geoid}.json", "w") as f:
            json.dump(tracts, f)

    conn.close()

export_static_api()