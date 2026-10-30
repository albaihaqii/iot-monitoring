const INTERVAL = 5000; // polling tiap 5 detik
const BATAS_PANAS = 35; // suhu > 35 = Panas
const BATAS_ONLINE = 30000; // data terakhir < 30 detik = Online

const el = (id) => document.getElementById(id);

// created_at dari SQLite berformat UTC tanpa zona: "2026-10-30 06:42:49"
function parseWaktu(str) {
  return new Date(str.replace(" ", "T") + "Z");
}
function formatWaktu(date) {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
}
function formatJam(date) {
  return date.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
}
const angka = (v, satuan) =>
  v === null || v === undefined ? "-" : Number(v).toFixed(1) + satuan;

const grafik = new Chart(el("grafik"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Suhu (°C)",
        data: [],
        borderColor: "#dc2626",
        backgroundColor: "#dc2626",
        yAxisID: "y",
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: "Kelembapan (%)",
        data: [],
        borderColor: "#2563eb",
        backgroundColor: "#2563eb",
        yAxisID: "y1",
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { position: "top" } },
    scales: {
      y: { position: "left", title: { display: true, text: "Suhu (°C)" } },
      y1: {
        position: "right",
        title: { display: true, text: "Kelembapan (%)" },
        grid: { drawOnChartArea: false },
      },
    },
  },
});

async function ambil(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " -> " + res.status);
  return res.json();
}

function setStatusPerangkat(waktu) {
  const online = waktu !== null && Date.now() - waktu.getTime() < BATAS_ONLINE;
  document.querySelectorAll(".js-status").forEach((b) => {
    b.textContent = online ? "Online" : "Offline";
    b.classList.toggle("online", online);
    b.classList.toggle("offline", !online);
  });
}

function tampilKartu(d) {
  const panas = d.suhu > BATAS_PANAS;
  const waktu = formatWaktu(parseWaktu(d.created_at));

  el("nilai-suhu").textContent = d.suhu.toFixed(1) + " °C";
  const pill = el("status-suhu");
  pill.textContent = panas ? "Panas" : "Normal";
  pill.className = "pill " + (panas ? "hot" : "ok");
  el("kartu-suhu").classList.toggle("panas", panas);
  el("waktu-suhu").textContent = "Diperbarui: " + waktu;

  el("nilai-kelembapan").textContent = d.kelembapan.toFixed(1) + " %";
  el("waktu-kelembapan").textContent = "Diperbarui: " + waktu;

  el("info-device").textContent = d.device_id;
  el("info-terakhir").textContent = waktu;
}

function tampilGrafik(riwayat) {
  // API mengirim terbaru dulu; grafik harus lama -> baru
  const urut = [...riwayat].reverse();
  grafik.data.labels = urut.map((r) => formatJam(parseWaktu(r.created_at)));
  grafik.data.datasets[0].data = urut.map((r) => r.suhu);
  grafik.data.datasets[1].data = urut.map((r) => r.kelembapan);
  grafik.update();
}

function tampilTabel(rows) {
  const tbody = el("tabel-body");
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const panas = r.suhu > BATAS_PANAS;
    const tr = document.createElement("tr");

    [
      formatWaktu(parseWaktu(r.created_at)),
      r.device_id,
      r.suhu.toFixed(1),
      r.kelembapan.toFixed(1),
    ].forEach((teks) => {
      const td = document.createElement("td");
      td.textContent = teks;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill " + (panas ? "hot" : "ok");
    pill.textContent = panas ? "Panas" : "Normal";
    tdStatus.appendChild(pill);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

function tampilStats(s) {
  el("avg-suhu").textContent = angka(s.suhu.rata_rata, " °C");
  el("avg-suhu-ket").textContent =
    "Min " + angka(s.suhu.min, "") + " · Maks " + angka(s.suhu.max, "");
  el("avg-kel").textContent = angka(s.kelembapan.rata_rata, " %");
  el("avg-kel-ket").textContent =
    "Min " +
    angka(s.kelembapan.min, "") +
    " · Maks " +
    angka(s.kelembapan.max, "");
  el("info-jumlah").textContent = s.jumlah;
}

function tampilKosong() {
  el("nilai-suhu").textContent = "--";
  const pill = el("status-suhu");
  pill.textContent = "Belum ada data";
  pill.className = "pill";
  el("kartu-suhu").classList.remove("panas");
  el("nilai-kelembapan").textContent = "--";
  el("info-terakhir").textContent = "-";
  el("info-jumlah").textContent = "0";
  setStatusPerangkat(null);
}

async function perbarui() {
  try {
    const resLatest = await fetch("/api/readings/latest");
    if (resLatest.status === 404) {
      tampilKosong();
      return;
    }
    if (!resLatest.ok) throw new Error("latest -> " + resLatest.status);
    const latest = await resLatest.json();

    const [riwayat, stats] = await Promise.all([
      ambil("/api/readings?limit=20"),
      ambil("/api/stats"),
    ]);

    tampilKartu(latest);
    tampilGrafik(riwayat);
    tampilTabel(riwayat.slice(0, 10));
    tampilStats(stats);
    setStatusPerangkat(parseWaktu(latest.created_at));
  } catch (err) {
    console.error("Gagal memperbarui dashboard:", err);
    setStatusPerangkat(null);
  }
}

perbarui();
setInterval(perbarui, INTERVAL);
