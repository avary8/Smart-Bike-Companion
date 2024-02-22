import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
//import Map, { NavigationControl } from "react-map-gl/maplibre";

const apiKey = import.meta.env.VITE_MAP_API_KEY;
const mapName = import.meta.env.VITE_MAP_NAME;
const region = import.meta.env.VITE_AWS_REGION;

type Props = {
  lat: number;
  long: number;
};

const Map: React.FC<Props> = ({ lat, long }) => {
  console.log(region)
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css';
    link.rel = 'stylesheet';
    document.body.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.js';
    script.async = true;
    document.body.appendChild(script);
    
    const map = new maplibregl.Map({
      container: "map",
      style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`,
      center: [0, 0],
      zoom: 1,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-left");

    if (lat && long){
      new maplibregl.Marker()
      .setLngLat([long, lat])
      .addTo(map);
    }
   }, []);

  return (
    <div id="map" style={{ width: '100%', height: '70vh' }} />
  );
};

export default Map;
