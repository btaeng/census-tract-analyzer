from flask import Flask, request, jsonify
from flask_cors import CORS
from census_client import get_total_pop, get_acs_age_income, get_ethnicity

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
    except Exception as e:
        return jsonify({"error": str(e)}), 502

if __name__ == "__main__":
    app.run(debug=True)