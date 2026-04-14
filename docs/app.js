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

let viewMode = 'mce';
let targetEthnicity = null;

function getFeatureStyle(feature, level) {
    const props = feature.properties;
    let id;
    let data;

    if (level === 1) {
        id = props.STATEFP;
        data = dataCache.states[id];
    } else if (level === 2) {
        id = viewStack[1] + props.COUNTYFP;
        data = dataCache.counties[viewStack[1]] ? dataCache.counties[viewStack[1]][id] : null;
    } else if (level === 3) {
        id = viewStack[2] + props.TRACTCE;
        data = dataCache.tracts[viewStack[2]] ? dataCache.tracts[viewStack[2]][id] : null;
    }

    if (!data) return { fillOpacity: 0, weight: 0 };

    if (viewMode === 'heatmap' && targetEthnicity) {
        const match = data.details.find(e => e.label === targetEthnicity);
        const pct = match ? match.percent_of_geo : 0;
        return {
            fillColor: getHeatColor(targetEthnicity, pct),
            fillOpacity: 0.85,
            color: "white",
            weight: 0.5
        };
    } else {
        return {
            fillColor: getDynamicColor(data.mce),
            fillOpacity: 0.6,
            color: "white",
            weight: level === 3 ? 0.3 : 1
        };
    }
}

let currentMaxPct = 0;

function getHeatColor(label, percentage) {
    const baseColor = getDynamicColor(label);
    const hue = baseColor.match(/\d+/)[0];
    const ratio = currentMaxPct > 0 ? (percentage / currentMaxPct) : 0;
    const lightness = 95 - (ratio * 65); 
    
    return `hsl(${hue}, 85%, ${lightness}%)`;
}

function clearAllLayers() {
  [stateLayer, stateFlagLayer, countyLayer, countyFlagLayer, tractLayer, tractFlagLayer].forEach(l => l.clearLayers());
}

function fillDatalist(listId, dataMap) {
  const list = document.getElementById(listId);
  list.innerHTML = "";
  const sorted = Object.entries(dataMap).sort((a, b) => a[1].name.localeCompare(b[1].name));
  
  sorted.forEach(([id, obj]) => {
    const opt = document.createElement("option");
    opt.value = obj.name;
    opt.dataset.id = id;
    list.appendChild(opt);
  });
}

function findAndZoom(layerGroup, propertyName, targetValue) {
  layerGroup.eachLayer(item => {
    if (item.eachLayer) {
      item.eachLayer(layer => {
        if (layer.feature && layer.feature.properties[propertyName] === targetValue) {
          map.fitBounds(layer.getBounds());
        }
      });
    } else if (item.feature && item.feature.properties[propertyName] === targetValue) {
      map.fitBounds(item.getBounds());
    }
  });
}

document.getElementById("stateSearch").addEventListener("input", async (e) => {
  const val = e.target.value;
  const list = document.getElementById("stateList");
  const opt = Array.from(list.options).find(o => o.value === val);

  if (opt) {
    const fips = opt.dataset.id;

    clearAllLayers();
    viewStack.length = 0;
    viewStack.push('national', fips);

    await loadCountyLevel(fips);
    
    syncSearchUI();
    updateBackButton();
    showDetails(fips, 'state');
  }
});

document.getElementById("countySearch").addEventListener("input", async (e) => {
  const val = e.target.value;
  const list = document.getElementById("countyList");
  const opt = Array.from(list.options).find(o => o.value === val);

  if (opt) {
    const coFips = opt.dataset.id;
    const stFips = coFips.substring(0, 2);
    
    viewStack.length = 0;
    viewStack.push('national', stFips, coFips);

    await loadTractLevel(coFips);
    
    syncSearchUI();
    updateBackButton();
    showDetails(coFips, 'county');
  }
});

document.getElementById("tractSearch").addEventListener("input", (e) => {
  const val = e.target.value;
  const list = document.getElementById("tractList");
  const opt = Array.from(list.options).find(o => o.value === val);

  if (opt) {
    const tFips = opt.dataset.id;
    const tShortFips = tFips.slice(-6);

    // Update stack
    if (viewStack.length === 4) viewStack[3] = tFips;
    else viewStack.push(tFips);

    // Zoom to existing shape
    findAndZoom(tractLayer, "TRACTCE", tShortFips);

    showDetails(tFips, 'tract');
    syncSearchUI();
  }
});

function handleVisibility() {
  const zoom = map.getZoom();
  const level = viewStack.length;

  const FLAG_THRESHOLD = 5;
  const SHAPE_THRESHOLD = 2;

  if (viewMode === 'heatmap' || zoom < FLAG_THRESHOLD) {
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
  "Alsatian": "static/img/ensigns/alsace.png",
  "Andorran": "ad",
  "Armenian": "am",
  "Austrian": "at",
  "Azerbaijani": "az",
  "Basque": "static/img/ensigns/basque.png",
  "Belarusian": "by",
  "Belgian": "be",
  "Bosnian and Herzegovinian": "ba",
  "British": "gb",
  "Bulgarian": "bg",
  "Carpatho Rusyn": "static/img/ensigns/rusyn.png",
  "Celtic": "static/img/ensigns/celtic.png",
  "Cornish": "static/img/ensigns/cornwall.png",
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
  "Frisian": "static/img/ensigns/frisian.png",
  "Georgian": "ge",
  "German": "de",
  "Greek": "gr",
  "Hungarian": "hu",
  "Icelandic": "is",
  "Irish": "ie",
  "Italian": "it",
  "Kosovan": "xk",
  "Lapp": "static/img/ensigns/lapp.png",
  "Latvian": "lv",
  "Liechtensteiner": "li",
  "Lithuanian": "lt",
  "Luxembourger": "lu",
  "Macedonian": "mk",
  "Maltese": "mt",
  "Manx": "static/img/ensigns/manx.png",
  "Moldovan": "md",
  "Monegasque": "mc",
  "Montenegrin": "me",
  "Northern Irish": "gb-nir",
  "Norwegian": "no",
  "Polish": "pl",
  "Portuguese": "pt",
  "Roma": "static/img/ensigns/roma.png",
  "Romanian": "ro",
  "Russian": "ru",
  "Scottish": "gb-sct",
  "Serbian": "rs",
  "Slovak": "sk",
  "Slovenian": "si",
  "Swedish": "se",
  "Swiss": "ch",
  "Tatar": "static/img/ensigns/tatar.png",
  "Turkish": "tr",
  "Ukrainian": "ua",
  "Welsh": "gb-wls",
  "Algerian": "dz",
  "Arab": "static/img/ensigns/arab.png",
  "Assyrian": "static/img/ensigns/assyria.png",
  "Bahraini": "bh",
  "Berber": "static/img/ensigns/berber.png",
  "Chaldean": "static/img/ensigns/chaldea.png",
  "Egyptian": "eg",
  "Emirati": "ae",
  "Iranian": "ir",
  "Iraqi": "iq",
  "Israeli": "il",
  "Jordanian": "jo",
  "Kurdish": "static/img/ensigns/kurdistan.png",
  "Kuwaiti": "kw",
  "Lebanese": "lb",
  "Libyan": "ly",
  "Moroccan": "ma",
  "Omani": "om",
  "Palestinian": "ps",
  "Qatari": "qa",
  "Saudi": "sa",
  "Syriac": "static/img/ensigns/syriac.png",
  "Syrian": "sy",
  "Tunisian": "tn",
  "Yazidi": "static/img/ensigns/yazidi.png",
  "Yemeni": "ye",
  "Afrikaner": "static/img/ensigns/afrikaner.png",
  "Australian": "au",
  "Cajun": "static/img/ensigns/cajun.png",
  "Canadian": "ca",
  "French Canadian": "static/img/ensigns/quebec.png",
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
  "Other Black or African American, not specified": "static/img/ensigns/pan_african.png",
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
  "Hmong": "static/img/ensigns/hmong.png",
  "Japanese": "jp",
  "Korean": "kr",
  "Mongolian": "mn",
  "Okinawan": "static/img/ensigns/okinawa.png",
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
  "Sikh": "static/img/ensigns/sikh.png",
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
  "Maori": "static/img/ensigns/maori.png",
  "Niuean": "nu",
  "Samoan": "ws",
  "Tahitian": "pf",
  "Tokelauan": "tk",
  "Tongan": "to",
  "Tuvaluan": "tv",
  "Wallisian and Futunan": "wf",
  "American Indian": "static/img/ensigns/indigenous.png",
  "American Indian and Alaska Native, not specified": "static/img/ensigns/indigenous.png",
  "American Indian, not specified": "static/img/ensigns/indigenous.png",
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

function syncSearchUI() {
  const sIn = document.getElementById("stateSearch");
  const cIn = document.getElementById("countySearch");
  const tIn = document.getElementById("tractSearch");
  const level = viewStack.length;

  if (level === 1) {
    sIn.value = "";
    cIn.value = ""; cIn.disabled = true; cIn.placeholder = "Select a state first...";
    tIn.value = ""; tIn.disabled = true; tIn.placeholder = "Select a county first...";
  } else if (level === 2) {
    const stateFips = viewStack[1];
    const stateData = dataCache.states[stateFips];
    sIn.value = stateData ? stateData.name : stateFips;
    cIn.value = ""; cIn.disabled = false; cIn.placeholder = "Search County...";
    tIn.value = ""; tIn.disabled = true; tIn.placeholder = "Select a county first...";
  } else if (level === 3) {
    const stateFips = viewStack[1];
    const countyFullFips = viewStack[2];
    const stateData = dataCache.states[stateFips];
    const countyData = dataCache.counties[stateFips] ? dataCache.counties[stateFips][countyFullFips] : null;
    
    sIn.value = stateData ? stateData.name : stateFips;
    cIn.value = countyData ? countyData.name : countyFullFips;
    
    cIn.disabled = false;
    tIn.value = ""; tIn.disabled = false; tIn.placeholder = "Search Tract...";
  } else if (level === 4) {
    const stateFips = viewStack[1];
    const countyFullFips = viewStack[2];
    const tractFullFips = viewStack[3];

    const stateData = dataCache.states[stateFips];
    const countyData = dataCache.counties[stateFips] ? dataCache.counties[stateFips][countyFullFips] : null;
    const tractData = dataCache.tracts[countyFullFips] ? dataCache.tracts[countyFullFips][tractFullFips] : null;

    sIn.value = stateData ? stateData.name : stateFips;
    cIn.value = countyData ? countyData.name : countyFullFips;
    tIn.value = tractData ? tractData.name : tractFullFips;

    cIn.disabled = false;
    tIn.disabled = false;
  }
}

async function goBack() {
  viewStack.pop();
  const target = viewStack[viewStack.length - 1];

  [stateLayer, stateFlagLayer, countyLayer, countyFlagLayer, tractLayer, tractFlagLayer].forEach(l => l.clearLayers());

  if (target === 'national') {
    initStateMap();
    map.setView([37.8, -96], 4);
  } else if (target.length === 2) {
    await loadCountyLevel(target);
  } else if (target.length === 5) {
    const stateFips = target.substring(0, 2);
    const coFips = target.substring(2, 5);
    await loadTractLevel(coFips);
  }
  
  updateBackButton();
  handleVisibility();
  syncSearchUI();
  
  if (target === 'national') {
    document.getElementById("infoPanel").classList.add("hidden");
  } else if (target.length === 2) {
    showDetails(target, 'state');
  } else if (target.length === 5) {
    showDetails(target, 'county');
  }
}

document.getElementById("backButton").addEventListener("click", goBack);

async function getCachedData(endpoint, cacheKey, cacheType) {
  if (cacheType === 'states' && dataCache.states) return dataCache.states;
  if (cacheType === 'counties' && dataCache.counties[cacheKey]) return dataCache.counties[cacheKey];
  if (cacheType === 'tracts' && dataCache.tracts[cacheKey]) return dataCache.tracts[cacheKey];

  let localPath = "";
  if (cacheType === 'states') localPath = "api/states.json";
  if (cacheType === 'counties') localPath = `api/counties/${cacheKey}.json`;
  if (cacheType === 'tracts') localPath = `api/tracts/${cacheKey}.json`;

  const resp = await fetch(localPath);
  const data = await resp.json();

  if (cacheType === 'states') dataCache.states = data;
  if (cacheType === 'counties') dataCache.counties[cacheKey] = data;
  if (cacheType === 'tracts') dataCache.tracts[cacheKey] = data;

  return data;
}

function updateEthnicityList(detailsArray) {
    const list = document.getElementById("ethList");
    const uniqueEthnicities = new Set();
    
    detailsArray.forEach(geoEntry => {
        if (geoEntry.details) {
            geoEntry.details.forEach(group => uniqueEthnicities.add(group.label));
        }
    });

    list.innerHTML = "";
    Array.from(uniqueEthnicities).sort().forEach(eth => {
        const opt = document.createElement("option");
        opt.value = eth;
        list.appendChild(opt);
    });
}

async function initStateMap() {
  try {
    const geoResp = await fetch("static/data/us-states.geojson");
    const statesGeo = await geoResp.json();
    const mceData = await getCachedData("/api/states-mce", null, 'states');
    fillDatalist("stateList", mceData);
    updateEthnicityList(Object.values(mceData));

    const geojson = L.geoJSON(statesGeo, {
      style: (feature) => getFeatureStyle(feature, 1),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.NAME;
        const stateFips = feature.properties.STATEFP;
        const stateData = mceData[stateFips];
        layer.bindTooltip(`${name || 'Tract '+feature.properties.TRACTCE} (${stateData.mce})`, {
          sticky: true,
          direction: 'top',
          className: 'geo-tooltip'
        });
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
        layer.on('mouseover', function (e) {
          this.setStyle({
            weight: 3,
            color: '#00ffff',
            fillOpacity: 0.8
          });
          this.bringToFront();
        });
        layer.on('mouseout', function (e) {
          geojson.resetStyle(this);
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

    const geoResp = await fetch(`static/data/counties/${stateFips}.geojson`);
    if (!geoResp.ok) throw new Error("GeoJSON file not found on server");
    const countiesGeo = await geoResp.json();
    const mceData = await getCachedData(`/api/counties-mce?state=${stateFips}`, stateFips, 'counties');
    fillDatalist("countyList", mceData);
    updateEthnicityList(Object.values(mceData));

    const geojson = L.geoJSON(countiesGeo, {
      style: (feature) => getFeatureStyle(feature, 2),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.NAME;
        const shortCo = String(feature.properties.COUNTYFP).padStart(3, '0');
        const fullCoID = stateFips + shortCo; 
        const countyData = mceData[fullCoID];

        layer.bindTooltip(`${name || 'Tract '+feature.properties.TRACTCE} (${countyData.mce})`, {
          sticky: true,
          direction: 'top',
          className: 'geo-tooltip'
        });
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
          viewStack.push(fullCoID);
          updateBackButton();
          map.fitBounds(e.target.getBounds());
          loadTractLevel(fullCoID);
          showDetails(fullCoID, 'county');
        });
        layer.on('mouseover', function (e) {
          this.setStyle({
            weight: 3,
            color: '#00ffff',
            fillOpacity: 0.8
          });
          this.bringToFront();
        });
        layer.on('mouseout', function (e) {
          geojson.resetStyle(this);
        });
      }
    }).addTo(countyLayer);
    map.fitBounds(geojson.getBounds());
    handleVisibility();
  } catch (err) {
    console.error("Failed to load counties:", err);
  }
}

async function loadTractLevel(coFips) {
  try {
    countyLayer.clearLayers();
    countyFlagLayer.clearLayers();
    
    const geoid = coFips;
    const geoResp = await fetch(`static/data/tracts/${geoid}.geojson`);
    const tractsGeo = await geoResp.json();
    const mceData = await getCachedData(`/api/tracts-mce?county=${coFips}`, coFips, 'tracts');
    fillDatalist("tractList", mceData);
    updateEthnicityList(Object.values(mceData));

    const geojson = L.geoJSON(tractsGeo, {
      style: (f) => getFeatureStyle(f, 3),
      onEachFeature: (f, layer) => {
        const parentKey = viewStack[2];
        const shortTract = String(f.properties.TRACTCE).padStart(6, '0');
        const fullTractID = parentKey + shortTract;
        const tractData = mceData[fullTractID];
        const mceLabel = tractData ? ` (${tractData.mce})` : " (No Data)";
        layer.bindTooltip(`${f.properties.NAME || 'Tract ' + shortTract}${mceLabel}`, {
          sticky: true,
          direction: 'top',
          className: 'geo-tooltip'
        });
        if (!tractData) return;

        const center = turf.centroid(f);
        const [lng, lat] = center.geometry.coordinates;
        L.marker([lat, lng], { 
            icon: L.divIcon({ html: `<img src="${getFlagUrl(tractData.mce)}" class="ensign-flag" style="width:10px;">`, className: 'ensign-container' }),
            interactive: false 
        }).addTo(tractFlagLayer);
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (viewStack.length === 4) {
            viewStack[3] = fullTractID;
          } else {
            viewStack.push(fullTractID);
          }
          updateBackButton();
          map.fitBounds(e.target.getBounds());
          showDetails(fullTractID, 'tract');
        });
        layer.on('mouseover', function (e) {
          this.setStyle({
            weight: 3,
            color: '#00ffff',
            fillOpacity: 0.8
          });
          this.bringToFront();
        });
        layer.on('mouseout', function (e) {
          geojson.resetStyle(this);
        });
      }
    }).addTo(tractLayer);
    map.fitBounds(geojson.getBounds());
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
    } else if (type === 'county') {
      data = dataCache.counties[viewStack[1]][geoId];
    } else if (type === 'tract') {
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
    
    // Reset to details tab
    document.getElementById("statsContent").style.display = "block";
    document.getElementById("rankingsContent").style.display = "none";
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelector("[data-tab='details']").classList.add("active");
    
    // Hide tabs if not in heatmap mode or not at state/county level
    const level = viewStack.length;
    if (viewMode !== 'heatmap' || (level !== 2 && level !== 3)) {
        document.getElementById("tabContainer").style.display = "none";
    }
    
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
                        <td class="clickable-eth" onclick="triggerHeatmap('${e.label}')" style="cursor:pointer; color:blue; text-decoration:underline;">${e.label}</td>
                        <td>${e.pop.toLocaleString()}</td>
                        <td>${e.percent_alone}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showRankings() {
    const level = viewStack.length;
    if (level !== 2 && level !== 3) return; // Only show rankings at state/county level
    
    const rankingsContent = document.getElementById("rankingsContent");
    let dataMap;
    
    if (level === 2) {
        dataMap = dataCache.counties[viewStack[1]];
    } else if (level === 3) {
        dataMap = dataCache.tracts[viewStack[2]];
    }
    
    if (!dataMap || !targetEthnicity) return;
    
    // Build array of geographies with sorted percentages
    const rankings = Object.entries(dataMap).map(([id, data]) => {
        const match = data.details.find(e => e.label === targetEthnicity);
        return {
            id: id,
            name: data.name,
            percentage: match ? match.percent_of_geo : 0,
            population: match ? match.pop : 0
        };
    }).sort((a, b) => b.percentage - a.percentage);
    
    rankingsContent.innerHTML = `
        <h3 style="margin-top:0; font-size:1.1em;">${targetEthnicity}</h3>
        <p style="margin-top:-10px; color:#666;">Ranked by % of geography</p>
        <table>
            <thead>
                <tr>
                    <th class="sort-col" data-col="name">Geography</th>
                    <th class="sort-col" data-col="percentage">%</th>
                    <th class="sort-col" data-col="population">Pop</th>
                </tr>
            </thead>
            <tbody>
                ${rankings.map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${r.percentage}%</td>
                        <td>${r.population.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Attach sort handlers
    rankingsContent.querySelectorAll('.sort-col').forEach(th => {
        th.addEventListener('click', (e) => sortTable(e.target));
    });
}

function sortTable(header) {
    const table = header.closest('table');
    const col = header.dataset.col;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Determine sort direction
    const isAsc = header.classList.contains('sort-asc');
    
    // Clear all sort indicators
    table.querySelectorAll('th').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Sort rows
    rows.sort((a, b) => {
        let aVal, bVal;
        const cellIndex = Array.from(a.cells).indexOf(a.cells[Array.from(header.parentElement.cells).indexOf(header)]);
        
        aVal = a.cells[cellIndex].textContent.trim();
        bVal = b.cells[cellIndex].textContent.trim();
        
        // Try to parse as number
        const aNum = parseFloat(aVal.replace('%', '').replace(',', ''));
        const bNum = parseFloat(bVal.replace('%', '').replace(',', ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAsc ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });
    
    // Update header styling
    header.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
    
    // Reorder rows
    rows.forEach(row => tbody.appendChild(row));
}

function updateMapStyles() {
    const level = viewStack.length;
    let activeLayerGroup;
    let dataMap;
    if (level === 1) { 
        activeLayerGroup = stateLayer; 
        dataMap = dataCache.states; 
    } else if (level === 2) { 
        activeLayerGroup = countyLayer; 
        dataMap = dataCache.counties[viewStack[1]]; 
    } else if (level === 3) { 
        activeLayerGroup = tractLayer; 
        dataMap = dataCache.tracts[viewStack[2]]; 
    }

    if (!dataMap) return;

    if (viewMode === 'heatmap' && targetEthnicity) {
        let max = 0;
        Object.values(dataMap).forEach(geo => {
            const match = geo.details.find(e => e.label === targetEthnicity);
            if (match && match.percent_of_geo > max) max = match.percent_of_geo;
        });
        currentMaxPct = max;
    }
    activeLayerGroup.eachLayer(geojson => {
        if (geojson.setStyle) {
            geojson.eachLayer(layer => {
                const props = layer.feature.properties;
                let id;
                if (level === 1) id = props.STATEFP;
                else if (level === 2) id = viewStack[1] + props.COUNTYFP;
                else if (level === 3) id = viewStack[2] + props.TRACTCE;
                const data = dataMap[id];
                if (!data) return;

                layer.setStyle(getFeatureStyle(layer.feature, level));

                let tooltipContent = props.NAME || `Tract ${props.TRACTCE}`;
                if (viewMode === 'heatmap' && targetEthnicity) {
                    const match = data.details.find(e => e.label === targetEthnicity);
                    const pct = match ? match.percent_of_geo : 0;
                    tooltipContent += `: ${pct}%`;
                } else {
                    tooltipContent += ` (${data.mce})`;
                }
                layer.setTooltipContent(tooltipContent);
            });
        }
    });
}

document.getElementById("ethSearch").addEventListener("input", (e) => {
    const val = e.target.value;
    const list = document.getElementById("ethList");
    const exists = Array.from(list.options).some(opt => opt.value === val);

    if (exists) {
        targetEthnicity = val;
        viewMode = 'heatmap';
        document.getElementById("clearHeatmap").style.display = "block";
        updateMapStyles();
        handleVisibility();
        
        // Show rankings tab if at state or county level
        const level = viewStack.length;
        if (level === 2 || level === 3) {
            document.getElementById("tabContainer").style.display = "flex";
            showRankings();
        }
    }
});

document.getElementById("clearHeatmap").onclick = () => {
    viewMode = 'mce';
    targetEthnicity = null;
    document.getElementById("ethSearch").value = "";
    document.getElementById("clearHeatmap").style.display = "none";
    document.getElementById("tabContainer").style.display = "none";
    document.getElementById("rankingsContent").style.display = "none";
    document.getElementById("statsContent").style.display = "block";
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelector("[data-tab='details']").classList.add("active");
    updateMapStyles();
    handleVisibility();
};

window.triggerHeatmap = (label) => {
    document.getElementById("ethSearch").value = label;
    targetEthnicity = label;
    viewMode = 'heatmap';
    document.getElementById("clearHeatmap").style.display = "block";
    updateMapStyles();
    handleVisibility();
    
    // Show rankings tab if at state or county level
    const level = viewStack.length;
    if (level === 2 || level === 3) {
        document.getElementById("tabContainer").style.display = "flex";
        showRankings();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("togglePanel").addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = document.getElementById("infoPanel");
        const btn = document.getElementById("togglePanel");
        panel.classList.toggle("collapsed");
        btn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
    });

    document.getElementById("closePanel").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("infoPanel").classList.add("hidden");
    });

    // Tab switching functionality
    document.querySelectorAll(".tab-button").forEach(button => {
        button.addEventListener("click", (e) => {
            const tab = e.target.dataset.tab;
            const statsContent = document.getElementById("statsContent");
            const rankingsContent = document.getElementById("rankingsContent");
            
            // Update button states
            document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            
            // Update content visibility
            if (tab === "details") {
                statsContent.style.display = "block";
                rankingsContent.style.display = "none";
            } else if (tab === "rankings") {
                statsContent.style.display = "none";
                rankingsContent.style.display = "block";
            }
        });
    });

    initStateMap();
});