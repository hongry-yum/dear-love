import mysql from "mysql2/promise";
import crypto from "node:crypto";

const {
  DB_HOST,
  DB_PORT = "3306",
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 2,
      connectTimeout: 8000,
    });
  }
  return pool;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = getPool().query(`
    CREATE TABLE IF NOT EXISTS letters (
      id CHAR(36) PRIMARY KEY,
      title VARCHAR(80) NULL,
      body TEXT NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      radius_m INT NOT NULL,
      place_label VARCHAR(200) NULL,
      owner_token CHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return schemaReady;
}

function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function createLetter(event) {
  const body = JSON.parse(event.body || "{}");
  const title = typeof body.title === "string" ? body.title.slice(0, 80) : null;
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  const lat = parseNum(body.lat);
  const lng = parseNum(body.lng);
  const radius = parseNum(body.radius);
  const placeLabel =
    typeof body.placeLabel === "string" ? body.placeLabel.slice(0, 200) : null;

  if (!text || lat === null || lng === null || !radius || radius <= 0) {
    return json(400, { error: "title/body/lat/lng/radius가 올바르지 않아요." });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json(400, { error: "좌표 범위가 올바르지 않아요." });
  }

  const id = crypto.randomUUID();
  const ownerToken = crypto.randomUUID();

  await ensureSchema();
  await getPool().execute(
    `INSERT INTO letters (id, title, body, lat, lng, radius_m, place_label, owner_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, text, lat, lng, Math.round(radius), placeLabel, ownerToken]
  );

  return json(201, { id, ownerToken });
}

async function listLetters(event) {
  const qs = event.queryStringParameters || {};
  const lat = parseNum(qs.lat);
  const lng = parseNum(qs.lng);
  if (lat === null || lng === null) {
    return json(400, { error: "lat/lng 쿼리 파라미터가 필요해요." });
  }

  await ensureSchema();
  const [rows] = await getPool().query(
    `SELECT id, title, lat, lng, radius_m, place_label, created_at
     FROM letters ORDER BY created_at DESC LIMIT 500`
  );

  const letters = rows.map((r) => {
    const distance = haversineMeters(lat, lng, r.lat, r.lng);
    return {
      id: r.id,
      title: r.title,
      lat: r.lat,
      lng: r.lng,
      radius: r.radius_m,
      placeLabel: r.place_label,
      createdAt: r.created_at,
      unlocked: distance <= r.radius_m,
      distance,
    };
  });

  return json(200, { letters });
}

async function getLetter(event) {
  const id = event.pathParameters?.id;
  const qs = event.queryStringParameters || {};
  const lat = parseNum(qs.lat);
  const lng = parseNum(qs.lng);
  if (lat === null || lng === null) {
    return json(400, { error: "lat/lng 쿼리 파라미터가 필요해요." });
  }

  await ensureSchema();
  const [rows] = await getPool().execute(
    `SELECT id, title, body, lat, lng, radius_m, place_label, created_at
     FROM letters WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) return json(404, { error: "편지를 찾을 수 없어요." });

  const r = rows[0];
  const distance = haversineMeters(lat, lng, r.lat, r.lng);
  const unlocked = distance <= r.radius_m;

  if (!unlocked) {
    return json(200, {
      id: r.id,
      title: r.title,
      placeLabel: r.place_label,
      radius: r.radius_m,
      createdAt: r.created_at,
      unlocked: false,
      distance,
    });
  }

  return json(200, {
    id: r.id,
    title: r.title,
    body: r.body,
    placeLabel: r.place_label,
    radius: r.radius_m,
    createdAt: r.created_at,
    unlocked: true,
    distance,
  });
}

async function deleteLetter(event) {
  const id = event.pathParameters?.id;
  const body = JSON.parse(event.body || "{}");
  const ownerToken = typeof body.ownerToken === "string" ? body.ownerToken : null;
  if (!ownerToken) return json(400, { error: "ownerToken이 필요해요." });

  await ensureSchema();
  const [result] = await getPool().execute(
    `DELETE FROM letters WHERE id = ? AND owner_token = ?`,
    [id, ownerToken]
  );
  if (result.affectedRows === 0) {
    return json(403, { error: "삭제 권한이 없거나 편지를 찾을 수 없어요." });
  }
  return json(200, { deleted: true });
}

export const handler = async (event) => {
  try {
    switch (event.routeKey) {
      case "POST /letters":
        return await createLetter(event);
      case "GET /letters":
        return await listLetters(event);
      case "GET /letters/{id}":
        return await getLetter(event);
      case "DELETE /letters/{id}":
        return await deleteLetter(event);
      default:
        return json(404, { error: "not found" });
    }
  } catch (err) {
    console.error(err);
    return json(500, { error: "서버 오류가 발생했어요." });
  }
};
