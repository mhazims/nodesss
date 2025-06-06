// ===============================
//  script1.js (di‐update)
// ===============================

// ======= Bagian 0: Sesuaikan Node yang Akan Ditampilkan =======
const NODE_ID = 'node1';  
// Jika ingin gunakan untuk node2, cukup ganti menjadi: const NODE_ID = 'node2';

// ======= Bagian 1: Inisialisasi Chart.js untuk Node Ini =======
const charts = {};

function createGauge(id) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [0, 100],
        backgroundColor: ['#3498db', '#ecf0f1'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '80%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// Karena HTML Anda punya empat gauge dengan ID: 
//   'curahHujan', 'kelembaban', 'getaran', 'kemiringan',
// maka kita inisialisasi semua di sini:
charts.curahHujan = createGauge('curahHujan');
charts.kelembaban  = createGauge('kelembaban');
charts.getaran     = createGauge('getaran');
charts.kemiringan  = createGauge('kemiringan');

function updateGauge(name, value) {
  if (charts[name]) {
    charts[name].data.datasets[0].data[0] = value;
    charts[name].data.datasets[0].data[1] = 100 - value;
    charts[name].update();
    document.getElementById(name + 'Val').textContent =
      `${capitalize(name)}: ${value}`;
  }
}

function updateSuhu(value) {
  document.getElementById('suhuBox').innerHTML = `SUHU: ${value}&deg;C`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ======= Bagian 2: Koneksi MQTT via WebSocket (Hanya 1x) =======
const mqttBrokerUrl = 'wss://94b3a6f75c324d08b52109ee28ae0e35.s1.eu.hivemq.cloud:8884/mqtt';
// Jika broker Anda pakai TLS custom: misalnya 'wss://server.landslidemonit.web.id:8083'

const mqttOptions = {
  keepalive: 60,
  clientId: 'dashboard_' + NODE_ID + '_' + Math.random().toString(16).substr(2, 8),
  reconnectPeriod: 1000,
  clean: true,
  username: 'oktatata',
  password: 'Qwerty123',
};

const client = mqtt.connect(mqttBrokerUrl, mqttOptions);

client.on('connect', () => {
  console.log(`🚀 Terhubung ke Broker MQTT (Node: ${NODE_ID})`);
  // Subscribe hanya pada topik sesuai NODE_ID
  client.subscribe(NODE_ID, { qos: 0 }, (err) => {
    if (err) {
      console.error('❌ Gagal subscribe topik:', NODE_ID, err);
    } else {
      console.log('✅ Berhasil subscribe topik:', NODE_ID);
    }
  });
});

client.on('error', (err) => {
  console.error('❌ Koneksi MQTT Error:', err);
});

client.on('reconnect', () => {
  console.log('🔄 Mencoba koneksi ulang ke Broker MQTT…');
});

client.on('message', (topic, payload) => {
  try {
    // Tujuan kita hanya memproses pesan dari topik yang sama dengan NODE_ID
    if (topic !== NODE_ID) return;

    const message = payload.toString();
    const parsed  = JSON.parse(message);
    // Diasumsikan payload JSON-nya selalu berformat:
    //   { "node": "node1", "data": { suhu:…, curahHujan:…, kelembaban:…, getaran:…, kemiringan:… } }
    // Pastikan 'parsed.node' sama dengan NODE_ID sebelum update UI
    if (parsed.node === NODE_ID && parsed.data) {
      const d = parsed.data;

      if (typeof d.suhu === 'number') {
        updateSuhu(d.suhu);
      }
      if (typeof d.curahHujan === 'number') {
        updateGauge('curahHujan', d.curahHujan);
      }
      if (typeof d.kelembaban === 'number') {
        updateGauge('kelembaban', d.kelembaban);
      }
      if (typeof d.getaran === 'number') {
        updateGauge('getaran', d.getaran);
      }
      if (typeof d.kemiringan === 'number') {
        updateGauge('kemiringan', d.kemiringan);
      }
    }
  } catch (err) {
    console.error('❌ Gagal mem-parse pesan MQTT:', err, payload.toString());
  }
});
