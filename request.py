import requests

API_KEY = 'YOUR_KEY_HERE'

# === ACS 2023 Subject Table ===
acs_url = 'https://api.census.gov/data/2023/acs/acs5/subject'
acs_params = {
    'get': 'NAME,S0101_C02_002E,S0101_C02_003E,S0101_C02_004E,S0101_C02_005E,S0101_C02_006E,S0101_C02_007E,S0101_C02_008E,S0101_C02_009E,S0101_C02_010E,S0101_C02_011E,S0101_C02_012E,S0101_C02_013E,S0101_C02_014E,S0101_C02_015E,S0101_C02_016E,S0101_C02_017E,S0101_C02_018E,S0101_C02_019E,S1902_C03_001E,S1902_C03_012E,S1902_C03_019E',
    'for': 'tract:YOUR_TRACT_HERE',
    'in': 'state:YOUR_STATE_HERE county:YOUR_COUNTY_HERE',
    'key': API_KEY
}

dec_url = 'https://api.census.gov/data/2020/dec/ddhca'
dec_params = {
    'get': 'group(T01001)',
    'POPGROUP': '*',
    'for': 'tract:YOUR_TRACT_HERE',
    'in': 'state:YOUR_STATE_HERE county:YOUR_COUNTY_HERE',
    'key': API_KEY
}

# === API Calls ===
# run1 = Run(request, data), run.results , list method
acs_response = requests.get(acs_url, params=acs_params)
# run2 = ... 
dec_response = requests.get(dec_url, params=dec_params)

acs_data = acs_response.json() if acs_response.status_code == 200 else None
dec_data = dec_response.json() if dec_response.status_code == 200 else None

# === Output ===
print("\nCensus Tract XXX; New York County; New York")

total_pop = 9999 # Replace this with the population of the tract

print(f"\nTotal Population: {total_pop}")

if acs_data and dec_data:
    # ----- ACS Parsing -----
    acs_headers = acs_data[0]
    acs_values = acs_data[1]
    print("\nAge Statistics:")
    age_brackets = [
        "<5", "5-9", "10-14", "15-19", "20-24", "25-29",
        "30-34", "35-39", "40-44", "45-49", "50-54", "55-59",
        "60-64", "65-69", "70-74", "75-79", "80-84", ">85"
    ]

    age_keys = [
        "S0101_C02_002E", "S0101_C02_003E", "S0101_C02_004E", "S0101_C02_005E",
        "S0101_C02_006E", "S0101_C02_007E", "S0101_C02_008E", "S0101_C02_009E",
        "S0101_C02_010E", "S0101_C02_011E", "S0101_C02_012E", "S0101_C02_013E",
        "S0101_C02_014E", "S0101_C02_015E", "S0101_C02_016E", "S0101_C02_017E",
        "S0101_C02_018E", "S0101_C02_019E"
    ]

    for label, key in zip(age_brackets, age_keys):
        try:
            value = acs_values[acs_headers.index(key)]
            print(f"{label}: {value}%")
        except ValueError:
            print(f"{label}: N/A")

    # ----- Income -----
    print("\nIncome Statistics:")
    income_labels = {
        "Mean Household Income": "S1902_C03_001E",
        "Mean Family Income": "S1902_C03_012E",
        "Mean Per Capita Income": "S1902_C03_019E"
    }

    for label, key in income_labels.items():
        try:
            value = acs_values[acs_headers.index(key)]
            print(f"{label}: ${value}")
        except ValueError:
            print(f"{label}: N/A")

    # ----- Decennial Parsing -----
    dec_headers = dec_data[0]

    results = []

    for row in dec_data[1:]:
        row_data = dict(zip(dec_headers, row))
        pop_str = row_data.get("T01001_001N")
        try:
            pop = int(pop_str) if pop_str else 0
        except ValueError:
            pop = 0

        results.append({
            "label": row_data.get("POPGROUP_LABEL", "Unknown Group"),
            "pop": pop
        })

    # Sort by population, descending
    results_sorted = sorted(results, key=lambda x: x["pop"], reverse=True)

    group_data = {}  # key = label, value = population
    alone_map = {}
    combo_map = {}

    for item in results_sorted:
        label = item['label']
        pop = item['pop']
        group_data[label] = pop

        if "alone or in any combination" in label:
            base = label.replace(" alone or in any combination", "")
            combo_map[base] = pop
        elif "alone" in label:
            base = label.replace(" alone", "")
            alone_map[base] = pop
        else:
            combo_map[label] = pop

    # Print
    print("\nEthnic Statistics:")
    for label, combo_count in combo_map.items():
        alone_count = alone_map.get(label, None)
        percent_total = (combo_count / total_pop) * 100

        if (combo_count >= (total_pop * 0.05)):
            if alone_count is not None and alone_count > 0:
                percent_alone = (alone_count / combo_count) * 100
                print(f"{label}: {percent_total:.2f}% ({percent_alone:.2f}% alone)")
            else:
                print(f"{label}: {percent_total:.2f}%")


else:
    print("\n=== Error Fetching Dataset ===")
    print(f"ACS Status Code: {acs_response.status_code}")
    print(f"ACS Response Text: {acs_response.text}")
    print(f"DEC Status Code: {dec_response.status_code}")
    print(f"DEC Response Text: {dec_response.text}")