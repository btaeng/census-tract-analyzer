const params = new URLSearchParams(window.location.search);
let state = params.get("state")  || "06";   // California
let county = params.get("county")|| "001";  // Alameda
let tract = params.get("tract")  || "450200";

const countyGEOID = state + county;
const tractGEOID  = state + county + tract;
console.log("Looking for GEOID:", tractGEOID);

const map = L.map("map");
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function renderStats(data) {
  document.getElementById("title").textContent = `${data.name}`;
  const stats = document.getElementById("stats");
  const ageTable = `
    <table class="sortable">
      <thead><tr><th>Age Group</th><th>Percent</th></tr></thead>
      <tbody>
        ${data.age.map(a => `
          <tr>
            <td>${a.label}</td>
            <td>${a.percent ?? "N/A"}%</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
  const ethTable = `
    <table class="sortable">
      <thead><tr><th>Group</th><th>Population</th><th>% of Total</th><th>% Alone (within group)</th></tr></thead>
      <tbody>
        ${data.ethnicity.map(e => `
          <tr>
            <td>${e.label}</td>
            <td>${e.population.toLocaleString()}</td>
            <td>${e.percent_of_total}%</td>
            <td>${e.percent_alone_within_group ?? "—"}%</td>
          </tr>`).join("")}
      </tbody>
    </table>`;


  stats.innerHTML = `
    <p><strong>Total population:</strong> ${data.total_pop.toLocaleString()}</p>
    <h3>Age</h3>
    ${ageTable}
    <h3>Income</h3>
    <ul>
      <li>Mean household income: $${Math.round(data.income.mean_household_income || 0).toLocaleString()}</li>
      <li>Mean family income: $${Math.round(data.income.mean_family_income || 0).toLocaleString()}</li>
      <li>Per capita income: $${Math.round(data.income.mean_per_capita_income || 0).toLocaleString()}</li>
    </ul>
    <h3>Ethnicity</h3>
    ${ethTable}
  `;
}

function makeTablesSortable() {
  document.querySelectorAll("table.sortable th").forEach(th => {
    th.addEventListener("click", () => {
      const table = th.closest("table");
      const tbody = table.querySelector("tbody");
      const index = Array.from(th.parentNode.children).indexOf(th);
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const asc = !th.classList.contains("asc");

      rows.sort((a, b) => {
        let av = a.children[index].textContent.replace("%","").replace("—","");
        let bv = b.children[index].textContent.replace("%","").replace("—","");
        let na = parseFloat(av); let nb = parseFloat(bv);
        if (!isNaN(na) && !isNaN(nb)) { return asc ? na - nb : nb - na; }
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });

      rows.forEach(r => tbody.appendChild(r));
      table.querySelectorAll("th").forEach(th2 => th2.classList.remove("asc","desc"));
      th.classList.add(asc ? "asc" : "desc");
    });
  });
}

async function init(newState, newCounty, newTract) {
  if (newState) { state = newState; county = newCounty; tract = newTract; }
  const countyGEOID = state + county;
  const tractGEOID  = state + county + tract;
  console.log("Looking for GEOID:", tractGEOID);
  const mapResp = await fetch(`/static/data/counties/${countyGEOID}.geojson`);
  const geojson = await mapResp.json();
  const tractLayer = L.geoJSON(geojson, {
    filter: f => f.properties.GEOID === tractGEOID,
    style: { weight: 2, color: "blue", fillOpacity: 0.3 }
  }).addTo(map);
  if (tractLayer.getLayers().length > 0) {
    map.fitBounds(tractLayer.getBounds(), { padding: [20,20] });
  }
  const apiResp = await fetch(`/api/tract?state=${state}&county=${county}&tract=${tract}`);
  const data = await apiResp.json();
  renderStats(data);
  makeTablesSortable();
}

document.getElementById("tractForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const s = document.getElementById("stateInput").value.trim();
  const c = document.getElementById("countyInput").value.trim();
  const t = document.getElementById("tractInput").value.trim();
  if (s && c && t) {
    map.eachLayer(l => { if (l instanceof L.GeoJSON) map.removeLayer(l); });
    init(s, c, t);
  }
});

init();