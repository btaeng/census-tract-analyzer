# split_counties.py
import geopandas as gpd
import os

INPUT = "all_counties.geojson"
OUTPUT_DIR = "static/data/counties"

os.makedirs(OUTPUT_DIR, exist_ok=True)

gdf = gpd.read_file(INPUT)

assert "STATEFP" in gdf.columns

for statefp, group in gdf.groupby("STATEFP"):
    out_path = os.path.join(OUTPUT_DIR, f"{statefp}.geojson")
    group.to_file(out_path, driver="GeoJSON")
    print(f"Wrote {out_path} with {len(group)} counties")