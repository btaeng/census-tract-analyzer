import sqlite3, os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = "census_data.db"

def get_from_db(level, parent_id=None):
    if not os.path.exists(DB_PATH):
        return None

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    query = "SELECT * FROM geographies WHERE level = ?"
    params = [level]
    if parent_id:
        query += " AND geoid LIKE ?"
        params.append(f"{parent_id}%")

    cur.execute(query, params)
    geos = cur.fetchall()
    
    output = {}
    for g in geos:
        gid = g['geoid']
        cur.execute("""SELECT label, pop, percent_alone, percent_of_geo 
                       FROM details WHERE geoid = ? ORDER BY pop DESC""", (gid,))
        details = [dict(row) for row in cur.fetchall()]
        
        output[gid] = {
            "name": g['name'],
            "mce": g['mce'],
            "total_geo_pop": g['total_pop'],
            "details": details
        }
    conn.close()
    return output

@app.get("/api/states-mce")
def states_mce():
    return jsonify(get_from_db('state'))

@app.get("/api/counties-mce")
def counties_mce():
    return jsonify(get_from_db('county', parent_id=request.args.get("state")))

@app.get("/api/tracts-mce")
def tracts_mce():
    county_geoid = request.args.get("county", "")
    if not county_geoid:
        return jsonify({"error": "Missing county parameter"}), 400
    data = get_from_db('tract', parent_id=county_geoid)
    return jsonify(data) if data else (jsonify({"error": "No tract data found"}), 404)

if __name__ == "__main__":
    app.run(port=5000, debug=True)