import type { StoredState } from "./events";

// Static Huffman codes for 2048 board cell values.
// Frequencies: null >> 2 > 4 > 8 > 16 > 32 > 64 > 128 > 256 > 512 > 1024 > 2048
const ENCODE_TABLE: Map<number | null, string> = new Map([
  [null, "0"],
  [2, "100"],
  [4, "101"],
  [8, "1100"],
  [16, "1101"],
  [32, "11100"],
  [64, "11101"],
  [128, "111100"],
  [256, "111101"],
  [512, "111110"],
  [1024, "1111110"],
  [2048, "1111111"],
]);

interface DecodeNode {
  value?: number | null;
  children?: { "0"?: DecodeNode; "1"?: DecodeNode };
}

function buildDecodeTree(): DecodeNode {
  const root: DecodeNode = { children: {} };
  for (const [value, code] of ENCODE_TABLE) {
    let node = root;
    for (const bit of code) {
      if (!node.children) node.children = {};
      const key = bit as "0" | "1";
      if (!node.children[key]) node.children[key] = { children: {} };
      node = node.children[key]!;
    }
    node.value = value;
    node.children = undefined;
  }
  return root;
}

const DECODE_TREE = buildDecodeTree();

const HUFFMAN_PREFIX = "HUF:";

export function encodeBoard(board: StoredState): string {
  let bits = "";
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = board[y]?.[x] ?? null;
      const code = ENCODE_TABLE.get(cell);
      if (code === undefined) {
        throw new Error(`No Huffman code for value: ${cell}`);
      }
      bits += code;
    }
  }

  // Pad to byte boundary
  const padLen = (8 - (bits.length % 8)) % 8;
  bits += "0".repeat(padLen);

  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }

  // Encode: prefix + padLen (1 char) + base64 payload
  const base64 = btoa(String.fromCharCode(...bytes));
  return `${HUFFMAN_PREFIX}${padLen}${base64}`;
}

export function decodeBoard(encoded: string): StoredState {
  const padLen = Number.parseInt(encoded[HUFFMAN_PREFIX.length]!, 10);
  const base64 = encoded.slice(HUFFMAN_PREFIX.length + 1);
  const binary = atob(base64);

  let bits = "";
  for (let i = 0; i < binary.length; i++) {
    bits += binary.charCodeAt(i).toString(2).padStart(8, "0");
  }

  // Remove padding bits
  if (padLen > 0) {
    bits = bits.slice(0, -padLen);
  }

  const board: StoredState = [];
  let pos = 0;
  for (let y = 0; y < 4; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < 4; x++) {
      let node: DecodeNode = DECODE_TREE;
      while (node.children) {
        const bit = bits[pos++] as "0" | "1";
        const next = node.children[bit];
        if (!next) throw new Error(`Invalid Huffman data at bit ${pos - 1}`);
        node = next;
      }
      row.push(node.value!);
    }
    board.push(row);
  }

  return board;
}
