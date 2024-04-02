import styles from "./styles.module.css";
import animationData from "../../animations/rocket.json";
import Lottie from "react-lottie";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loading, setLoading] = useState<boolean>(false);

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
    setLoading(true);
    setTimeout(() => {
      navigate("/");
    }, 3000);
  };

  return (
    <div className={styles.container}>
      {!loading ? (
        <div className={styles.content}>
          <div className={styles.text}>
            <h1>Welcome to ChatRTC</h1>
            <p>Pick a cool name</p>
          </div>
          <input placeholder="name" />
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
