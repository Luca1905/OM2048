import type React from "react";
import { memo } from "react";
import type { Tile as TileProps } from "../types/game";
import styles from "./styles/tile.module.css";

import { useMediaQuery } from "react-responsive";
import {
  containerWidthDesktop,
  containerWidthMobile,
  tileCountPerDimension,
} from "../lib/constants";

const Tile: React.FC<TileProps> = memo(({ position, value }) => {
  const isWideScreen = useMediaQuery({ minWidth: 512 });
  const containerWidth = isWideScreen
    ? containerWidthDesktop
    : containerWidthMobile;

  const positionToPixels = (position: number) =>
    (position / tileCountPerDimension) * containerWidth;

  const style = {
    left: positionToPixels(position[0]),
    top: positionToPixels(position[1]),
    zIndex: value,
  };

  return (
    <div className={`${styles.tile} ${styles[`tile${value}`]}`} style={style}>
      {value}
    </div>
  );
});

Tile.displayName = "Tile";

export default Tile;
