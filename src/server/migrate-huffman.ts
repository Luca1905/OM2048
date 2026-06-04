import SuperJSON from "superjson";
import { storedStateSchema } from "../shared/events";
import { encodeBoard, isHuffmanEncoded } from "../shared/huffman";
import { redis } from "./redis";

const REDIS_GAME_PREFIX = "game:";
const BATCH_SIZE = 100;

async function migrate() {
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const keys of redis.scanIterator({
    TYPE: "string",
    MATCH: `${REDIS_GAME_PREFIX}*`,
    COUNT: BATCH_SIZE,
  })) {
    if (keys.length === 0) continue;

    const values = await redis.MGET(keys);
    const pipeline = redis.multi();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const raw = values[i];
      if (!raw) continue;

      if (isHuffmanEncoded(raw)) {
        skipped++;
        continue;
      }

      try {
        const board = storedStateSchema.parse(SuperJSON.parse(raw));
        const encoded = encodeBoard(board);
        pipeline.set(key, encoded);
        migrated++;
      } catch (err) {
        failed++;
        console.error(`Failed to migrate ${key}:`, err);
      }
    }

    await pipeline.exec();
    console.log(
      `Progress: ${migrated} migrated, ${skipped} already encoded, ${failed} failed`,
    );
  }

  console.log(
    `Migration complete: ${migrated} migrated, ${skipped} skipped, ${failed} failed`,
  );
  process.exit(0);
}

migrate();
