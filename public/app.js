const INTERVAL = 5000;
const BATAS_PANAS = 35;
const BATAS_ONLINE = 30000;

const el = (id) => document.getElementById(id);

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

const grafik = new Chart(el("grafik"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Suhu (°C)",
        data: [],
        borderColor: "#d62839",
        backgroundColor: "#d62839",
        yAxisID: "y",
        tension: 0.3,
      },
      {
        label: "Kelembapan (%)",
        data: [],
        borderColor: "#1d7bd8",
        backgroundColor: "#1d7bd8",
        yAxisID: "y1",
        tension: 0.3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
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
  const badge = el("status-perangkat");
  badge.textContent = online ? "Online" : "Offline";
  badge.classList.toggle("online", online);
  badge.classList.toggle("offline", !online);
}

function tampilKartu(d) {
  const panas = d.suhu > BATAS_PANAS;
  const waktu = "Diperbarui: " + formatWaktu(parseWaktu(d.created_at));

  el("nilai-suhu").textContent = d.suhu.toFixed(1) + " °C";
  el("status-suhu").textContent = panas ? "Panas" : "Normal";
  el("kartu-suhu").classList.toggle("panas", panas);
  el("kartu-suhu").classList.toggle("normal", !panas);
  el("waktu-suhu").textContent = waktu;

  el("nilai-kelembapan").textContent = d.kelembapan.toFixed(1) + " %";
  el("waktu-kelembapan").textContent = waktu;
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
    tbody.appendChild(tr);
  });
}

function tampilStats(s) {
  const f = (v) => (v === null ? "-" : Number(v).toFixed(1));
  el("s-suhu-avg").textContent = f(s.suhu.rata_rata);
  el("s-suhu-min").textContent = f(s.suhu.min);
  el("s-suhu-max").textContent = f(s.suhu.max);
  el("s-kel-avg").textContent = f(s.kelembapan.rata_rata);
  el("s-kel-min").textContent = f(s.kelembapan.min);
  el("s-kel-max").textContent = f(s.kelembapan.max);
  el("jumlah-data").textContent = "Jumlah data: " + s.jumlah;
}

function tampilKosong() {
  el("nilai-suhu").textContent = "--";
  el("status-suhu").textContent = "Belum ada data";
  el("nilai-kelembapan").textContent = "--";
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
