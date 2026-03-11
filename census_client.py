import os, requests
from dotenv import load_dotenv
load_dotenv()
CENSUS_KEY = os.getenv("CENSUS_API_KEY") or ""

ACS_URL = "https://api.census.gov/data/2020/acs/acs5/subject"
DEC_URL = "https://api.census.gov/data/2020/dec/ddhca"
PL_URL  = "https://api.census.gov/data/2020/dec/pl"

def get_total_pop(state, county, tract=None):
    params = {"get": "P1_001N", "in": f"state:{state} county:{county}", "key": CENSUS_KEY}
    if tract:
        params["for"] = f"tract:{tract}"
    else:
        params["for"] = f"county:{county}"
    r = requests.get(PL_URL, params=params, timeout=10)
    r.raise_for_status()
    h, v = r.json()[0], r.json()[1]
    return int(v[h.index("P1_001N")])

def get_acs_age_income(state, county, tract):
    age_keys = [
        "S0101_C02_002E","S0101_C02_003E","S0101_C02_004E","S0101_C02_005E",
        "S0101_C02_006E","S0101_C02_007E","S0101_C02_008E","S0101_C02_009E",
        "S0101_C02_010E","S0101_C02_011E","S0101_C02_012E","S0101_C02_013E",
        "S0101_C02_014E","S0101_C02_015E","S0101_C02_016E","S0101_C02_017E",
        "S0101_C02_018E","S0101_C02_019E"
    ]
    age_labels = [
        "<5","5-9","10-14","15-19","20-24","25-29","30-34","35-39",
        "40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79",
        "80-84","85+"
    ]
    income_keys = {
        "S1902_C03_001E": "mean_household_income",
        "S1902_C03_012E": "mean_family_income",
        "S1902_C03_019E": "mean_per_capita_income"
    }

    params = {
        "get": "NAME," + ",".join(age_keys + list(income_keys.keys())),
        "for": f"tract:{tract}",
        "in": f"state:{state} county:{county}",
        "key": CENSUS_KEY
    }
    r = requests.get(ACS_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    headers, values = data[0], data[1]
    idx = {h:i for i,h in enumerate(headers)}

    ages = []
    for label, key in zip(age_labels, age_keys):
        val = values[idx[key]]
        ages.append({"label": label, "percent": float(val) if val not in ("", None) else None})

    incomes = {}
    for key, outname in income_keys.items():
        val = values[idx[key]]
        incomes[outname] = float(val) if val not in ("", None) else None

    return {"name": values[idx["NAME"]], "ages": ages, "income": incomes}

def get_ethnicity(state, county, tract, total_pop):
    params = {
        "get": "group(T01001)",
        "POPGROUP": "*",
        "for": f"tract:{tract}",
        "in": f"state:{state} county:{county}",
        "key": CENSUS_KEY
    }
    r = requests.get(DEC_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    headers = data[0]
    results = []
    idx = {h:i for i,h in enumerate(headers)}
    for row in data[1:]:
        label = row[idx["POPGROUP_LABEL"]]
        pop_str = row[idx.get("T01001_001N")]
        try:
            pop = int(pop_str) if pop_str else 0
        except ValueError:
            pop = 0
        results.append({"label": label, "pop": pop})

    alone_map, combo_map = {}, {}
    for item in results:
        label, pop = item["label"], item["pop"]
        if "alone or in any combination" in label:
            base = label.replace(" alone or in any combination", "")
            combo_map[base] = pop
        elif "alone" in label:
            base = label.replace(" alone", "")
            alone_map[base] = pop
        else:
            combo_map[label] = pop

    ethnic = []
    if total_pop > 0:
        for label, combo_count in combo_map.items():
            entry = {
                "label": label,
                "population": combo_count,
                "percent_of_total": round(100 * combo_count / total_pop, 2),
            }
            if label in alone_map and alone_map[label] > 0:
                entry["percent_alone_within_group"] = round(
                    100 * alone_map[label] / combo_count, 2
                )
            entry["_pop"] = combo_count
            ethnic.append(entry)

    ethnic.sort(key=lambda e: e["_pop"], reverse=True)

    for e in ethnic:
        e.pop("_pop", None)
    return ethnic

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

def process_detailed_data(data, geo_idx_key):
    headers = data[0]
    idx = {h:i for i, h in enumerate(headers)}
    
    raw_storage = {}

    for row in data[1:]:
        geo_id = row[idx[geo_idx_key]]
        label = row[idx["POPGROUP_LABEL"]].strip() 
        geo_name = row[idx["NAME"]] 
        pop = int(row[idx["T01001_001N"]]) if row[idx["T01001_001N"]] else 0
        
        if geo_id not in raw_storage:
            raw_storage[geo_id] = {"groups": {}, "name": geo_name}

        is_combo = " alone or in any combination" in label
        is_alone = label.endswith(" alone")

        clean_label = label.replace(" alone or in any combination", "").replace(" alone", "").strip()
        
        if clean_label in AGGREGATE_LABELS or "Total" in label:
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
        for label, counts in data["groups"].items():
            total_pop = counts["max_total"]
            if total_pop == 0: continue
            alone_pop = counts["alone"]
            
            processed_list.append({
                "label": label,
                "pop": total_pop,
                "percent_alone": round((alone_pop / total_pop) * 100, 1) if total_pop > 0 else 0
            })
        
        processed_list.sort(key=lambda x: x['pop'], reverse=True)
        
        final_output[geo_id] = {
            "name": data["name"],
            "mce": processed_list[0]['label'] if processed_list else "Unknown",
            "details": processed_list
        }
    return final_output

def get_all_states_ethnicity():
    r = requests.get(DEC_URL, params={"get": "group(T01001)", "POPGROUP": "*", "for": "state:*", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), "state")

def get_counties_mce(state_fips):
    r = requests.get(DEC_URL, params={"get": "group(T01001)", "POPGROUP": "*", "for": "county:*", "in": f"state:{state_fips}", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), "county")

def get_tracts_mce(state_fips, county_fips):
    r = requests.get(DEC_URL, params={"get": "group(T01001)", "POPGROUP": "*", "for": "tract:*", "in": f"state:{state_fips} county:{county_fips}", "key": CENSUS_KEY})
    return process_detailed_data(r.json(), "tract")