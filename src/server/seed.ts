import { v4 as uuid } from "uuid";
import type { StoredState } from "../shared/events";
import { encodeBoard } from "../shared/huffman";
import { redis } from "./redis";

const REDIS_GAME_PREFIX = "game:";
const BATCH_SIZE = 100;

const INITIAL_BOARD: StoredState = [
  [null, null, null, 2],
  [null, null, null, null],
  [null, null, null, null],
  [2, null, null, null],
];

const count = Number.parseInt(process.argv[2] ?? "2048", 10);

if (Number.isNaN(count) || count < 1) {
  console.error("Usage: bun run seed [count]");
  console.error("  count: number of games to seed (default: 2048)");
  process.exit(1);
}

async function seed() {
  console.log(`Seeding ${count} games...`);
  const encoded = encodeBoard(INITIAL_BOARD);
  let created = 0;

  while (created < count) {
    const batchSize = Math.min(BATCH_SIZE, count - created);
    const pipeline = redis.multi();

    for (let i = 0; i < batchSize; i++) {
      const id = uuid();
      pipeline.set(`${REDIS_GAME_PREFIX}${id}`, encoded);
    }

    await pipeline.exec();
    created += batchSize;
    console.log(`Progress: ${created}/${count}`);
  }

  console.log(`Seeded ${count} games.`);
  process.exit(0);
}

seed();
