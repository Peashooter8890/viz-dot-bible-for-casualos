import React, { useState, useEffect, useCallback, useRef } from 'react';
import './journeys-styles.css';
const getStyleOf = () => {}

// Access CDN libraries as globals
const mapboxgl = window.mapboxgl;

// Constants
const MAPBOX_TOKEN = "pk.eyJ1IjoiYmlibGV2aXoiLCJhIjoiY2pjOTVhazJ1MDlqbzMzczFoamd3MzFnOSJ9.7k1RJ5oh-LNaYuADxsgx4Q";
const ANCIENT_STYLE = "mapbox://styles/bibleviz/cjh46bcmp2udj2sq5ifg79zkh";
const MODERN_STYLE = "mapbox://styles/bibleviz/ckasadcu90f1w1jn0jip45knz";
const INTERACTIVE_LAYER_IDS = ["journey-places"];

const initialViewState = {
  longitude: 28.976205,
  latitude: 36.434199,
  zoom: 5.3,
  bearing: 0,
  pitch: 0
};

// Utility functions
const throttle = (fn, delay) => {
  let run = false;
  return function (...args) {
    if (!run) {
      fn(...args);
      run = true;
      setTimeout(() => run = false, delay);
    }
  };
};

const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// ComparisonSlider Component
const ComparisonSlider = ({ 
  leftMap, 
  rightMap, 
  defaultValue = 85, 
  onValueChange,
  aspectRatio = 16/9 
}) => {
  const [sliderValue, setSliderValue] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleSliderChange = (newValue) => {
    setSliderValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    handleSliderChange(percentage);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const clipPath = `polygon(${sliderValue}% 0, 100% 0%, 100% 100%, ${sliderValue}% 100%)`;
  const padding = (1 / aspectRatio) * 100;

  return (
    <div 
      ref={containerRef}
      className="comparison-slider" 
      style={{ paddingBottom: `${padding}%` }}
    >
      <div className="map-container-absolute">
        {leftMap}
      </div>
      <div 
        className="map-container-absolute"
        style={{ clipPath }}
      >
        {rightMap}
      </div>
      
      {/* Slider Handle */}
      <div 
        className="slider-handle"
        style={{ left: `${sliderValue}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="handle-line-before"></div>
        <div className="handle-circle">
          <div className="handle-arrow-left"></div>
          <div className="handle-arrow-right"></div>
        </div>
        <div className="handle-line-after"></div>
      </div>
    </div>
  );
};

// RouteSelectButtonGroup Component
const RouteSelectButtonGroup = ({ leftMapInstance, rightMapInstance }) => {
  const [activeRoute, setActiveRoute] = useState('all');

  const options = [
    {
      id: "first",
      borderColor: "border-indigo-600",
      activeColor: "peer-checked:bg-indigo-600 peer-checked:text-white",
      text: "FIRST",
    },
    {
      id: "second", 
      borderColor: "border-green-600",
      activeColor: "peer-checked:bg-green-600 peer-checked:text-white",
      text: "SECOND",
    },
    {
      id: "third",
      borderColor: "border-purple-700", 
      activeColor: "peer-checked:bg-purple-700 peer-checked:text-white",
      text: "THIRD",
    },
    {
      id: "rome",
      borderColor: "border-orange-500",
      activeColor: "peer-checked:bg-orange-500 peer-checked:text-white", 
      text: "ROME",
    },
    {
      id: "all",
      borderColor: "border-gray-300",
      activeColor: "peer-checked:bg-gray-300 peer-checked:text-black",
      text: "ALL",
    },
  ];

  const handleRouteChange = (event) => {
    const { value } = event.target;
    setActiveRoute(value);

    if (!leftMapInstance || !rightMapInstance) return;

    const toggleLayers = (layerName) => {
      ["first", "second", "third", "rome"].forEach((currentLayer) => {
        const isVisible = (layerName === "all" || currentLayer === layerName) ? "visible" : "none";
        
        // Toggle on left map (ancient)
        if (leftMapInstance.getLayer(currentLayer + "-journey")) {
          leftMapInstance.setLayoutProperty(currentLayer + "-journey", "visibility", isVisible);
        }
        if (leftMapInstance.getLayer(currentLayer + "-journey-arrows")) {
          leftMapInstance.setLayoutProperty(currentLayer + "-journey-arrows", "visibility", isVisible);
        }
        
        // Toggle on right map (modern)
        if (rightMapInstance.getLayer(currentLayer + "-journey")) {
          rightMapInstance.setLayoutProperty(currentLayer + "-journey", "visibility", isVisible);
        }
        if (rightMapInstance.getLayer(currentLayer + "-journey-arrows")) {
          rightMapInstance.setLayoutProperty(currentLayer + "-journey-arrows", "visibility", isVisible);
        }
      });
    };

    const toggleSites = (layerName) => {
      if (layerName === 'all') {
        leftMapInstance.setFilter("journey-places", [
          "any",
          ["has", "first"],
          ["has", "second"], 
          ["has", "third"],
          ["has", "rome"]
        ]);
      } else {
        leftMapInstance.setFilter("journey-places", ["has", value]);
      }
    };

    toggleLayers(value);
    toggleSites(value);
  };

  return (
    <form>
      <ul className="route-legend">
        {options.map((option) => {
          const htmlId = `route-${option.id}`;
          return (
            <li key={option.id}>
              <input
                onChange={handleRouteChange}
                className="sr-only peer"
                type="radio"
                value={option.id}
                name="filter"
                id={htmlId}
                defaultChecked={option.id === 'all'}
              />
              <label 
                htmlFor={htmlId} 
                className={classNames(
                  'route-label',
                  option.borderColor,
                  option.activeColor
                )}
              >
                {option.text}
              </label>
            </li>
          );
        })}
      </ul>
    </form>
  );
};

// Popup Component
const JourneyPopup = ({ popupInfo, onClose, mapInstance }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    if (popupInfo && mapInstance) {
      if (popupRef.current) {
        popupRef.current.setLngLat([popupInfo.longitude, popupInfo.latitude]);
      } else {
        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
          anchor: 'bottom'
        })
        .setLngLat([popupInfo.longitude, popupInfo.latitude])
        .addTo(mapInstance);

        popup.on('close', onClose);
        popupRef.current = popup;
      }
    }

    return () => {
      if (!popupInfo && popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [popupInfo, mapInstance, onClose]);

  useEffect(() => {
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (popupRef.current && popupInfo) {
      const formatVerseLinks = (verses) => {
        if (!verses || verses.length === 0) return '';
        return verses.map(verse => 
          `<a class="verse-link" href="${verse.url}" target="_blank" rel="noreferrer">${verse.text}</a>`
        ).join(', ');
      };

      const renderVerseSection = (text, verses) => {
        if (!verses || verses.length === 0) return '';
        return `<div class="verse-section">${text}: ${formatVerseLinks(verses)}</div>`;
      };

      const popupContent = `
        <div class="popup-content">
          <div class="popup-title">${popupInfo.name}</div>
          ${renderVerseSection('First Journey', popupInfo.first)}
          ${renderVerseSection('Second Journey', popupInfo.second)}
          ${renderVerseSection('Third Journey', popupInfo.third)}
          ${renderVerseSection('Rome Journey', popupInfo.rome)}
          ${popupInfo.notes ? `<div class="popup-notes">${popupInfo.notes}</div>` : ''}
          <div class="popup-source">
            More: <a class="popup-link" target="_blank" href="${popupInfo.url}">${popupInfo.source}</a>
          </div>
        </div>
      `;

      popupRef.current.setHTML(popupContent);
    }
  }, [popupInfo]);

  return null;
};

// Main JourneysApp Component
const JourneysApp = () => {
  const [leftMapInstance, setLeftMapInstance] = useState(null);
  const [rightMapInstance, setRightMapInstance] = useState(null);
  const [viewState, setViewState] = useState(initialViewState);
  const [activeMap, setActiveMap] = useState('left');
  const [popupInfo, setPopupInfo] = useState(null);
  const [cursor, setCursor] = useState('');
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [isMapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef(null);
  const leftMapRef = useRef(null);
  const rightMapRef = useRef(null);

  const throttledSetViewState = throttle(setViewState, 25);

  const getMapContainerSize = () => {
    const newWidth = mapContainerRef.current?.clientWidth ?? 0;
    const newHeight = mapContainerRef.current?.clientHeight ?? 0;
    if (newWidth * newHeight !== 0) setAspectRatio(newWidth / newHeight);
  };

  const syncMaps = (sourceMap, targetMap, newViewState) => {
    targetMap.flyTo({
      center: [newViewState.longitude, newViewState.latitude],
      zoom: newViewState.zoom,
      bearing: newViewState.bearing ?? 0,
      pitch: newViewState.pitch ?? 0,
      essential: true
    });
  };

  const handleMapMove = useCallback((mapType) => (e) => {
    const center = e.target.getCenter();
    const zoom = e.target.getZoom();
    const bearing = e.target.getBearing();
    const pitch = e.target.getPitch();

    const newViewState = {
      longitude: center.lng,
      latitude: center.lat,
      zoom,
      bearing,
      pitch
    };

    throttledSetViewState(newViewState);

    // Sync the other map
    if (mapType === 'left' && rightMapInstance && activeMap === 'left') {
      syncMaps(leftMapInstance, rightMapInstance, newViewState);
    } else if (mapType === 'right' && leftMapInstance && activeMap === 'right') {
      syncMaps(rightMapInstance, leftMapInstance, newViewState);
    }
  }, [leftMapInstance, rightMapInstance, activeMap, throttledSetViewState]);

  const handleClick = useCallback((event) => {
    event.originalEvent.stopPropagation();
    const feature = event.features && event.features[0];

    if (feature) {
      const { lat: latitude, lng: longitude } = event.lngLat;
      const {
        Notes: notes,
        'Place Name': name,
        'Source Link': source,
        rome,
        first,
        second,
        third,
      } = feature.properties;

      const formatter = act => ({
        url: `https://www.blueletterbible.org/kjv/act/${act.toLowerCase().replaceAll('acts.', '').replaceAll('.', '/')}`,
        text: act.replace('Acts.', 'Acts ').replaceAll('.', ':'),
      });

      const formatActs = (acts) => acts && acts.split(',').map(formatter);

      setPopupInfo({
        name,
        notes,
        url: source,
        source: source.split('://')[1] ?? '',
        latitude,
        longitude,
        first: formatActs(first),
        second: formatActs(second),
        third: formatActs(third),
        rome: formatActs(rome),
      });
    } else {
      setPopupInfo(null);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    setCursor('pointer');
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor('');
  }, []);

  // Initialize maps
  useEffect(() => {
    if (!mapContainerRef.current || leftMapInstance || rightMapInstance) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Create left map (ancient)
    const leftMap = new mapboxgl.Map({
      container: leftMapRef.current,
      style: ANCIENT_STYLE,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      bearing: initialViewState.bearing,
      pitch: initialViewState.pitch
    });

    // Create right map (modern)  
    const rightMap = new mapboxgl.Map({
      container: rightMapRef.current,
      style: MODERN_STYLE,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      bearing: initialViewState.bearing,
      pitch: initialViewState.pitch
    });

    // Add navigation control to right map
    rightMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    let mapsLoaded = 0;
    const onMapLoad = () => {
      mapsLoaded++;
      if (mapsLoaded === 2) {
        setMapLoaded(true);
        getMapContainerSize();
      }
    };

    leftMap.on('load', onMapLoad);
    rightMap.on('load', onMapLoad);

    // Set up interactions on left map only
    leftMap.on('click', INTERACTIVE_LAYER_IDS, handleClick);
    leftMap.on('mouseenter', INTERACTIVE_LAYER_IDS, handleMouseEnter);
    leftMap.on('mouseleave', INTERACTIVE_LAYER_IDS, handleMouseLeave);

    // Set up move handlers
    leftMap.on('movestart', () => setActiveMap('left'));
    rightMap.on('movestart', () => setActiveMap('right'));
    leftMap.on('move', handleMapMove('left'));
    rightMap.on('move', handleMapMove('right'));

    // Update cursor
    leftMap.on('render', () => {
      leftMap.getCanvas().style.cursor = cursor;
    });

    setLeftMapInstance(leftMap);
    setRightMapInstance(rightMap);

    return () => {
      leftMap.remove();
      rightMap.remove();
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", getMapContainerSize);
    return () => window.removeEventListener("resize", getMapContainerSize);
  }, []);

  if (!MAPBOX_TOKEN) return null;

  return (
    <>
      <style>{getStyleOf('style.css')}</style>
      <div className="page-container">
        <div className="content-wrapper">
          <header className="header">
            <h1>Paul's Journeys</h1>
            <div className="header-controls">
              <RouteSelectButtonGroup 
                leftMapInstance={leftMapInstance} 
                rightMapInstance={rightMapInstance} 
              />
            </div>
          </header>

          {!isMapLoaded && <div className="map-loading">Loading maps...</div>}

          <div 
            ref={mapContainerRef}
            className="map-container"
            style={{ visibility: isMapLoaded ? 'visible' : 'hidden' }}
          >
            <ComparisonSlider
              aspectRatio={aspectRatio}
              leftMap={
                <div 
                  ref={leftMapRef}
                  className="map-instance"
                />
              }
              rightMap={
                <div 
                  ref={rightMapRef}
                  className="map-instance"
                />
              }
            />
          </div>

          {popupInfo && (
            <JourneyPopup
              popupInfo={popupInfo}
              onClose={() => setPopupInfo(null)}
              mapInstance={leftMapInstance}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default JourneysApp;