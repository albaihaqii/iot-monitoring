const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const round1 = (v) => (v === null ? null : +v.toFixed(1));

// POST /api/readings : terima data dari perangkat
app.post("/api/readings", (req, res) => {
  const { device_id, suhu, kelembapan } = req.body || {};

  if (!isNum(suhu) || !isNum(kelembapan)) {
    return res
      .status(400)
      .json({ error: "suhu dan kelembapan harus berupa angka" });
  }
  if (suhu < -40 || suhu > 80) {
    return res
      .status(400)
      .json({ error: "suhu harus di antara -40 dan 80 °C" });
  }
  if (kelembapan < 0 || kelembapan > 100) {
    return res
      .status(400)
      .json({ error: "kelembapan harus di antara 0 dan 100 %" });
  }

  const id =
    typeof device_id === "string" && device_id.trim()
      ? device_id.trim()
      : "GH-01";

  const info = db
    .prepare(
      "INSERT INTO readings (device_id, suhu, kelembapan) VALUES (?, ?, ?)",
    )
    .run(id, suhu, kelembapan);

  const saved = db
    .prepare("SELECT * FROM readings WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(saved);
});

// GET /api/readings/latest : data terbaru
app.get("/api/readings/latest", (req, res) => {
  const row = db
    .prepare("SELECT * FROM readings ORDER BY id DESC LIMIT 1")
    .get();
  if (!row) return res.status(404).json({ error: "Belum ada data" });
  res.json(row);
});

// GET /api/readings?limit=20 : riwayat N data terakhir (terbaru dulu)
app.get("/api/readings", (req, res) => {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const rows = db
    .prepare("SELECT * FROM readings ORDER BY id DESC LIMIT ?")
    .all(limit);
  res.json(rows);
});

// GET /api/stats : rata-rata, min, max
app.get("/api/stats", (req, res) => {
  const s = db
    .prepare(
      `SELECT COUNT(*) AS jumlah,
              AVG(suhu) AS suhu_avg, MIN(suhu) AS suhu_min, MAX(suhu) AS suhu_max,
              AVG(kelembapan) AS kel_avg, MIN(kelembapan) AS kel_min, MAX(kelembapan) AS kel_max
        FROM readings`,
    )
    .get();

  res.json({
    jumlah: s.jumlah,
    suhu: { rata_rata: round1(s.suhu_avg), min: s.suhu_min, max: s.suhu_max },
    kelembapan: {
      rata_rata: round1(s.kel_avg),
      min: s.kel_min,
      max: s.kel_max,
    },
  });
});

// JSON body rusak -> 400 berupa JSON
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Body bukan JSON yang valid" });
  }
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
