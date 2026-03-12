from flask import Flask, request, jsonify
from flask_cors import CORS
from census_client import get_all_states_ethnicity, get_counties_mce, get_tracts_mce
import os

app = Flask(__name__)
CORS(app)
    
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