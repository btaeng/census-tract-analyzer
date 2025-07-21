This is a Python script that requests age, income, and ethnic demographic statistics of any census tract from the US Census API.

Certain parts are hardcoded (tract population, tract/county/state codes).

This project uses data from the U.S. Census Bureau's 2020 Decennial Census and 2023 American Community Survey (ACS) via the public Census API.

The Census Bureau is not responsible for the analyses or interpretations presented here.

### Instructions

1. You must have a valid Census API key to request data. Obtain a key [here](https://api.census.gov/data/key_signup.html), then paste it into `YOUR_KEY_HERE` on line 3.

2. In the `acs_params` and `dec_params` dictionaries, replace `YOUR_TRACT_HERE`, `YOUR_STATE_HERE`, and `YOUR_COUNTY_HERE` with their respective codes. If the geocode is 1400000US36061000700, the state code is "36", the county code is "061", and the tract code is "000700". These can be found in the URL when selecting a tract in the US Census Bureau's advanced search [here](https://data.census.gov/advanced).

3. On line 33, replace `XXX` with your tract code.

4. On line 35, replace `9999` with the population of your tract (this can be found in the Census Bureau's advanced search).

5. Run the script, and the demographic data should appear in your console.