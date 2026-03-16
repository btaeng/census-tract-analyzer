import sqlite3
conn = sqlite3.connect("census_data.db")
# Index on geoid makes sidebar loading instant
conn.execute("CREATE INDEX IF NOT EXISTS idx_geoid ON details(geoid)")
# Index on label makes Heatmap normalization much faster
conn.execute("CREATE INDEX IF NOT EXISTS idx_label ON details(label)")
conn.commit()
conn.close()