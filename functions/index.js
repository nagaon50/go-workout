const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

const REGION = "asia-northeast3";
const ALLOWED_ORIGINS = new Set([
  "https://nagaon50.github.io",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
]);

function send(res, status, payload) {
  res.set("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function parseValue(value) {
  if (typeof value !== "string") return value ?? null;
  try { return JSON.parse(value); } catch (_) { return value; }
}

exports.workoutReadApi = onRequest(
  { region: REGION, cors: false, maxInstances: 5, memory: "256MiB" },
  async (req, res) => {
    const origin = req.get("origin");
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    }

    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: "origin_not_allowed" });

    const authHeader = req.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return send(res, 401, { error: "missing_bearer_token" });

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(match[1], true);
    } catch (_) {
      return send(res, 401, { error: "invalid_or_expired_token" });
    }

    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : null;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : null;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
      return send(res, 400, { error: "date_must_be_YYYY_MM_DD" });
    }
    if (startDate && endDate && startDate > endDate) {
      return send(res, 400, { error: "startDate_after_endDate" });
    }

    try {
      const db = getFirestore();
      const snapshot = await db
        .collection("users").doc(decoded.uid)
        .collection("appData").get();

      const records = [];
      snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const key = typeof data.key === "string" ? data.key : doc.id;
        const isBody = key === "body:records";
        const isWorkout = key.startsWith("workout:");
        if (!isBody && !isWorkout) return;

        if (isWorkout) {
          const date = key.split(":")[1];
          if (startDate && date < startDate) return;
          if (endDate && date > endDate) return;
        }

        records.push({
          key,
          type: isBody ? "body" : "workout",
          value: parseValue(data.value),
          updatedAtMs: Number(data.updatedAtMs || 0),
        });
      });

      records.sort((a, b) => a.key.localeCompare(b.key));
      return send(res, 200, {
        schemaVersion: 1,
        user: { uid: decoded.uid },
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Workout read API failed", error);
      return send(res, 500, { error: "internal_error" });
    }
  }
);
