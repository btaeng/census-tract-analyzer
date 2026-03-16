# Census Ethnic Explorer

**Live Demo:** [btaeng.github.io/census-tract-analyzer/](https://btaeng.github.io/census-tract-analyzer/)

An advanced geospatial analysis tool that visualizes the ethnic landscape of the United States using 2020 Decennial Census data. This application provides a seamless, high-performance drill-down experience from the national level down to 84,000+ individual census tracts.

## Architecture

Originally built as a live-query Flask application, the project was re-engineered for zero-latency performance and serverless hosting.

1. **Harvesting:** A custom Python ETL pipeline (`tools/harvester.py`) scrapes 180MB of raw data from the US Census Bureau DDHCA and PL tables.
2. **Processing:** Data is cleaned, normalized, and stored in a locally indexed SQLite database.
3. **Static API Generation:** To bypass the 60-second latency of the official Census API, the database was pre-rendered into a Static JSON API structure (`api/states.json`, `api/counties/*.json`, etc).
4. **Deployment:** The entire platform is hosted via GitHub Pages, reducing data retrieval times from 60s to <100ms.

## Key Features

- **Multi-Level Drill-Down:** Explore data at the state, county, and census tract levels through interactive map clicks.
- **Most Common Ethnicity (MCE) Mapping:** Every geography is color-coded based on its dominant ethnic group, with custom cultural ensigns/flags pinned to each region.
- **Dynamic Heatmap Engine:** Single out any of the 100+ tracked ethnicities to see their concentration across the map. Features local normalization, ensuring that even small populations (e.g., 2% concentration) are visualized with deep color intensity relative to the current view.
- **Intelligent Search:** Synchronized search bars for states, counties, and tracts that update dynamically as you navigate.
- **Detailed Analytics Sidebar:** Instant access to full ethnic breakdowns, including raw population counts and "% Alone" (intra-group identification) statistics.

## Performance & Optimization

- **Zoom-Dependent Visibility:** Flags and shapes automatically despawn when zooming out to maintain a clean, readable map.
- **Deterministic Color Hashing:** Uses a golden-angle HSL hashing algorithm to ensure every ethnicity has a unique, vibrant, and consistent color across refreshes.
- **Spatial Utilities:** Leverages Turf.js for client-side geometric calculations and Leaflet.js for high-performance rendering.

---

## Project Structure

- `docs/`: The production-ready website (hosted on GitHub Pages). Contains the HTML/JS/CSS and the static JSON API.
- `tools/`: The Python engineering suite used for data harvesting and transformation.
- `census_data.db`: The source SQLite database (stored via Git LFS).
- `static/data/`: Hierarchical GeoJSON shapes for all US geographies.

---

## Local Development

To run the Python pipeline or modify the data:

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

4. Data tools:
- `python tools/harvester.py`: Scrape new data from Census API.
- `python tools/convert_to_static.py`: Re-generate the static JSON API files.

## Note on Connecticut
To maintain geographic consistency, this app utilizes the 2020 Census Vintage. This ensures that Connecticut is mapped using its legacy 8-county system rather than the newer Planning Region system, preventing data mismatches between ACS and Decennial tables.

## License
MIT License. See [LICENSE](LICENSE) for details.