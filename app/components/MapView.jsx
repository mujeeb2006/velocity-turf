// app/components/MapView.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function MapView() {
  const mapRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Google Maps script
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps script"));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) throw new Error("Google Maps API key missing");
        await loadScript(`https://maps.googleapis.com/maps/api/js?key=${apiKey}`);

        if (!isMounted || !mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const { data: turfs, error: fetchError } = await supabase
          .from("turfs")
          .select("id, name, latitude, longitude, sports, base_price, peak_price")
          .eq("status", "live")
          .eq("approved", true);

        if (fetchError) throw fetchError;

        if (turfs) {
          turfs.forEach((t) => {
            if (t.latitude && t.longitude) {
              const marker = new window.google.maps.Marker({
                position: { lat: Number(t.latitude), lng: Number(t.longitude) },
                map,
                title: t.name,
              });
              const info = new window.google.maps.InfoWindow({
                content: `<div style="font-weight:600;">${t.name}</div><div>${t.sports?.join(", ")}</div>`,
              });
              marker.addListener("click", () => info.open(map, marker));
            }
          });
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isMounted) return;
              const userPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              map.setCenter(userPos);
              map.setZoom(12);
              new window.google.maps.Marker({
                position: userPos,
                map,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeWeight: 0,
                },
                title: "Your location",
              });
            },
            () => {
              // Permission denied or error
            }
          );
        }
        if (isMounted) setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) {
          setError(e.message ?? "Unexpected error");
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="flex items-center justify-center py-8">Loading map…</div>;
  if (error) return <div className="p-4 text-red-600">Error loading map: {error}</div>;

  return (
    <div
      ref={mapRef}
      className="w-full h-[600px] rounded-xl shadow-lg overflow-hidden"
    ></div>
  );
}
