import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
//import Map, { NavigationControl } from "react-map-gl/maplibre";

const apiKey = process.env.REACT_APP_MAP_API_KEY;
const mapName = process.env.REACT_APP_MAP_NAME;
const region = process.env.REACT_APP_AWS_REGION;

// type Props = {
//   vehicle: {
//     lat: string;
//     long: string;
//   }
// };

export function useMapRefs() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  return { mapContainerRef, mapInstanceRef };
}


const GetUserLoc = async () => {
  var userLoc;
  const { mapInstanceRef } = useMapRefs();
    if (mapInstanceRef?.current) {
      mapInstanceRef.current.on('locationfound', (e) => {
        userLoc = { lat: e.coords.latitude, long: e.coords.longitude };
      });
      return userLoc;
    }
};


const Map = ({ vehicle }) => {
  const [mapInitialized, setMapInitialized] = useState(false);
  const { mapContainerRef, mapInstanceRef } = useMapRefs();
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapInstanceRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`,
      center: [-96, 37.8],
      zoom: 1.5
    });

    mapInstanceRef.current.addControl(new maplibregl.NavigationControl(), "top-left");
    mapInstanceRef.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      })
    );

    mapInstanceRef.current.on('load', () => {
      setMapInitialized(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInitialized && mapInstanceRef.current && vehicle.lat && vehicle.long) {
      new maplibregl.Marker()
        .setLngLat([parseFloat(vehicle.long), parseFloat(vehicle.lat)])
        .addTo(mapInstanceRef.current);
    }
  }, [vehicle, mapInitialized]);

  return <div ref={mapContainerRef} style={{ borderRadius: '10px', width: '82vw', height: '78vw' }} />;
};

export default {
  Map, 
  GetUserLoc
}