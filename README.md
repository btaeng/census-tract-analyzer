# Census Ethnic Explorer

An advanced geospatial analysis tool that visualizes the ethnic landscape of the United States using 2020 Decennial Census data. This app provides a seamless drill-down experience from the national level down to individual census tracts, featuring custom ethnic ensigns and normalized heatmap analysis.

## Key Features

- **Multi-Level Drill-Down:** Explore data at the state, county, and census tract levels through interactive map clicks.
- **Most Common Ethnicity (MCE) Mapping:** Every geography is color-coded based on its dominant ethnic group, with custom cultural ensigns/flags pinned to each region.
- **Dynamic Heatmap Engine:** Single out any of the 100+ tracked ethnicities to see their concentration across the map. Features local normalization, ensuring that even small populations (e.g., 2% concentration) are visualized with deep color intensity relative to the current view.
- **Intelligent Search:** Synchronized search bars for states, counties, and tracts that update dynamically as you navigate.
- **Detailed Analytics Sidebar:** Instant access to full ethnic breakdowns, including raw population counts and "% Alone" (intra-group identification) statistics.
- **Session Caching:** All Census API data is cached locally during the session for instantaneous back-and-forth navigation.

## Performance & Optimization

- **Zoom-Dependent Visibility:** Flags and shapes automatically despawn when zooming out to maintain a clean, readable map.
- **Deterministic Color Hashing:** Uses a golden-angle HSL hashing algorithm to ensure every ethnicity has a unique, vibrant, and consistent color across refreshes.
- **Hybrid Flag System:** Combines geopolitical flags (via FlagCDN) with custom cultural ensigns for stateless groups (Hmong, Assyrian, etc.) and indigenous nations.

---

## Requirements

- Python 3.9+
- [Flask](https://flask.palletsprojects.com/en/stable/) & [Flask-CORS](https://flask-cors.readthedocs.io/en/latest/)
- [requests](https://requests.readthedocs.io/en/latest/) & [python-dotenv](https://saurabh-kumar.com/python-dotenv/)
- **Frontend:** Leaflet.js, Turf.js (loaded via CDN)

---

## Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/census-ethnic-explorer.git
cd census-ethnic-explorer
```

2. Set up a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

3. Install dependencies:
```bash
pip install Flask flask-cors requests python-dotenv
```

4. Configure API Key:
Create a `.env` file in the root directory:
```
CENSUS_API_KEY=your_census_bureau_key_here
```

5. Data Requirements (GeoJSON):
This app requires specific GeoJSON files in the `static/data/` folder:
- `us-states.geojson`: National state outlines (using `STATEFP`).
- `counties/[STATE_FIPS].geojson`: County outlines for each state.
- `tracts/[COUNTY_GEOID].geojson`: Tract outlines for each county.

---

## Usage

1. Run the app: `python app.py`
2. Navigate: 
- Click a state to see its counties.
- Click a county to see its census tracts.
- Use the back button to return to the previous level.
3. Analyze:
- Hover over any area to see a tag with the name and dominant group.
- Click an area to open the details sidebar.
4. Heatmap:
- Type an ethnicity into the Heatmap Search or click an ethnicity name in the sidebar table to toggle Heatmap Mode.
- Click "Reset to Dominant" to return to the MCE view.

## Note on Connecticut
To maintain geographic consistency, this app utilizes the 2020 Census Vintage. This ensures that Connecticut is mapped using its legacy 8-county system rather than the newer Planning Region system, preventing data mismatches between ACS and Decennial tables.

## License
MIT License. See [LICENSE](LICENSE) for details.