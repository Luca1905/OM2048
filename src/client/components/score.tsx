import styles from "../styles/score.module.css";

export default function Score({ score }: { score: number }) {
  return (
    <div className={styles.score}>
      Score
      <div>{score}</div>
    </div>
  );
}
