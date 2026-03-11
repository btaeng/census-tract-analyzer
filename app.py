from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from census_client import get_all_states_ethnicity, get_counties_mce, get_total_pop, get_acs_age_income, get_ethnicity, get_tracts_mce
import os

app = Flask(__name__)
CORS(app)

def valid_fips(s, n): return isinstance(s, str) and len(s) == n and s.isdigit()

@app.get("/api/tract")
def tract():
    state  = request.args.get("state")
    county = request.args.get("county")
    tract  = request.args.get("tract")
    if not (valid_fips(state,2) and valid_fips(county,3) and valid_fips(tract,6)):
        return jsonify({"error":"Use FIPS: state=2 digits, county=3, tract=6"}), 400
    try:
        total = get_total_pop(state, county, tract)
        acs   = get_acs_age_income(state, county, tract)
        eth   = get_ethnicity(state, county, tract, total)
        return jsonify({
            "geo_id": {"state": state, "county": county, "tract": tract},
            "name": acs["name"],
            "total_pop": total,
            "age": acs["ages"],
            "income": acs["income"],
            "ethnicity": eth
        })
    except requests.exceptions.HTTPError as err:
        return jsonify({"error": f"Census API error: {err.response.status_code}. Check if FIPS exists in 2020 data."}), err.response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502
    
@app.get("/api/states-mce")
def states_mce():
    try:
        data = get_all_states_ethnicity()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502
    
@app.get("/api/counties-mce")
def counties_mce():
    state_fips = request.args.get("state")
    if not state_fips:
        return jsonify({"error": "Missing state parameter"}), 400
    try:
        data = get_counties_mce(state_fips)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.get("/api/tracts-mce")
def tracts_mce():
    state = request.args.get("state")
    county = request.args.get("county")
    if not state or not county:
        return jsonify({"error": "Missing state or county parameter"}), 400
    try:
        data = get_tracts_mce(state, county)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

if __name__ == "__main__":
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    app.run(host=host, port=5000, debug=True)