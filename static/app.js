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

const flagMap = {
  "Albanian": "al",
  "Alsatian": "/static/img/ensigns/alsace.png",
  "Andorran": "ad",
  "Armenian": "am",
  "Austrian": "at",
  "Azerbaijani": "az",
  "Basque": "/static/img/ensigns/basque.png",
  "Belarusian": "by",
  "Belgian": "be",
  "Bosnian and Herzegovinian": "ba",
  "British": "gb",
  "Bulgarian": "bg",
  "Carpatho Rusyn": "/static/img/ensigns/rusyn.png",
  "Celtic": "/static/img/ensigns/celtic.png",
  "Cornish": "/static/img/ensigns/cornwall.png",
  "Croatian": "hr",
  "Cypriot": "cy",
  "Czech": "cz",
  "Danish": "dk",
  "Dutch": "nl",
  "English": "gb-eng",
  "Estonian": "ee",
  "Faroe Islander": "fo",
  "Finnish": "fi",
  "French": "fr",
  "Frisian": "/static/img/ensigns/frisian.png",
  "Georgian": "ge",
  "German": "de",
  "Greek": "gr",
  "Hungarian": "hu",
  "Icelandic": "is",
  "Irish": "ie",
  "Italian": "it",
  "Kosovan": "xk",
  "Lapp": "/static/img/ensigns/lapp.png",
  "Latvian": "lv",
  "Liechtensteiner": "li",
  "Lithuanian": "lt",
  "Luxembourger": "lu",
  "Macedonian": "mk",
  "Maltese": "mt",
  "Manx": "/static/img/ensigns/manx.png",
  "Moldovan": "md",
  "Monegasque": "mc",
  "Montenegrin": "me",
  "Northern Irish": "gb-nir",
  "Norwegian": "no",
  "Polish": "pl",
  "Portuguese": "pt",
  "Roma": "/static/img/ensigns/roma.png",
  "Romanian": "ro",
  "Russian": "ru",
  "Scottish": "gb-sct",
  "Serbian": "rs",
  "Slovak": "sk",
  "Slovenian": "si",
  "Swedish": "se",
  "Swiss": "ch",
  "Tatar": "/static/img/ensigns/tatar.png",
  "Turkish": "tr",
  "Ukrainian": "ua",
  "Welsh": "gb-wls",
  "Algerian": "dz",
  "Arab": "/static/img/ensigns/arab.png",
  "Assyrian": "/static/img/ensigns/assyria.png",
  "Bahraini": "bh",
  "Berber": "/static/img/ensigns/berber.png",
  "Chaldean": "/static/img/ensigns/chaldea.png",
  "Egyptian": "eg",
  "Emirati": "ae",
  "Iranian": "ir",
  "Iraqi": "iq",
  "Israeli": "il",
  "Jordanian": "jo",
  "Kurdish": "/static/img/ensigns/kurdistan.png",
  "Kuwaiti": "kw",
  "Lebanese": "lb",
  "Libyan": "ly",
  "Moroccan": "ma",
  "Omani": "om",
  "Palestinian": "ps",
  "Qatari": "qa",
  "Saudi": "sa",
  "Syriac": "/static/img/ensigns/syriac.png",
  "Syrian": "sy",
  "Tunisian": "tn",
  "Yemeni": "ye",
  "Australian": "au",
  "Canadian": "ca",
  "Greenlandic": "gl",
  "New Zealander": "nz",
  "Other White": "us",
  "Angolan": "ao",
  "Beninese": "bj",
  "Bissau-Guinean": "gw",
  "Burkinabe": "bf",
  "Burundian": "bi",
  "Cameroonian": "cm",
  "Central African": "cf",
  "Chadian": "td",
  "Congolese": "cd",
  "Djiboutian": "dj",
  "Equatorial Guinean": "gq",
  "Eritrean": "er",
  "Ethiopian": "et",
  "Gabonese": "ga",
  "Gambian": "gm",
  "Ghanaian": "gh",
  "Guinean": "gn",
  "Ivoirian": "ci",
  "Kenyan": "ke",
  "Liberian": "lr",
  "Malagasy": "mg",
  "Malawian": "mw",
  "Malian": "ml",
  "Motswana": "bw",
  "Mozambican": "mz",
  "Namibian": "na",
  "Nigerian": "ng",
  "Nigerien": "ne",
  "Rwandan": "rw",
  "Senegalese": "sn",
  "Sierra Leonean": "sl",
  "Somali": "so",
  "South African": "za",
  "South Sudanese": "ss",
  "Sudanese": "sd",
  "Swazi": "sz",
  "Tanzanian": "tz",
  "Togolese": "tg",
  "Ugandan": "ug",
  "Zambian": "zm",
  "Zimbabwean": "zw",
  "Anguillan": "ai",
  "Antiguan and Barbudan": "ag",
  "Bahamian": "bs",
  "Barbadian": "bb",
  "British Virgin Islander": "vg",
  "Dominica Islander": "dm",
  "Grenadian": "gd",
  "Haitian": "ht",
  "Jamaican": "jm",
  "Kittitian and Nevisian": "kn",
  "Montserratian": "ms",
  "St. Lucian": "lc",
  "Trinidadian and Tobagonian": "tt",
  "U.S. Virgin Islander": "vi",
  "Vincentian": "vc",
  "Other Black": "/static/img/ensigns/pan_african.png",
  "Mexican": "mx",
  "Costa Rican": "cr",
  "Guatemalan": "gt",
  "Honduran": "hn",
  "Nicaraguan": "ni",
  "Panamanian": "pa",
  "Salvadoran": "sv",
  "Cuban": "cu",
  "Dominican": "do",
  "Puerto Rican": "pr",
  "Argentinean": "ar",
  "Bolivian": "bo",
  "Chilean": "cl",
  "Colombian": "co",
  "Ecuadorian": "ec",
  "Paraguayan": "py",
  "Peruvian": "pe",
  "Uruguayan": "uy",
  "Venezuelan": "ve",
  "Spaniard": "es",
  "Chinese": "cn",
  "Japanese": "jp",
  "Korean": "kr",
  "Mongolian": "mn",
  "Taiwanese": "tw",
  "Bruneian": "bn",
  "Burmese": "mm",
  "Cambodian": "kh",
  "Filipino": "ph",
  "Indonesian": "id",
  "Laotian": "la",
  "Malaysian": "my",
  "Singaporean": "sg",
  "Thai": "th",
  "Timorese": "tl",
  "Vietnamese": "vn",
  "Asian Indian": "in",
  "Bangladeshi": "bd",
  "Bhutanese": "bt",
  "Maldivian": "mv",
  "Nepalese": "np",
  "Pakistani": "pk",
  "Sri Lankan": "lk",
  "Afghan": "af",
  "Kazakh": "kz",
  "Kyrgyz": "kg",
  "Tajik": "tj",
  "Turkmen": "tm",
  "Uzbek": "uz",
  "Aruban": "aw",
  "Belizean": "bz",
  "Bermudan": "bm",
  "Brazilian": "br",
  "Cabo Verdean": "cv",
  "Cayman Islander": "ky",
  "Comorian": "km",
  "Guyanese": "gy",
  "Mauritanian": "mr",
  "Surinamese": "sr"
}

function getFlagUrl(label) {
  const mapping = flagMap[label];
  if (!mapping) return "/static/img/ensigns/unknown.png";
  if (mapping.includes("/") || mapping.includes("http")) {
    return mapping;
  }
  return `https://flagcdn.com/w80/${mapping}.png`;
}

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