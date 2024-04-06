import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { Overlay } from "ol";
import { useBeforeunload } from "react-beforeunload";
import React from "react";
import { useNavigate } from "react-router-dom";

const center = fromLonLat([3.717424, 51.05434]);

export default function Home() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string>();

  useBeforeunload(
    React.useCallback(async () => {
      fetch("http://localhost/api/v1/calls/", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + accessToken,
        },
        keepalive: true,
      });
    }, [accessToken])
  );

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");

    if (!token) return navigate("/login");
    setAccessToken(token);

    const map = new Map({
      target: "map",
      controls: [],
      keyboardEventTarget: document,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: center,
        zoom: 8,
      }),
    });

    const markerStyle = new Style({
      image: new Icon({
        src: "/man.png",
        size: [64, 64],
        offset: [0, 0],
        anchor: [0.5, 1],
      }),
    });

    const layer = new VectorLayer({
      source: new VectorSource(),
      style: markerStyle,
    });

    const marker = new Feature({
      geometry: new Point(center), // Replace with your coordinates
    });

    layer.getSource()?.addFeature(marker);

    map.addLayer(layer);

    const container = document.getElementById("popup");
    const content = document.getElementById("popup-content");
    const closer = document.getElementById("popup-closer");

    if (!container) return;
    if (!closer) return;
    if (!content) return;

    const overlay = new Overlay({
      element: container,
    });

    map.addOverlay(overlay);

    map.on("click", (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        const layers = [layer];
        if (layers.includes(layer)) return feature;
      });

      if (feature) {
        const popupContent = `<h3>${feature.get("name")}</h3>`;
        content.innerHTML = popupContent;
        const coordinate = evt.coordinate;
        console.log(feature);
        overlay.setPosition(coordinate);
      }
    });

    closer.addEventListener("click", () => {
      overlay.setPosition(undefined);
    });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.map} id="map"></div>
      <div id="popup" className={styles.olpopup}>
        <a href="#" id="popup-closer" className={styles.olpopupcloser}></a>
        <div id="popup-content"></div>
      </div>
    </div>
  );
}
