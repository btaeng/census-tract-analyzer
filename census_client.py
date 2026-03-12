import os, requests
from dotenv import load_dotenv
load_dotenv()
CENSUS_KEY = os.getenv("CENSUS_API_KEY") or ""

ACS_URL = "https://api.census.gov/data/2020/acs/acs5/subject"
DEC_URL = "https://api.census.gov/data/2020/dec/ddhca"
PL_URL  = "https://api.census.gov/data/2020/dec/pl"

AGGREGATE_LABELS = [
    "European",
    "Other European",
    "Other European, not specified",
    "Scandinavian",
    "Scots-Irish",
    "Slavic",
    "Middle Eastern or North African",
    "Other Middle Eastern or North African",
    "Pennsylvania German",
    "Other White",
    "Other White, specified",
    "African American",
    "Other Sub-Saharan African",
    "Sub-Saharan African",
    "Caribbean",
    "Other Caribbean",
    "West Indian",
    "Other Black or African American",
    "Caribbean Hispanic",
    "Other Caribbean Hispanic",
    "Central American",
    "Other Central American",
    "South American",
    "Other South American",
    "Afro Latino(a)",
    "Garifuna",
    "Hispanic",
    "Latino(a)",
    "Other Hispanic or Latino",
    "Other Hispanic, Latino, or Spanish",
    "Spanish",
    "Spanish American",
    "Hispanic responses",
    "Hispanic",
    "All other Hispanic, Latino, or Spanish",
    "All other Hispanic, Latino, or Spanish responses",
    "All other Hispanic or Latino, not specified",
    "Multiracial/Multiethnic responses",
    "East Asian",
    "Other East Asian",
    "Mien",
    "Southeast Asian",
    "Other Southeast Asian",
    "South Asian",
    "Other South Asian",
    "Sindhi",
    "Central Asian",
    "Other Central Asian",
    "Other Asian",
    "Other Asian, not specified",
    "Buryat",
    "Kalmyk",
    "Kuki",
    "Lahu",
    "Malay",
    "Mizo",
    "Pashtun",
    "Tai Dam",
    "Other Some Other Race",
    "Other Some Other Race, not specified",
    "Other Native Hawaiian and Other Pacific Islander",
    "Melanesian",
    "Other Melanesian",
    "Other Micronesian",
    "Carolinian",
    "Chamorro",
    "Guamian",
    "Kosraean",
    "Pohnpeian",
    "Saipanese",
    "Yapese",
    "Easter Islander",
    "Polynesian",
    "Other Polynesian",
    "Rotuman",
    "Other Some Other Race, specified"
    "Latin American",
    "Other Black or African American, specified",
    "Caribbean Indian (all tribes)",
    "Mexican Indian (all tribes)"
]

def get_pl_total_pops(geo_for, geo_in=None):
    params = {"get": "P1_001N", "for": geo_for, "key": CENSUS_KEY}
    if geo_in: params["in"] = geo_in
    r = requests.get(PL_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    headers = data[0]

    geo_key = geo_for.split(':')[0] 
    idx_pop = headers.index("P1_001N")
    idx_geo = headers.index(geo_key)
    
    return {row[idx_geo]: int(row[idx_pop]) for row in data[1:]}

def process_detailed_data(data, totals_map, geo_idx_key):
    headers = data[0]
    idx = {h:i for i, h in enumerate(headers)}
    
    raw_storage = {}

    for row in data[1:]:
        geo_id = row[idx[geo_idx_key]]
        label = row[idx["POPGROUP_LABEL"]].strip() 
        geo_name = row[idx["NAME"]] 
        pop = int(row[idx["T01001_001N"]]) if row[idx["T01001_001N"]] else 0
        
        if geo_id not in raw_storage:
            total_land_pop = totals_map.get(geo_id, 0)
            raw_storage[geo_id] = {"groups": {}, "name": geo_name, "total_pop": total_land_pop}

        if label.lower() in ["total", "total population"]:
            raw_storage[geo_id]["total_pop"] = pop
            continue

        is_combo = " alone or in any combination" in label
        is_alone = label.endswith(" alone")

        clean_label = label.replace(" alone or in any combination", "").replace(" alone", "").strip()
        
        if clean_label in AGGREGATE_LABELS:
            continue

        if clean_label not in raw_storage[geo_id]["groups"]:
            raw_storage[geo_id]["groups"][clean_label] = {"alone": 0, "max_total": 0}
        
        group = raw_storage[geo_id]["groups"][clean_label]

        if is_combo or (not is_alone and not is_combo):
            if pop > group["max_total"]:
                group["max_total"] = pop
        if is_alone:
            group["alone"] = pop
        elif not is_combo and group["alone"] == 0:
            group["alone"] = pop

    final_output = {}
    for geo_id, data in raw_storage.items():
        processed_list = []
        total_geo_pop = data["total_pop"]
        for label, counts in data["groups"].items():
            total_pop = counts["max_total"]
            if total_pop == 0: continue
            alone_pop = counts["alone"]
            
            processed_list.append({
                "label": label,
                "pop": total_pop,
                "percent_of_geo": round((total_pop / total_geo_pop) * 100, 2) if total_geo_pop > 0 else 0,
                "percent_alone": round((alone_pop / total_pop) * 100, 1) if total_pop > 0 else 0
            })
        
        processed_list.sort(key=lambda x: x['pop'], reverse=True)
        
        final_output[geo_id] = {
            "name": data["name"],
            "total_geo_pop": total_geo_pop,
            "mce": processed_list[0]['label'] if processed_list else "Unknown",
            "details": processed_list
        }
    return final_output

def get_all_states_ethnicity():
    totals = get_pl_total_pops("state:*")
    r = requests.get(DEC_URL, params={"get": "group(T01001),NAME", "POPGROUP": "*", "for": "state:*", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), totals, "state")

def get_counties_mce(state_fips):
    totals = get_pl_total_pops(f"county:*", f"state:{state_fips}")
    r = requests.get(DEC_URL, params={"get": "group(T01001),NAME", "POPGROUP": "*", "for": "county:*", "in": f"state:{state_fips}", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), totals, "county")

def get_tracts_mce(state_fips, county_fips):
    totals = get_pl_total_pops(f"tract:*", f"state:{state_fips} county:{county_fips}")
    r = requests.get(DEC_URL, params={"get": "group(T01001),NAME", "POPGROUP": "*", "for": "tract:*", "in": f"state:{state_fips} county:{county_fips}", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), totals, "tract")