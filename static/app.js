const map = L.map("map").setView([37.8, -96], 4);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const viewStack = ['national']; 
const dataCache = {
  states: null,
  counties: {},
  tracts: {}
};

const stateLayer = L.layerGroup().addTo(map);
const stateFlagLayer = L.layerGroup().addTo(map);
const countyLayer = L.layerGroup().addTo(map);
const countyFlagLayer = L.layerGroup().addTo(map);
const tractLayer = L.layerGroup().addTo(map);
const tractFlagLayer = L.layerGroup().addTo(map);

const colorCache = {};

function handleVisibility() {
  const zoom = map.getZoom();
  const level = viewStack.length;

  const FLAG_THRESHOLD = 5;
  const SHAPE_THRESHOLD = 2;

  if (zoom < FLAG_THRESHOLD) {
    [stateFlagLayer, countyFlagLayer, tractFlagLayer].forEach(l => map.removeLayer(l));
  } else {
    if (level === 1) { map.addLayer(stateFlagLayer); map.removeLayer(countyFlagLayer); map.removeLayer(tractFlagLayer); }
    if (level === 2) { map.addLayer(countyFlagLayer); map.removeLayer(stateFlagLayer); map.removeLayer(tractFlagLayer); }
    if (level === 3) { map.addLayer(tractFlagLayer); map.removeLayer(stateFlagLayer); map.removeLayer(countyFlagLayer); }
  }

  if (zoom < SHAPE_THRESHOLD) {
    [stateLayer, countyLayer, tractLayer].forEach(l => map.removeLayer(l));
  } else {
    if (level === 1) { map.addLayer(stateLayer); map.removeLayer(countyLayer); map.removeLayer(tractLayer); }
    if (level === 2) { map.addLayer(countyLayer); map.removeLayer(stateLayer); map.removeLayer(tractLayer); }
    if (level === 3) { map.addLayer(tractLayer); map.removeLayer(stateLayer); map.removeLayer(countyLayer); }
  }
}

map.on("zoomend", handleVisibility);

function getDynamicColor(label) {
  if (colorCache[label]) return colorCache[label];

  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash * 137.508) % 360; 

  const color = `hsl(${hue}, 75%, 45%)`;
  colorCache[label] = color;
  return color;
}

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
  "Yazidi": "/static/img/ensigns/yazidi.png",
  "Yemeni": "ye",
  "Afrikaner": "/static/img/ensigns/afrikaner.png",
  "Australian": "au",
  "Cajun": "/static/img/ensigns/cajun.png",
  "Canadian": "ca",
  "French Canadian": "/static/img/ensigns/quebec.png",
  "Greenlandic": "gl",
  "New Zealander": "nz",
  "Other White, not specified": "us",
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
  "Nigerian (Nigeria)": "ng",
  "Nigerien (Niger)": "ne",
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
  "Other Black or African American, not specified": "/static/img/ensigns/pan_african.png",
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
  "Chinese, except Taiwanese": "cn",
  "Hmong": "/static/img/ensigns/hmong.png",
  "Japanese": "jp",
  "Korean": "kr",
  "Mongolian": "mn",
  "Okinawan": "/static/img/ensigns/okinawa.png",
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
  "Sikh": "/static/img/ensigns/sikh.png",
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
  "Surinamese": "sr",
  "Native Hawaiian": "us-hi",
  "Fijian": "fj",
  "New Caledonian": "nc",
  "Ni-Vanuatu": "vu",
  "Papua New Guinean": "pg",
  "Solomon Islander": "sb",
  "Guamanian or Chamorro": "gu",
  "I-Kiribati": "ki",
  "Northern Mariana Islander": "mp",
  "Marshallese": "mh",
  "Micronesian": "fm",
  "Nauruan": "nr",
  "Palauan": "pw",
  "Pohnpeian": "pn",
  "Cook Islander": "ck",
  "French Polynesian": "pf",
  "Maori": "/static/img/ensigns/maori.png",
  "Niuean": "nu",
  "Samoan": "ws",
  "Tahitian": "pf",
  "Tokelauan": "tk",
  "Tongan": "to",
  "Tuvaluan": "tv",
  "Wallisian and Futunan": "wf",
  "American Indian": "/static/img/ensigns/indigenous.png",
  "Alaska Native": "us-ak"
}

function getFlagUrl(label) {
  const mapping = flagMap[label] || "us";
  if (mapping.includes("/")) return mapping;
  return `https://flagcdn.com/w80/${mapping}.png`;
}

function updateBackButton() {
  const btn = document.getElementById("backButton");
  btn.style.display = viewStack.length > 1 ? "block" : "none";
}

async function goBack() {
  viewStack.pop();
  const target = viewStack[viewStack.length - 1];

  [stateLayer, stateFlagLayer, countyLayer, countyFlagLayer, tractLayer, tractFlagLayer].forEach(l => l.clearLayers());

  if (target === 'national') {
    initStateMap();
    map.setView([37.8, -96], 4);
  } 
  else if (target.length === 2) {
    loadCountyLevel(target);
  } 
  else if (target.length === 5) {
    const stateFips = target.substring(0, 2);
    const coFips = target.substring(2, 5);
    loadTractLevel(stateFips, coFips);
  }
  
  updateBackButton();
  handleVisibility();
  document.getElementById("infoPanel").classList.add("hidden");
}

document.getElementById("backButton").addEventListener("click", goBack);

async function getCachedData(url, cacheKey, cacheType) {
  if (cacheType === 'states' && dataCache.states) return dataCache.states;
  if (cacheType === 'counties' && dataCache.counties[cacheKey]) return dataCache.counties[cacheKey];
  if (cacheType === 'tracts' && dataCache.tracts[cacheKey]) return dataCache.tracts[cacheKey];

  const resp = await fetch(url);
  const data = await resp.json();

  if (cacheType === 'states') dataCache.states = data;
  if (cacheType === 'counties') dataCache.counties[cacheKey] = data;
  if (cacheType === 'tracts') dataCache.tracts[cacheKey] = data;

  return data;
}

async function initStateMap() {
  try {
    const geoResp = await fetch("/static/data/us-states.geojson");
    const statesGeo = await geoResp.json();
    const mceData = await getCachedData("/api/states-mce", null, 'states');

    L.geoJSON(statesGeo, {
      style: (feature) => {
        const stateFips = feature.properties.STATEFP;
        const stateData = mceData[stateFips]; 
        const winnerLabel = stateData ? stateData.mce : "White";
        return {
          fillColor: getDynamicColor(winnerLabel),
          fillOpacity: 0.6,
          color: "white",
          weight: 1
        };
      },
      onEachFeature: (feature, layer) => {
        const stateFips = feature.properties.STATEFP;
        const stateData = mceData[stateFips];
        if (!stateData) return;

        const center = turf.centroid(feature);
        const [lng, lat] = center.geometry.coordinates;

        const flagIcon = L.divIcon({
          html: `<img src="${getFlagUrl(stateData.mce)}" class="ensign-flag" title="${feature.properties.NAME}: ${stateData.mce}">`,
          className: 'ensign-container'
        });

        L.marker([lat, lng], { icon: flagIcon, interactive: false }).addTo(stateFlagLayer);
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          viewStack.push(stateFips);
          updateBackButton();
          map.fitBounds(e.target.getBounds());
          loadCountyLevel(stateFips);
          showDetails(stateFips, 'state');
        });
      }
    }).addTo(stateLayer);
    handleVisibility();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

async function loadCountyLevel(stateFips) {
  try {
    stateLayer.clearLayers();
    stateFlagLayer.clearLayers();
    
    const geoResp = await fetch(`/static/data/counties/${stateFips}.geojson`);
    const countiesGeo = await geoResp.json();
    const mceData = await getCachedData(`/api/counties-mce?state=${stateFips}`, stateFips, 'counties');

    L.geoJSON(countiesGeo, {
      style: (feature) => {
        const countyData = mceData[feature.properties.COUNTYFP];
        const winnerLabel = countyData ? countyData.mce : "Unknown";
        return { fillColor: getDynamicColor(winnerLabel), fillOpacity: 0.6, color: "white", weight: 0.5 };
      },
      onEachFeature: (feature, layer) => {
        const coFips = feature.properties.COUNTYFP;
        const countyData = mceData[coFips];
        if (!countyData) return;

        const center = turf.centroid(feature);
        const [lng, lat] = center.geometry.coordinates;
        const icon = L.divIcon({
          html: `<img src="${getFlagUrl(countyData.mce)}" class="ensign-flag" style="width:16px;">`,
          className: 'ensign-container'
        });
        L.marker([lat, lng], { icon: icon, interactive: false }).addTo(countyFlagLayer);
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          viewStack.push(stateFips + coFips);
          updateBackButton();
          map.fitBounds(e.target.getBounds());
          loadTractLevel(stateFips, coFips);
          showDetails(coFips, 'county');
        });
      }
    }).addTo(countyLayer);
    handleVisibility();
  } catch (err) {
    console.error("Failed to load counties:", err);
  }
}

async function loadTractLevel(stateFips, coFips) {
  try {
    countyLayer.clearLayers();
    countyFlagLayer.clearLayers();
    
    const geoid = stateFips + coFips;
    const geoResp = await fetch(`/static/data/tracts/${geoid}.geojson`);
    const tractsGeo = await geoResp.json();
    const mceData = await getCachedData(`/api/tracts-mce?state=${stateFips}&county=${coFips}`, geoid, 'tracts');

    L.geoJSON(tractsGeo, {
      style: (f) => {
        const tractData = mceData[f.properties.TRACTCE] || "Unknown";
        const winnerLabel = tractData.mce || "Unknown";
        return { fillColor: getDynamicColor(winnerLabel), fillOpacity: 0.6, color: "white", weight: 0.5 };
      },
      onEachFeature: (f, layer) => {
        const tFips = f.properties.TRACTCE;
        const tractData = mceData[tFips];
        if (!tractData) return;

        const center = turf.centroid(f);
        const [lng, lat] = center.geometry.coordinates;
        L.marker([lat, lng], { 
            icon: L.divIcon({ html: `<img src="${getFlagUrl(tractData.mce)}" class="ensign-flag" style="width:10px;">`, className: 'ensign-container' }),
            interactive: false 
        }).addTo(tractFlagLayer);
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const tractFullID = stateFips + coFips + tFips;
          if (viewStack.length === 4) {
            viewStack[3] = tractFullID;
          } else {
            viewStack.push(tractFullID);
          }
          updateBackButton();
          map.fitBounds(e.target.getBounds());
          showDetails(tFips, 'tract');
        });
      }
    }).addTo(tractLayer);
    handleVisibility();
  } catch (err) {
    console.error("Tract load failed", err);
  }
}

function showDetails(geoId, type) {
    const panel = document.getElementById("infoPanel");
    const content = document.getElementById("statsContent");
    
    let data;
    if (type === 'state') {
      data = dataCache.states[geoId];
    }
    else if (type === 'county') {
      data = dataCache.counties[viewStack[1]][geoId];
    }
    else if (type === 'tract') {
        const parentKey = viewStack[2]; 
        if (dataCache.tracts[parentKey]) {
            data = dataCache.tracts[parentKey][geoId];
        }
    }

    if (!data) {
      console.error(`Data not found for ${type}: ${geoId} in parent ${viewStack[2]}`);
      return;
    }

    panel.classList.remove("hidden");
    content.innerHTML = `
        <h2 style="margin-top:0; font-size:1.2em;">${data.name}</h2>
        <p style="margin-top:-10px; color:#666;">Dominant: ${data.mce}</p>
        <table>
            <thead>
                <tr><th>Group</th><th>Pop</th><th>% Alone</th></tr>
            </thead>
            <tbody>
                ${data.details.map(e => `
                    <tr>
                        <td>${e.label}</td>
                        <td>${e.pop.toLocaleString()}</td>
                        <td>${e.percent_alone}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

initStateMap();

// function renderStats(data) {
//   document.getElementById("title").textContent = `${data.name}`;
//   const stats = document.getElementById("stats");
//   const ageTable = `
//     <table class="sortable">
//       <thead><tr><th>Age Group</th><th>Percent</th></tr></thead>
//       <tbody>
//         ${data.age.map(a => `
//           <tr>
//             <td>${a.label}</td>
//             <td>${a.percent ?? "N/A"}%</td>
//           </tr>`).join("")}
//       </tbody>
//     </table>`;
//   const ethTable = `
//     <table class="sortable">
//       <thead><tr><th>Group</th><th>Population</th><th>% of Total</th><th>% Alone (within group)</th></tr></thead>
//       <tbody>
//         ${data.ethnicity.map(e => `
//           <tr>
//             <td>${e.label}</td>
//             <td>${e.population.toLocaleString()}</td>
//             <td>${e.percent_of_total}%</td>
//             <td>${e.percent_alone_within_group ?? "—"}%</td>
//           </tr>`).join("")}
//       </tbody>
//     </table>`;


//   stats.innerHTML = `
//     <p><strong>Total population:</strong> ${data.total_pop.toLocaleString()}</p>
//     <h3>Age</h3>
//     ${ageTable}
//     <h3>Income</h3>
//     <ul>
//       <li>Mean household income: $${Math.round(data.income.mean_household_income || 0).toLocaleString()}</li>
//       <li>Mean family income: $${Math.round(data.income.mean_family_income || 0).toLocaleString()}</li>
//       <li>Per capita income: $${Math.round(data.income.mean_per_capita_income || 0).toLocaleString()}</li>
//     </ul>
//     <h3>Ethnicity</h3>
//     ${ethTable}
//   `;
// }

// function makeTablesSortable() {
//   document.querySelectorAll("table.sortable th").forEach(th => {
//     th.addEventListener("click", () => {
//       const table = th.closest("table");
//       const tbody = table.querySelector("tbody");
//       const index = Array.from(th.parentNode.children).indexOf(th);
//       const rows = Array.from(tbody.querySelectorAll("tr"));
//       const asc = !th.classList.contains("asc");

//       rows.sort((a, b) => {
//         let av = a.children[index].textContent.replace("%","").replace("—","");
//         let bv = b.children[index].textContent.replace("%","").replace("—","");
//         let na = parseFloat(av); let nb = parseFloat(bv);
//         if (!isNaN(na) && !isNaN(nb)) { return asc ? na - nb : nb - na; }
//         return asc ? av.localeCompare(bv) : bv.localeCompare(av);
//       });

//       rows.forEach(r => tbody.appendChild(r));
//       table.querySelectorAll("th").forEach(th2 => th2.classList.remove("asc","desc"));
//       th.classList.add(asc ? "asc" : "desc");
//     });
//   });
// }

// async function init(newState, newCounty, newTract) {
//   if (newState) { state = newState; county = newCounty; tract = newTract; }
//   const countyGEOID = state + county;
//   const tractGEOID  = state + county + tract;
//   console.log("Looking for GEOID:", tractGEOID);
//   const mapResp = await fetch(`/static/data/tracts/${countyGEOID}.geojson`);
//   const geojson = await mapResp.json();
//   const tractLayer = L.geoJSON(geojson, {
//     filter: f => f.properties.GEOID === tractGEOID,
//     style: { weight: 2, color: "blue", fillOpacity: 0.3 }
//   }).addTo(map);
//   if (tractLayer.getLayers().length > 0) {
//     map.fitBounds(tractLayer.getBounds(), { padding: [20,20] });
//   }
//   const apiResp = await fetch(`/api/tract?state=${state}&county=${county}&tract=${tract}`);
//   const data = await apiResp.json();
//   renderStats(data);
//   makeTablesSortable();
// }

// document.getElementById("tractForm").addEventListener("submit", ev => {
//   ev.preventDefault();
//   const s = document.getElementById("stateInput").value.trim();
//   const c = document.getElementById("countyInput").value.trim();
//   const t = document.getElementById("tractInput").value.trim();
//   if (s && c && t) {
//     map.eachLayer(l => { if (l instanceof L.GeoJSON) map.removeLayer(l); });
//     init(s, c, t);
//   }
// });

// init();