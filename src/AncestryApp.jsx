import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './ancestry-styles.css';

// Access CDN libraries as globals
const { distance, point } = window.turf;
const mapboxgl = window.mapboxgl;

// Constants
const MAPBOX_TOKEN = "pk.eyJ1IjoiYmlibGV2aXoiLCJhIjoiY2pjOTVhazJ1MDlqbzMzczFoamd3MzFnOSJ9.7k1RJ5oh-LNaYuADxsgx4Q";
const PEOPLE_MAP_STYLE = "mapbox://styles/bibleviz/cm6yc8h0i001w01quf2orebmn";
const LABEL_LAYER_IDS = ["labels-top-level", "labels-mid-level", "labels-bottom-level"];
const PEOPLE_LAYER_IDS = ["father-points", "father-lines", ...LABEL_LAYER_IDS];
const INTERACTIVE_LAYER_IDS = ['father-points', 'genealogy-lines', ...LABEL_LAYER_IDS];
const GROUP_PROPERTY_NAME = "groupLabel";
const INITIAL_MAP_BOUNDS = [[-23.642578125, -24.00632619875111], [23.917236328125, 23.372513822359466]];
const THEOGRAPHIC_PEOPLE_URL = 'https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/people.json';
const THEOGRAPHIC_GROUPS_URL = 'https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/peopleGroups.json';

// Filter options data
const filterOptions = [
    {
        id: "all",
        text: "ALL",
        defaultChecked: true,
    },
    {
        id: "Genealogy of Jesus",
        text: "Jesus",
    },
    {
        id: "Tribe of Judah",
        text: "Judah",
    },
    {
        id: "Tribe of Levi",
        text: "Levi",
    },
    {
        id: "Tribe of Joseph",
        text: "Joseph",
    },
    {
        id: "Tribe of Benjamin",
        text: "Benjamin",
    },
    {
        id: "Tribe of Reuben",
        text: "Reuben",
    },
    {
        id: "Tribe of Simeon",
        text: "Simeon",
    },
    {
        id: "Tribe of Issachar",
        text: "Issachar",
    },
    {
        id: "Tribe of Naphtali",
        text: "Naphtali",
    },
    {
        id: "Tribe of Asher",
        text: "Asher",
    },
    {
        id: "Tribe of Zebulun",
        text: "Zebulun",
    },
    {
        id: "Tribe of Gad",
        text: "Gad",
    },
    {
        id: "Tribe of Dan",
        text: "Dan",
    },
];

// Genealogy points and lines data
const judahJesusPoints = [
  [23.8608, -0.3938], [6.2762, -4.424], [12.2444, -2.6098], [1.112, -3.1458],
  [23.9148, 0.97], [20.4832, 0.9942], [22.9098, -1.4676], [23.5296, -1.0954],
  [20.8556, 0.4062], [21.2846, -0.2034], [13.048, -0.3482], [13.494, 0.6868],
  [23.912, 0.2868], [21.7408, -0.7756], [22.23, -1.2534], [11.7828, -3.9872],
  [12.6234, -1.4078], [11.273, -5.6906], [23.4662, 3.8416], [17.652, 6.2292],
  [20.1028, 1.591], [21.1102, 10.0884], [19.529, 12.8028], [13.8152, 20.3572],
  [13.8662, 11.3228], [18.7156, 3.3212], [19.6552, 2.2328], [21.8002, 8.7164],
  [4.1726, 22.8074], [16.6668, 18.349], [20.3434, 11.4436], [6.284, 20.098],
  [11.5428, 21.0962], [22.3954, 7.3198], [17.8716, 15.6954], [23.2904, 4.5504],
  [8.8628, 18.339], [23.7484, 2.4296], [18.1526, 3.8786], [15.0776, 20.1568],
  [21.4664, 9.4052], [14.7772, 3.1912], [11.129, 16.0448], [15.321, 7.7294],
  [19.9402, 12.1208], [12.4316, 14.2496], [3.805, 21.7692], [20.7348, 10.7672],
  [12.7724, 13.6218], [14.184, 10.5526], [17.4044, 4.3082], [2.6434, 22.736],
  [8.3116, 18.8868], [23.6192, 3.1342], [23.0934, 5.2596], [6.877, 22.4988],
  [18.2818, 14.9326], [17.0688, 17.3762], [9.4812, 17.782], [22.1102, 8.021],
  [5.567, 22.7216], [19.1132, 13.4946], [10.4202, 21.4672], [12.0122, 14.8744],
  [16.2846, 5.5798], [12.6818, 20.7436], [10.6434, 16.615], [4.9874, 20.9482],
  [11.581, 15.4674], [7.2792, 19.5282], [22.6564, 6.614], [9.2838, 21.8396],
  [17.4674, 16.5032], [16.3692, 19.3408], [16.4022, 20.8218], [8.1096, 22.1922],
  [13.142, 12.4762], [18.6966, 14.202], [19.1928, 2.8008], [14.5876, 9.3766],
  [10.105, 17.2408], [22.8746, 5.9684], [23.8466, 1.7292], [13.9938, 1.7844]
];

const excludeLines = {
    'Nathan-Menan': [[17.4044, 4.3082], [18.7156, 3.3212]],
    'Nathan-Absalom': [[17.4044, 4.3082], [17.652, 6.2292]],
    'Jesse-Boaz': [[14.7772, 3.1912], [13.494, 0.6868]],
    'Joseph-Mary': [[15.0776, 20.1568], [16.3692, 19.3408]],
    'Abiud-Pedaiah': [[4.1726, 22.8074], [3.805, 21.7692]]
};

const includeLines = {
    'Jesse-David': [[14.7772, 3.1912], [16.2846, 5.5798]],
    'Jacob-Judah': [[-6.011,-3.4138], [1.112, -3.1458]],
    'Absalom-Tamar': [[17.652, 6.2292], [18.4886,6.675]]
};

// Style fixing functions (add after constants, before utility functions)
const fixStyleJSON = (styleJSON) => {
  console.log('🔧 Starting style fixes...');
  let fixedStyle = JSON.parse(JSON.stringify(styleJSON)); // Deep clone
  
  // Fix each layer
  if (fixedStyle.layers) {
    fixedStyle.layers.forEach((layer, index) => {
      
      // Fix 1: Remove invalid text-size-scale-range property
      if (layer.layout && layer.layout['text-size-scale-range']) {
        delete layer.layout['text-size-scale-range'];
        console.log(`Fixed: Removed text-size-scale-range from layer ${layer.id}`);
      }
      
      // Fix 2: Simplify match expressions
      if (layer.paint && layer.paint['circle-color'] && Array.isArray(layer.paint['circle-color'])) {
        fixedStyle.layers[index].paint['circle-color'] = fixMatchExpression(layer.paint['circle-color']);
      }
      
      if (layer.paint && layer.paint['line-color'] && Array.isArray(layer.paint['line-color'])) {
        fixedStyle.layers[index].paint['line-color'] = fixMatchExpression(layer.paint['line-color']);
      }
      
      // Fix 3: Add missing text color for mid-level layer
      if (layer.id === 'labels-mid-level' && layer.paint && !layer.paint['text-color']) {
        fixedStyle.layers[index].paint['text-color'] = 'rgba(0, 0, 0, 0.7)';
        console.log(`Fixed: Added text-color to ${layer.id}`);
      }
      
      // Fix 4: Simplify geometry filters
      if (layer.filter && Array.isArray(layer.filter)) {
        const newFilter = fixGeometryFilter(layer.filter);
        if (newFilter !== layer.filter) {
          fixedStyle.layers[index].filter = newFilter;
        }
      }
    });
  }
  
  // Fix 5: Remove null terrain property
  if (fixedStyle.terrain === null) {
    delete fixedStyle.terrain;
    console.log(`Fixed: Removed null terrain property`);
  }
  
  console.log(`🎉 Style fixes completed!`);
  return fixedStyle;
};

const fixMatchExpression = (matchExpr) => {
  if (!Array.isArray(matchExpr) || matchExpr[0] !== 'match') {
    return matchExpr;
  }
  
  // Create a new match expression with simplified values
  const newMatchExpr = ['match', matchExpr[1]]; // Keep the property getter
  
  // Process the cases - skip complex array values and use simple strings
  for (let i = 2; i < matchExpr.length - 1; i += 2) {
    const key = matchExpr[i];
    const value = matchExpr[i + 1];
    
    if (Array.isArray(key)) {
      // If key is an array, use the first string value
      const simpleKey = key.find(k => typeof k === 'string' && !k.startsWith('['));
      if (simpleKey) {
        newMatchExpr.push(simpleKey, value);
      }
    } else if (typeof key === 'string' && !key.startsWith('[')) {
      // Keep simple string keys
      newMatchExpr.push(key, value);
    }
  }
  
  // Add the default value (last item)
  newMatchExpr.push(matchExpr[matchExpr.length - 1]);
  
  return newMatchExpr;
};

const fixGeometryFilter = (filter) => {
  // Convert match-based geometry filters to simpler == filters
  if (Array.isArray(filter) && filter[0] === 'match' && filter[1] && 
      Array.isArray(filter[1]) && filter[1][0] === 'geometry-type') {
    
    const geomType = filter[2]; // The geometry type array
    if (Array.isArray(geomType) && geomType.length === 1) {
      // Convert to simple == filter
      return ['==', ['geometry-type'], geomType[0]];
    }
  }
  return filter;
};

// Utility functions
const calculateMapPadding = (mapInstance, paddingPercent) => {
  const canvas = mapInstance.getCanvas();
  return {
    top: canvas.clientHeight * paddingPercent,
    bottom: canvas.clientHeight * paddingPercent,
    left: canvas.clientWidth * paddingPercent,
    right: canvas.clientWidth * paddingPercent,
  };
};

const flyToMapBounds = (mapInstance, paddingPercent, bounds, maxZoom = 16, duration = 1000, bearing = 0, pitch = 0) => {
  const padding = calculateMapPadding(mapInstance, paddingPercent);
  const camera = mapInstance.cameraForBounds(bounds, { padding, maxZoom });

  if (!camera) {
    console.warn("Camera could not be determined for bounds. Flying to default initial view.");
    mapInstance.flyTo({
      center: [0, 0],
      zoom: 3,
      bearing: 0,
      pitch: 0,
      duration,
    });
    return;
  }

  mapInstance.flyTo({
    center: camera.center,
    zoom: camera.zoom,
    bearing,
    pitch,
    duration,
  });
};

const getCoordinates = (geometry) => {
  if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }
  return null;
};

// Search sorting functions
const createSearchSort = (customTiebreakers, useDefaultOrder = true) => {
    return (items, query) => {
        const q = query.toLowerCase();
        return items.sort((a, b) => {
            if (useDefaultOrder) {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const idxA = nameA.indexOf(q);
                const idxB = nameB.indexOf(q);
                if (idxA !== idxB) return idxA - idxB;
                if (a.name.length !== b.name.length) return a.name.length - b.name.length;
                const alphabeticalComparison = nameA.localeCompare(nameB);
                if (alphabeticalComparison !== 0) return alphabeticalComparison;

                if (customTiebreakers) {
                    for (const tiebreaker of customTiebreakers) {
                        const result = tiebreaker(a, b, q);
                        if (result !== 0) return result;
                    }
                }
            } else {
                if (customTiebreakers) {
                    for (const tiebreaker of customTiebreakers) {
                        const result = tiebreaker(a, b, q);
                        if (result !== 0) return result;
                    }
                }
            }
            return 0;
        });
    };
};

const tiebreakerFunctions = {
    byIndexOfMatch: () => (a, b, query) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const q = query.toLowerCase();
        const idxA = nameA.indexOf(q);
        const idxB = nameB.indexOf(q);
        return idxA - idxB;
    },
    byNumericProperty: (propertyName) => (a, b) => {
        const valueA = a[propertyName] || 0;
        const valueB = b[propertyName] || 0;
        return valueB - valueA;
    },
    byNameLength: () => (a, b) => {
        return a.name.length - b.name.length;
    },
    byAlphabetical: () => (a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }
};

const peopleSearchSort = createSearchSort([
    tiebreakerFunctions.byIndexOfMatch(),
    tiebreakerFunctions.byNumericProperty('verseCount'),
    tiebreakerFunctions.byNameLength(),
    tiebreakerFunctions.byAlphabetical()
], false);

// Cache objects
const featuresCache = new Map();
const genealogyLinesCache = new Map();
const dynamicOriginalLabelOpacities = new Map();
let globalConstantsInitialized = false;

// PersonInfoPopup Component
const PersonInfoPopup = ({ featureInfo, onClose, mapInstance }) => {
  const [allPeopleData, setAllPeopleData] = useState(null);
  const [allGroupsData, setAllGroupsData] = useState(null);
  const [personToDisplay, setPersonToDisplay] = useState(null);
  const [groupNamesToDisplay, setGroupNamesToDisplay] = useState('N/A');
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (featureInfo && mapInstance && !popupRef.current) {
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '240px',
        anchor: 'bottom'
      })
      .setLngLat([featureInfo.longitude, featureInfo.latitude])
      .setDOMContent(document.createElement('div'))
      .addTo(mapInstance);

      popup.on('close', onClose);
      popupRef.current = popup;
    }

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [featureInfo, mapInstance, onClose]);

  useEffect(() => {
    const fetchAllPeople = async () => {
      setIsLoadingPeople(true);
      setPeopleError(null);
      try {
        const response = await fetch(THEOGRAPHIC_PEOPLE_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch people data: ${response.statusText}`);
        }
        const data = await response.json();
        setAllPeopleData(data);
      } catch (err) {
        setPeopleError(err instanceof Error ? err.message : 'An unknown error occurred while fetching people');
      } finally {
        setIsLoadingPeople(false);
      }
    };

    if (!allPeopleData) {
      fetchAllPeople();
    }
  }, [allPeopleData]);

  useEffect(() => {
    const fetchAllGroups = async () => {
      setIsLoadingGroups(true);
      setGroupsError(null);
      try {
        const response = await fetch(THEOGRAPHIC_GROUPS_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch groups data: ${response.statusText}`);
        }
        const data = await response.json();
        setAllGroupsData(data);
      } catch (err) {
        setGroupsError(err instanceof Error ? err.message : 'An unknown error occurred while fetching groups');
      } finally {
        setIsLoadingGroups(false);
      }
    };

    if (!allGroupsData) {
      fetchAllGroups();
    }
  }, [allGroupsData]);

  useEffect(() => {
    if (featureInfo && allPeopleData) {
      const foundPerson = allPeopleData.find(
        (p) => p.fields.personID === featureInfo.personIdToLookup
      );
      setPersonToDisplay(foundPerson || null);
    } else {
      setPersonToDisplay(null);
    }
  }, [featureInfo, allPeopleData]);

  useEffect(() => {
    if (personToDisplay && allGroupsData) {
      const memberOfRefs = personToDisplay.fields.memberOf;
      if (memberOfRefs && Array.isArray(memberOfRefs) && memberOfRefs.length > 0) {
        const names = memberOfRefs
          .map((refId) => {
            const group = allGroupsData.find((g) => g.id === refId);
            return group ? group.fields.groupName : null;
          })
          .filter((name) => name !== null);

        if (names.length > 0) {
          setGroupNamesToDisplay(names.join(', '));
        } else {
          setGroupNamesToDisplay('N/A');
        }
      } else {
        setGroupNamesToDisplay('N/A');
      }
    } else if (personToDisplay && !allGroupsData && !isLoadingGroups && !groupsError) {
      setGroupNamesToDisplay('N/A');
    }
  }, [personToDisplay, allGroupsData, isLoadingGroups, groupsError]);

  useEffect(() => {
    if (popupRef.current && personToDisplay) {
      const popupContent = `
        <div class="popup-content">
          <div class="popup-title">
            ${personToDisplay.fields.name || 'Unknown Name'}
          </div>
          <div>
            Group: 
            ${isLoadingGroups ? '<span>Loading groups...</span>' : 
              (!isLoadingGroups && groupsError ? '<span class="popup-error">Error loading groups</span>' : 
              `<span>${groupNamesToDisplay}</span>`)}
          </div>
          <div class="popup-group">
            <a 
              href="https://theographic.netlify.app/person/${personToDisplay.fields.personLookup}"
              target="_blank"
              rel="noopener noreferrer"
              class="popup-link"
            >
              More Details
            </a>
          </div>
          ${isLoadingPeople && !allPeopleData ? '<div class="popup-loading">Loading person data...</div>' : ''}
          ${peopleError ? `<div class="popup-error">Error: ${peopleError}</div>` : ''}
        </div>
      `;
      popupRef.current.setHTML(popupContent);
    }
  }, [personToDisplay, groupNamesToDisplay, isLoadingPeople, isLoadingGroups, peopleError, groupsError, allPeopleData]);

  if (!featureInfo || !personToDisplay) {
    if (isLoadingPeople && !allPeopleData) {
        return null;
    }
    return null;
  }

  return null; // Popup is handled via Mapbox popup DOM manipulation
};

// SearchBar Component
const SearchBar = ({ mapInstance, placeholder = "Search", flyToZoom = 6, onBeforeSelect }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allSearchableItems, setAllSearchableItems] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchContainerRef = useRef(null);

  const layersConfigs = [{
    layerId: INTERACTIVE_LAYER_IDS[0],
    nameProperty: 'nameLabel',
    sourceLayer: 'bible_genes_json_2',
    extractProperties: (feature) => ({
      groupLabel: feature.properties?.groupLabel,
      verseCount: feature.properties?.verseCount,
    })
  }];

  useEffect(() => {
    if (!mapInstance || allSearchableItems.length > 0) {
      return;
    }

    const processFeatures = () => {
      if (!mapInstance.isStyleLoaded()) {
        mapInstance.once('styledata', processFeatures);
        return;
      }
      
      const uniqueItemsMap = new Map();

      for (const config of layersConfigs) {
        try {
          const layer = mapInstance.getLayer(config.layerId);
          if (!layer) continue;

          const sourceId = layer.source;
          if (!sourceId) continue;
          
          const features = mapInstance.querySourceFeatures(sourceId, {
            sourceLayer: config.sourceLayer,
          });

          for (const feature of features) {
            const name = feature.properties?.[config.nameProperty];
            const coords = getCoordinates(feature.geometry);

            if (name && typeof name === 'string' && coords) {
              const itemUniqueKey = `${config.layerId}-${name}-${coords.join(',')}`;

              if (!uniqueItemsMap.has(itemUniqueKey)) {
                const baseItem = {
                  id: itemUniqueKey,
                  name: name,
                  coordinates: coords,
                  layerId: config.layerId,
                };

                if (config.extractProperties) {
                  const additionalProps = config.extractProperties(feature);
                  Object.assign(baseItem, additionalProps);
                }

                uniqueItemsMap.set(itemUniqueKey, baseItem);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing layer ${config.layerId}:`, error);
        }
      }
      setAllSearchableItems(Array.from(uniqueItemsMap.values()));
    };
    
    if (mapInstance.loaded()) {
      processFeatures();
    } else {
      mapInstance.once('load', processFeatures);
    }
  }, [mapInstance, allSearchableItems.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterAndSetSuggestions = useCallback((currentQuery) => {
    if (currentQuery.trim() === "") {
      setSuggestions([]);
      setIsDropdownVisible(false);
    } else {
      const q = currentQuery.toLowerCase();
      const filtered = allSearchableItems
        .filter(item => item.name.toLowerCase().includes(q));

      const sorted = peopleSearchSort(filtered, q);

      setSuggestions(sorted);
      setIsDropdownVisible(sorted.length > 0);
    }
  }, [allSearchableItems]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    filterAndSetSuggestions(value);
  };

  const handleSuggestionClick = (item) => {
    setQuery(item.name);
    setIsDropdownVisible(false);
    setSuggestions([]);

    if (onBeforeSelect) onBeforeSelect(item);

    if (mapInstance) {
      mapInstance.flyTo({
        center: item.coordinates,
        zoom: flyToZoom,
        essential: true,
      });
    }
  };

  const handleInputFocus = () => {
    if (query.trim() !== "" && allSearchableItems.length > 0) {
        if (suggestions.length > 0 && suggestions.every(s => s.name.toLowerCase().includes(query.toLowerCase()))) {
            setIsDropdownVisible(true);
        } else {
            filterAndSetSuggestions(query);
        }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const exactMatch = suggestions.find(
        (suggestion) => suggestion.name.toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        handleSuggestionClick(exactMatch);
      }
    } else if (event.key === 'Escape') {
        setIsDropdownVisible(false);
    }
  };

  return (
    <div className="search-container" ref={searchContainerRef}>
      <input
        name="search-input"
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="search-input"
        aria-autocomplete="list"
        aria-expanded={isDropdownVisible}
        aria-controls="search-suggestions-list"
      />
      {isDropdownVisible && suggestions.length > 0 && (
        <ul className="search-suggestions" role="listbox">
          {suggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => handleSuggestionClick(item)}
              className="search-suggestion"
              role="option"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Main AncestryApp Component
const AncestryApp = () => {
  const [clickedFeatureForPopup, setClickedFeatureForPopup] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isMapSettled, setIsMapSettled] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const mapContainerRef = useRef(null);
  const SHOW_OPACITY = 1;
  const HIDE_OPACITY = 0.2;

  // Initialize Mapbox map
    useEffect(() => {
    if (!mapContainerRef.current || mapInstance) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const fetchAndFixStyle = async () => {
        try {
        console.log('🔄 Fetching style from Mapbox API...');
        
        const response = await fetch(
            `https://api.mapbox.com/styles/v1/bibleviz/cm6yc8h0i001w01quf2orebmn?access_token=${MAPBOX_TOKEN}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const originalStyle = await response.json();
        console.log('✅ Original style fetched successfully');
        
        console.log('🔧 Applying fixes to style...');
        const fixedStyle = fixStyleJSON(originalStyle);
        
        console.log('🗺️ Creating map with fixed style...');
        return await createMapWithStyle(fixedStyle);
        
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
    };

    const createMapWithStyle = async (styleJSON) => {
        try {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: styleJSON, // Use the fixed style object directly
            center: styleJSON.center || [0, 0],
            zoom: styleJSON.zoom || 3,
            bearing: styleJSON.bearing || 0,
            pitch: styleJSON.pitch || 0
        });
        
        // Add navigation control
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        
        map.on('load', () => {
            console.log('Map loaded successfully with fixed style');
            setIsMapInitialized(true);
            setMapInstance(map);
            
            initializeDynamicConstants(map);
            
            const padding = calculateMapPadding(map, 0.1);
            map.on('moveend', () => {
            setIsMapSettled(true);
            });
            
            map.fitBounds(INITIAL_MAP_BOUNDS, { padding: padding });
        });
        
        map.on('error', (e) => {
            console.warn(`⚠️ Map warning: ${e.error?.message || 'Unknown error'}`);
            // Don't treat warnings as fatal errors
        });
        
        setupMapInteractions(map);
        
        return map;
        
        } catch (error) {
        console.error(`❌ Failed to create map: ${error.message}`);
        throw error;
        }
    };

    const setupMapInteractions = (map) => {
        // Handle map clicks
        map.on('click', (event) => {
        if (!map.getLayer('father-points')) {
            console.warn('Click functionality only available with custom style');
            return;
        }

        const features = map.queryRenderedFeatures(event.point, {
            layers: INTERACTIVE_LAYER_IDS
        });

        const feature = features && features[0];
        if (feature && feature.properties && 'PersonID' in feature.properties) {
            const personIdFromFeature = feature.properties.PersonID;
            const personIdNum = typeof personIdFromFeature === 'string'
            ? parseInt(personIdFromFeature, 10)
            : personIdFromFeature;

            if (!isNaN(personIdNum)) {
            setClickedFeatureForPopup({
                personIdToLookup: personIdNum,
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
                groupLabel: feature.properties.groupLabel,
            });
            } else {
            console.warn("Clicked feature PersonID is not a valid number:", personIdFromFeature);
            setClickedFeatureForPopup(null);
            }
        } else {
            setClickedFeatureForPopup(null);
        }
        });

        // Handle mouse events for cursor
        map.on('mouseenter', INTERACTIVE_LAYER_IDS, () => {
        map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', INTERACTIVE_LAYER_IDS, () => {
        map.getCanvas().style.cursor = '';
        });
    };

    // Start the initialization
    fetchAndFixStyle().then((map) => {
        // Cleanup function will handle map removal
        return () => {
        if (map) map.remove();
        };
    });

    }, []);

  const initializeDynamicConstants = (mapInstance) => {
    if (globalConstantsInitialized) {
      return;
    }

    // Initialize features cache
    ["father-points", "father-lines"].forEach(layerId => {
      const layer = mapInstance.getLayer(layerId);
      if (!layer || !layer.source) {
        return;
      }
      const srcId = layer.source;
      const srcLayer = layer["source-layer"];
      try {
        const allFeatures = mapInstance.querySourceFeatures(srcId, { 
          sourceLayer: srcLayer 
        });
        featuresCache.set(layerId, allFeatures);
      } catch (e) {
        console.error(`Error querying source features for layer ${layerId}:`, e);
        featuresCache.set(layerId, []);
      }
    });

    // Fetch original label opacities
    LABEL_LAYER_IDS.forEach(layerId => {
      if (mapInstance.getLayer(layerId)) {
        try {
          const opacityValue = mapInstance.getPaintProperty(layerId, 'text-opacity');
          dynamicOriginalLabelOpacities.set(layerId, opacityValue);
        } catch (e) {
          console.warn(`Could not get initial text-opacity for layer ${layerId}.`, e);
          dynamicOriginalLabelOpacities.set(layerId, undefined);
        }
      } else {
        console.warn(`Label layer ${layerId} not found in the current map style during initialization.`);
        dynamicOriginalLabelOpacities.set(layerId, undefined);
      }
    });

    // Calculate genealogy lines
    const calculateGenealogyLines = () => {
      const points = judahJesusPoints;
      const lines = [];
      const seenLines = new Set();
      
      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const distances = points.map((p, idx) => ({ 
          distance: idx === i ? Infinity : distance(point(currentPoint), point(p)), 
          index: idx 
        }));
        const sortedIndices = distances
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 2)
          .map(item => item.index);

        for (const neighborIdx of sortedIndices) {
          const neighbor = points[neighborIdx];
          const lineKey = [i, neighborIdx].sort().join('-');
          if (!seenLines.has(lineKey)) {
            seenLines.add(lineKey);
            lines.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [currentPoint, neighbor]
              },
              properties: {
                groupLabel: 'Tribe of Judah,Genealogy of Jesus'
              }
            });
          }
        }
      }

      // Include specific lines
      Object.values(includeLines).forEach(lineCoords => {
        const [start, end] = lineCoords;
        lines.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [start, end]
          },
          properties: {
            groupLabel: 'Tribe of Judah,Genealogy of Jesus'
          }
        });
      });

      // Exclude specific lines
      const excludeCoordsSet = new Set(
        Object.values(excludeLines).map(lineCoords => {
          const [start, end] = lineCoords;
          return [JSON.stringify([start, end])];
        }).flat()
      );

      const filteredLines = lines.filter(line => {
        const coords = line.geometry.coordinates;
        const coordsStr1 = JSON.stringify(coords);
        const coordsStr2 = JSON.stringify([coords[1], coords[0]]);
        return !excludeCoordsSet.has(coordsStr1) && !excludeCoordsSet.has(coordsStr2);
      });

      return filteredLines;
    };

    const genealogyLines = calculateGenealogyLines();
    genealogyLinesCache.set('judah-jesus-genealogy', genealogyLines);

    // Add custom genealogy lines to map
    if (genealogyLines.length > 0) {
      try {
        mapInstance.addSource('genealogy-lines-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: genealogyLines
          }
        });
        mapInstance.addLayer({
          id: 'genealogy-lines',
          type: 'line',
          source: 'genealogy-lines-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': 'none'
          },
          paint: {
            'line-color': '#d62728',
            'line-width': 2,
            'line-opacity': 1
          }
        }, 'father-points');
      } catch (e) {
        console.error('Error adding genealogy lines to map:', e);
      }
    }
    globalConstantsInitialized = true;
  };

  const fitMapToGroup = (mapInstance, groupId) => {
    if (groupId === "all") {
      flyToMapBounds(mapInstance, 0.1, INITIAL_MAP_BOUNDS, 16);
      return;
    }

    let minLng = +Infinity, maxLng = -Infinity,
        minLat = +Infinity, maxLat = -Infinity,
        featuresFound = false;

    const process = ([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      featuresFound = true;
    };

    ["father-points", "father-lines"].forEach(layerId => {
      const cachedFeatures = featuresCache.get(layerId) || [];
      const groupFeatures = cachedFeatures.filter(feature => {
        const props = feature.properties;
        if (!props || !props[GROUP_PROPERTY_NAME]) return false;
        const groupLabelString = props[GROUP_PROPERTY_NAME];

        if (layerId === "father-points") {
          return props.verseCount !== undefined && groupLabelString.includes(groupId);
        } else {
          return groupLabelString.includes(groupId);
        }
      });

      groupFeatures.forEach(f => {
        const geom = f.geometry;
        if (geom.type === "Point") {
          process(geom.coordinates);
        } else if (geom.type === "LineString") {
          geom.coordinates.forEach(process);
        }
      });
    });

    if (!featuresFound) {
      console.warn(`No features found for group ${groupId}. Flying to initial map bounds.`);
      flyToMapBounds(mapInstance, 0.1, INITIAL_MAP_BOUNDS, 16);
      return;
    }

    const bounds = [[minLng, minLat], [maxLng, maxLat]];
    flyToMapBounds(mapInstance, 0.1, bounds, 16);
  };

  const applyFilter = (mapInstance, groupId) => {
    if (mapInstance.getLayer('genealogy-lines')) {
      mapInstance.setLayoutProperty('genealogy-lines', 'visibility', groupId === 'Tribe of Judah' ? 'visible' : 'none');
    }

    PEOPLE_LAYER_IDS.forEach((layerId) => {
      if (mapInstance.getLayer(layerId)) {
        if (layerId === "father-points") {
          const correctPointsFilter = ["has", "verseCount"];
          mapInstance.setFilter(layerId, correctPointsFilter);

          if (groupId === "all") {
            mapInstance.setPaintProperty(layerId, "circle-opacity", undefined); 
          } else {
            const opacityExpression = [ "case", ["in", groupId, ["get", GROUP_PROPERTY_NAME]], SHOW_OPACITY, HIDE_OPACITY ];
            mapInstance.setPaintProperty(layerId, "circle-opacity", opacityExpression);
          }
        } else if (layerId === "father-lines") {
          mapInstance.setFilter(layerId, null);
          if (groupId === "all") {
            mapInstance.setPaintProperty(layerId, "line-opacity", undefined); 
          } else {
            const opacityExpression = [ "case", ["in", groupId, ["get", GROUP_PROPERTY_NAME]], SHOW_OPACITY, HIDE_OPACITY ];
            mapInstance.setPaintProperty(layerId, "line-opacity", opacityExpression);
          }
        } else if (LABEL_LAYER_IDS.includes(layerId)) {
          const originalStyleOpacity = dynamicOriginalLabelOpacities.get(layerId);
          if (groupId === "all") {
            mapInstance.setPaintProperty(layerId, "text-opacity", originalStyleOpacity !== undefined ? originalStyleOpacity : undefined);
          } else {
            const condition = ["in", groupId, ["get", GROUP_PROPERTY_NAME]];
            let finalOpacityExpression;
            if (originalStyleOpacity !== undefined) {
              if (typeof originalStyleOpacity === 'number') {
                finalOpacityExpression = ["case", condition, originalStyleOpacity, HIDE_OPACITY];
              } else if (
                Array.isArray(originalStyleOpacity) &&
                originalStyleOpacity[0] === "interpolate" &&
                originalStyleOpacity.length >= 5 &&
                Array.isArray(originalStyleOpacity[2]) &&
                originalStyleOpacity[2][0] === "zoom"
              ) {
                const newInterpolateExpr = [
                  originalStyleOpacity[0], 
                  originalStyleOpacity[1], 
                  originalStyleOpacity[2]
                ];
                for (let i = 3; i < originalStyleOpacity.length; i += 2) {
                  if (i + 1 < originalStyleOpacity.length) {
                    const stopInput = originalStyleOpacity[i];
                    const stopOutputOriginal = originalStyleOpacity[i + 1];
                    newInterpolateExpr.push(stopInput);
                    newInterpolateExpr.push(["case", condition, stopOutputOriginal, HIDE_OPACITY]);
                  }
                }
                finalOpacityExpression = newInterpolateExpr;
              } else if (Array.isArray(originalStyleOpacity)) {
                finalOpacityExpression = ["case", condition, originalStyleOpacity, HIDE_OPACITY];
              } else {
                console.warn(`Layer ${layerId} has an unexpected originalStyleOpacity type: `, originalStyleOpacity, `. Falling back to simple opacity for filtered view.`);
                finalOpacityExpression = ["case", condition, SHOW_OPACITY, HIDE_OPACITY];
              }
            } else {
              finalOpacityExpression = ["case", condition, SHOW_OPACITY, HIDE_OPACITY];
            }
            mapInstance.setPaintProperty(layerId, "text-opacity", finalOpacityExpression);
          }
        }
      }
    });

    fitMapToGroup(mapInstance, groupId);
  };

  const handleFilterChange = (event) => {
    const newGroupId = event.target.value;

    if (!mapInstance) {
      return;
    }

    if (globalConstantsInitialized) {
        applyFilter(mapInstance, newGroupId);
    } else {
        console.warn("handleChange called before global constants were initialized. Attempting to apply filter anyway.");
        applyFilter(mapInstance, newGroupId);
    }
    
    setCurrentFilter(newGroupId);
  };

  const switchToAllFilter = () => {
    const allRadio = document.querySelector('input[name="ancestry-legend"][value="all"]');
    if (allRadio && !allRadio.checked) {
      allRadio.click();
      setCurrentFilter('all');
    }
  };

  const checkIfItemVisibleInCurrentFilter = (item, filter) => {
    if (filter === 'all') return true;
    
    const itemGroupLabel = item.groupLabel;
    if (itemGroupLabel && typeof itemGroupLabel === 'string') {
      return itemGroupLabel.includes(filter);
    }
    return false;
  };

  const handleBeforeSearch = useCallback((item) => {
    if (!checkIfItemVisibleInCurrentFilter(item, currentFilter)) {
      switchToAllFilter();
    }
  }, [currentFilter]);

  const getFilterIdFromOptionId = (optionId) => {
    return optionId.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <header className="header">
          <h1><i>God's Bloodline</i></h1>
          <div className="header-controls">
            <div className="order-1">
              <form>
                <ul id="ancestry-legend">
                  {filterOptions.map((option) => {
                    const htmlId = `ancestry-legend-${getFilterIdFromOptionId(option.id)}`;
                    return (
                      <li key={option.id}>
                        <input
                          id={htmlId}
                          type="radio"
                          name="ancestry-legend"
                          value={option.id}
                          onChange={handleFilterChange}
                          defaultChecked={option.defaultChecked}
                          disabled={!isMapInitialized}
                        />
                        <label htmlFor={htmlId}>
                          {option.text}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </form>
            </div>
            <div className="order-2">
              <SearchBar
                mapInstance={mapInstance}
                flyToZoom={6}
                placeholder="Search"
                onBeforeSelect={handleBeforeSearch}
              />
            </div>
          </div>
        </header>
        
        {!isMapSettled && <div className="map-loading">Loading map...</div>}
        
        <div 
          ref={mapContainerRef}
          className="map-container"
          style={{ visibility: isMapSettled ? 'visible' : 'hidden' }}
        />
        
        {clickedFeatureForPopup && (
          <PersonInfoPopup
            featureInfo={clickedFeatureForPopup}
            onClose={() => setClickedFeatureForPopup(null)}
            mapInstance={mapInstance}
          />
        )}
      </div>
    </div>
  );
};

export default AncestryApp;