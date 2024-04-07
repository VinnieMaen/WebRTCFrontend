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
import { socket } from "../../lib/Socket";
import { answerCall, endCall, localStream, remoteStream } from "../../lib/RTC";

const center = fromLonLat([3.717424, 51.05434]);

export default function Home() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string>();
  const [curUser, setCurUser] = useState<string>("");

  const webcam: HTMLVideoElement = document.getElementById(
    "webcamVideo"
  ) as HTMLVideoElement;

  const remote: HTMLVideoElement = document.getElementById(
    "remoteVideo"
  ) as HTMLVideoElement;

  if (webcam && remote) {
    webcam.srcObject = localStream;
    remote.srcObject = remoteStream;
  }

  const handleCallClick = async (event: Event) => {
    const target = event.target as HTMLButtonElement;
    const calls = await getCalls();
    const call = calls.find(
      (item: { _id: string }) => item._id === target?.getAttribute("data-id")
    );
    answerCall(call.sdpData, call.candidates, call._id);
  };

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
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("userID");
    }, [accessToken])
  );

  const getCalls = async () => {
    const token = sessionStorage.getItem("accessToken");

    if (!token) return navigate("/login");
    setAccessToken(token);

    const res = await fetch("http://localhost/api/v1/calls/", {
      method: "GET",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token,
      },
    });

    const json = await res.json();
    if (json.success) return json.data;
    return [];
  };

  const addMarker = (item: {
    name: string;
    callData: { sdpData: string; candidates: string };
    loc: { lon: number; lat: number };
    status: string;
    _id: string;
  }) => {
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
      name: item.name,
      callData: item.callData,
      status: item.status,
      id: item._id,
      geometry: new Point(fromLonLat([item.loc.lon, item.loc.lat])), // Replace with your coordinates
    });

    layer.getSource()?.addFeature(marker);
    return layer;
  };

  useEffect(() => {
    (async () => {
      const token = sessionStorage.getItem("accessToken");
      const user = sessionStorage.getItem("user");

      if (!token || !user) return navigate("/login");
      setCurUser(user);

      const calls = await getCalls();

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

      socket.on("newCall", (args) => {
        const layer = addMarker(args);
        map.addLayer(layer);
      });

      calls?.forEach(
        (item: {
          name: string;
          callData: { sdpData: string; candidates: string };
          sdpData: string;
          candidates: string;
          loc: { lon: number; lat: number };
          status: string;
          _id: string;
        }) => {
          item.callData = {
            sdpData: item.sdpData,
            candidates: item.candidates,
          };

          const layer = addMarker(item);
          map.addLayer(layer);
        }
      );

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
        const feature = map.forEachFeatureAtPixel(
          evt.pixel,
          (feature, layer) => {
            const layers = [layer];
            if (layers.includes(layer)) return feature;
          }
        );

        if (feature) {
          const popupContent = `<h3>${feature.get("name")}</h3><p>${
            feature.get("status") ? feature.get("status") : "Available"
          }</p><button id="callBtn" data-id=${feature.get("id")}>Call</button>`;
          content.innerHTML = popupContent;
          const coordinate = evt.coordinate;
          overlay.setPosition(coordinate);

          const callBtn = document.getElementById("callBtn");
          callBtn?.removeEventListener("click", handleCallClick);
          callBtn?.addEventListener("click", handleCallClick);
        }
      });

      closer.addEventListener("click", () => {
        content.innerHTML = "";
        overlay.setPosition(undefined);
      });
    })();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>ChatRTC</h1>
        <h2>Welcome {curUser}</h2>
        <ul className={styles.menu}>
          <li>Set Status</li>
          <li>Logout</li>
        </ul>
      </div>
      <video
        className={styles.myVideo}
        muted
        id="webcamVideo"
        autoPlay
        playsInline
      ></video>
      <button
        onClick={() => {
          if (!accessToken) return null;
          endCall(accessToken);
        }}
        className={styles.endCallBtn}
      >
        End Call
      </button>
      <video
        className={styles.yourVideo}
        id="remoteVideo"
        autoPlay
        playsInline
      ></video>
      <div className={styles.map} id="map"></div>
      <div id="popup" className={styles.olpopup}>
        <a href="#" id="popup-closer" className={styles.olpopupcloser}></a>
        <div id="popup-content"></div>
      </div>
    </div>
  );
}
