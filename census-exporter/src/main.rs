use rusqlite::{Connection, Result, params};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
struct EthnicDetail {
    label: String,
    pop: i32,
    percent_alone: f64,
    percent_of_geo: f64,
}

#[derive(Serialize)]
struct GeoRecord {
    name: String,
    mce: String,
    total_geo_pop: i32,
    details: Vec<EthnicDetail>,
}

fn main() -> Result<()> {
    let conn = Connection::open("census_data.db")?;

    fs::create_dir_all("docs/api/counties").expect("Failed to create counties dir");
    fs::create_dir_all("docs/api/tracts").expect("Failed to create tracts dir");

    println!("Exporting States...");
    export_states(&conn)?;

    println!("Exporting Counties...");
    export_by_level(&conn, "state", "county", "docs/api/counties")?;

    println!("Exporting Tracts...");
    export_by_level(&conn, "county", "tract", "docs/api/tracts")?;

    println!("Static API Generation Complete!");
    Ok(())
}

fn get_details(conn: &Connection, geoid: &str) -> Result<Vec<EthnicDetail>> {
    let mut stmt = conn.prepare(
        "SELECT label, pop, percent_alone, percent_of_geo FROM details WHERE geoid = ? ORDER BY pop DESC"
    )?;
    
    let details = stmt.query_map(params![geoid], |row| {
        Ok(EthnicDetail {
            label: row.get(0)?,
            pop: row.get(1)?,
            percent_alone: row.get(2)?,
            percent_of_geo: row.get(3)?,
        })
    })?;

    let mut result = Vec::new();
    for detail in details {
        result.push(detail?);
    }
    Ok(result)
}

fn export_states(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("SELECT geoid, name, mce, total_pop FROM geographies WHERE level = 'state'")?;
    let mut states_map = HashMap::new();

    let rows = stmt.query_map([], |row| {
        let geoid: String = row.get(0)?;
        Ok((geoid, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, i32>(3)?))
    })?;

    for row in rows {
        let (geoid, name, mce, total_pop) = row?;
        let details = get_details(conn, &geoid)?;
        states_map.insert(geoid, GeoRecord { name, mce, total_geo_pop: total_pop, details });
    }

    let json = serde_json::to_string(&states_map).unwrap();
    fs::write("docs/api/states.json", json).expect("Unable to write states.json");
    Ok(())
}

fn export_by_level(conn: &Connection, parent_level: &str, child_level: &str, output_dir: &str) -> Result<()> {
    let mut stmt = conn.prepare(&format!("SELECT geoid FROM geographies WHERE level = '{}'", parent_level))?;
    let parents: Vec<String> = stmt.query_map([], |row| row.get(0))?
        .map(|r| r.unwrap())
        .collect();

    for parent_id in parents {
        let mut child_map = HashMap::new();
        
        let mut stmt = conn.prepare(&format!(
            "SELECT geoid, name, mce, total_pop FROM geographies WHERE level = '{}' AND geoid LIKE ?", 
            child_level
        ))?;
        
        let rows = stmt.query_map(params![format!("{}%", parent_id)], |row| {
            let geoid: String = row.get(0)?;
            Ok((geoid, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, i32>(3)?))
        })?;

        for row in rows {
            let (geoid, name, mce, total_pop) = row?;
            let details = get_details(conn, &geoid)?;
            child_map.insert(geoid, GeoRecord { name, mce, total_geo_pop: total_pop, details });
        }

        if !child_map.is_empty() {
            let json = serde_json::to_string(&child_map).unwrap();
            let path = format!("{}/{}.json", output_dir, parent_id);
            fs::write(path, json).expect("Unable to write file");
        }
    }
    Ok(())
}