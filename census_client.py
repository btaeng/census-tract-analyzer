import os, requests
from dotenv import load_dotenv
load_dotenv()
CENSUS_KEY = os.getenv("CENSUS_API_KEY") or ""

ACS_URL = "https://api.census.gov/data/2023/acs/acs5/subject"
DEC_URL = "https://api.census.gov/data/2020/dec/ddhca"
PL_URL  = "https://api.census.gov/data/2020/dec/pl"

def get_total_pop(state, county, tract=None):
    params = {"get": "P1_001N", "in": f"state:{state} county:{county}", "key": CENSUS_KEY}
    if tract:
        params["for"] = f"tract:{tract}"
    else:
        params["for"] = f"county:{county}"
    r = requests.get(PL_URL, params=params); r.raise_for_status()
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
    r = requests.get(ACS_URL, params=params); r.raise_for_status()
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
    r = requests.get(DEC_URL, params=params); r.raise_for_status()
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