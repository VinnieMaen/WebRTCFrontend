import { useEffect } from "react";
import { useState } from "react";

export default function useGeoLocation() {
  const [locationData, setLocationData] = useState<{
    lat: number;
    lon: number;
  }>();

  useEffect(() => {
    getLocation();
  }, []);

  async function getLocation() {
    const res = await fetch("http://ip-api.com/json");
    if (res.status === 200) {
      const json = (await res.json()) as { lat: number; lon: number };
      setLocationData(json);
    }
  }

  return {
    lat: locationData?.lat,
    lon: locationData?.lon,
  };
}
