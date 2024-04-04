import styles from "./styles.module.css";
import animationData from "../../animations/rocket.json";
import Lottie from "react-lottie";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WebWorker from "../../lib/WebWorker";
import myWorker from "../../workers/callWorker.worker";
import { generateCall, setupCall } from "../../lib/RTC";

export default function Login() {
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>();

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

    const call = await generateCall(name);
    //@ts-expect-error typescript doesnt like webworkers for some reason
    workerInstance.postMessage(call);
    //@ts-expect-error typescript doesnt like webworkers for some reason
    workerInstance.onmessage = (res: {
      data: { success: boolean; message: string };
    }) => {
      const data: { success: boolean; message: string } = res.data;
      if (!data) return;
      const timeout = 3000 - Math.abs(start - Date.now()); // Replace this with your second timestamp
      if (data.success)
        return setTimeout(() => {
          navigate("/");
          setLoading(false);
        }, timeout);
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
