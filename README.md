# Census Ethnic Explorer

An advanced geospatial analysis tool that visualizes the ethnic landscape of the United States using 2020 Decennial Census data. This app provides a seamless drill-down experience from the national level down to individual census tracts, featuring custom ethnic ensigns and normalized heatmap analysis.

**Note:** This application comes pre-loaded with a local SQLite database containing processed Census data, allowing for near-instant loading times and offline functionality.

## Key Features

- **Instant Performance:** No API calls required during navigation; data is queried from a local 180MB SQLite database.
- **Multi-Level Drill-Down:** Explore data at the state, county, and census tract levels through interactive map clicks.
- **Most Common Ethnicity (MCE) Mapping:** Every geography is color-coded based on its dominant ethnic group, with custom cultural ensigns/flags pinned to each region.
- **Dynamic Heatmap Engine:** Single out any of the 100+ tracked ethnicities to see their concentration across the map. Features local normalization, ensuring that even small populations (e.g., 2% concentration) are visualized with deep color intensity relative to the current view.
- **Intelligent Search:** Synchronized search bars for states, counties, and tracts that update dynamically as you navigate.
- **Detailed Analytics Sidebar:** Instant access to full ethnic breakdowns, including raw population counts and "% Alone" (intra-group identification) statistics.

## Performance & Optimization

- **Zoom-Dependent Visibility:** Flags and shapes automatically despawn when zooming out to maintain a clean, readable map.
- **Deterministic Color Hashing:** Uses a golden-angle HSL hashing algorithm to ensure every ethnicity has a unique, vibrant, and consistent color across refreshes.
- **Hybrid Flag System:** Combines geopolitical flags (via FlagCDN) with custom cultural ensigns for stateless groups (Hmong, Assyrian, etc.) and indigenous nations.

---

## Requirements

- Python 3.9+
- [Flask](https://flask.palletsprojects.com/en/stable/) & [Flask-CORS](https://flask-cors.readthedocs.io/en/latest/)
- **Frontend:** Leaflet.js, Turf.js (loaded via CDN)
- **Git LFS:** Required to download the pre-built census database.

---

## Installation & Setup

1. Install Git LFS (if not already installed):
Follow instructions at [git-lfs.com](https://git-lfs.com/).

2. Clone the repository:
```bash
git clone https://github.com/your-username/census-tract-analyzer.git
cd census-tract-analyzer
```

3. Set up a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

4. Install dependencies:
```bash
pip install Flask flask-cors
```

5. Data Requirements:
This app requires specific files in the project root and `static/data/` folders:
- `static/data/us-states.geojson`: National state outlines (using `STATEFP`).
- `static/data/counties/[STATE_FIPS].geojson`: County outlines for each state.
- `static/data/tracts/[COUNTY_GEOID].geojson`: Tract outlines for each county.
- `census_data.db`: A SQLite database containing MCE and detailed ethnic population data for every state, county, and tract in the US.

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