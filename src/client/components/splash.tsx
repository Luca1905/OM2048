import styles from "../styles/splash.module.css";

export default function Splash({ heading = "You won!", type = "" }) {
  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
      </div>
    </div>
  );
}
