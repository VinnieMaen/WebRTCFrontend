import styles from "./styles.module.css";
import animationData from "../../animations/rocket.json";
import Lottie from "react-lottie";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WebWorker from "../../lib/WebWorker";
import myWorker from "../../workers/callWorker.worker";
import { generateCall, setupCall, setupCandidateListener } from "../../lib/RTC";
import { initSocket, socket } from "../../lib/Socket";
import useGeoLocation from "../../hooks/useGeolocation";

export default function Login() {
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>();
  const location = useGeoLocation();

  const navigate = useNavigate();
  const defaultOptions = {
    loop: false,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const handleJoin = async () => {
    const workerInstance = new WebWorker(myWorker);
    if (!name) return alert("Fill in a name!");

    const start = Date.now();

    setLoading(true);

    await setupCall();

    const call = await generateCall(name, location);
    //@ts-expect-error typescript doesnt like webworkers for some reason
    workerInstance.postMessage(call);
    //@ts-expect-error typescript doesnt like webworkers for some reason
    workerInstance.onmessage = (res: {
      data: {
        success: boolean;
        message: string;
        data: {
          accessToken: string;
          id: string;
          callData: { sdpData: string; candidates: string };
        };
      };
    }) => {
      const data: {
        success: boolean;
        message: string;
        data: {
          accessToken: string;
          id: string;
          callData: { sdpData: string; candidates: string };
        };
      } = res.data;
      if (!data) return;
      const timeout = 3000 - Math.abs(start - Date.now()); // Replace this with your second timestamp
      if (data.success) {
        sessionStorage.setItem("accessToken", data.data.accessToken);
        sessionStorage.setItem("user", name);
        sessionStorage.setItem("userID", data.data.id);

        initSocket(data.data.id);

        setupCandidateListener();

        return setTimeout(() => {
          socket.emit("newCallCreated", {
            name,
            callData: data.data.callData,
            loc: location,
            _id: data.data.id,
          });

          navigate("/");
          setLoading(false);
        }, timeout);
      }

      setLoading(false);
      alert(data.message);
    };
  };

  return (
    <div className={styles.container}>
      {!loading ? (
        <div className={styles.content}>
          <div className={styles.text}>
            <h1>Welcome to ChatRTC</h1>
            <p>Pick a cool name</p>
          </div>
          <input
            onChange={(e) => setName(e.target.value.trim())}
            placeholder="name"
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <>
          <Lottie options={defaultOptions} height={200} width={200} />
          <h2>Loading...</h2>
        </>
      )}
    </div>
  );
}
