import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
//import Map, { NavigationControl } from "react-map-gl/maplibre";
import BikeIcon from '@mui/icons-material/PedalBike';
import { SvgIcon } from '@mui/material';
import ReactDOM from 'react-dom';

const apiKey = import.meta.env.VITE_MAP_API_KEY;
const mapName = import.meta.env.VITE_MAP_NAME;
const region = import.meta.env.VITE_AWS_REGION;

type Props = {
  vehicle: {
    lat: string;
    long: string;
  }
};


const mapContainerRef = useRef<HTMLDivElement>(null);
const mapInstanceRef = useRef<maplibregl.Map | null>(null);
const [mapInitialized, setMapInitialized] = useState(false);
const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);


const getUserLoc = (()=>{
  if (mapInstanceRef?.current){
    mapInstanceRef.current.on('locationfound', (e) => {
      setUserLocation({ lat: e.coords.latitude, long: e.coords.longitude });
    });
  }
  return userLocation;
})



const Map: React.FC<Props> = ({ vehicle }) => {
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

    mapInstanceRef.current.on('locationfound', (e) => {
      setUserLocation({ lat: e.coords.latitude, long: e.coords.longitude });
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
      const markerElement = document.createElement('div');
      ReactDOM.render(<SvgIcon><BikeIcon style={{ color: 'red'  }}/></SvgIcon>, markerElement);

      new maplibregl.Marker(markerElement)
        .setLngLat([parseFloat(vehicle.long), parseFloat(vehicle.lat)])
        .addTo(mapInstanceRef.current);
    }
  }, [vehicle, mapInitialized]);

  return <div ref={mapContainerRef} style={{ borderRadius: '10px', width: '82vw', height: '78vw' }} />;
};

export default {
  Map, 
  getUserLoc
}