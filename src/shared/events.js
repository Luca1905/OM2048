"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storedStateSchema = exports.gameIDSchema = void 0;
var v4_1 = require("zod/v4");
exports.gameIDSchema = v4_1.z.uuidv4();
exports.storedStateSchema = v4_1.z.number().nullable().array().array();
