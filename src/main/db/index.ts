import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import * as schema from "./schema";

const dbPath = path.join(app.getPath("userData"), "app.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });