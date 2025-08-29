This is a Python script that requests age, income, and ethnic demographic statistics of any census tract from the US Census API.

Certain parts are hardcoded (tract/county/state codes).

This project uses data from the U.S. Census Bureau's 2020 Decennial Census and 2023 American Community Survey (ACS) via the public Census API.

The Census Bureau is not responsible for the analyses or interpretations presented here.

### Instructions

1. You must have a valid Census API key to request data. Obtain a key [here](https://api.census.gov/data/key_signup.html), then paste it into `YOUR_KEY_HERE` in your `.env` file. An example `.env` file is provided in `.env.example`, remove `.example` from the file name to use.

2. In the `STATE`, `COUNTY`, and `TRACT` macros, replace `STATE_CODE_HERE`, `COUNTY_CODE_HERE`, and `TRACT_CODE_HERE` with their respective codes. If the geocode is 1400000US36061000700, the state code is "36", the county code is "061", and the tract code is "000700". These can be found in the URL when selecting a tract in the US Census Bureau's advanced search [here](https://data.census.gov/advanced), or by inputting an address into the Census Geocoder [here](https://geocoding.geo.census.gov/geocoder/geographies/address?form).

3. Run the script, and the demographic data should appear in your console.