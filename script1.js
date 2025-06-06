// ========= Bagian 1: Inisialisasi Chart.js =========
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

// Buat empat gauge untuk masing-masing sensor
charts.curahHujan = createGauge('curahHujan');
charts.kelembaban   = createGauge('kelembaban');
charts.getaran      = createGauge('getaran');
charts.kemiringan   = createGauge('kemiringan');

function updateGauge(name, value) {
  if (charts[name]) {
    // Update nilai pada Chart.js
    charts[name].data.datasets[0].data[0] = value;
    charts[name].data.datasets[0].data[1] = 100 - value;
    charts[name].update();
    // Update teks di bawah gauge
    document.getElementById(name + 'Val').textContent = `${capitalize(name)}: ${value}`;
  }
}

function updateSuhu(value) {
  document.getElementById('suhuBox').innerHTML = `SUHU: ${value}&deg;C`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========= Bagian 2: Koneksi MQTT via WebSocket =========
const mqttBrokerUrl = 'wss://94b3a6f75c324d08b52109ee28ae0e35.s1.eu.hivemq.cloud:8884/mqtt';
// Jika broker Anda menggunakan TLS, ganti menjadi 'wss://server.landslidemonit.web.id:8083' (misalnya)

const mqttOptions = {
  keepalive: 60,
//   clientId: 'dashboard_node2_' + Math.random().toString(16).substr(2, 8),
  clientId: '7d05d137-89bf-460f-8ac2-1ebf0aec42b9',
  reconnectPeriod: 1000,  // coba koneksi ulang tiap 1 detik jika terputus
  clean: true,
  username: 'oktatata',
  password: 'Qwerty123',
};

const client = mqtt.connect(mqttBrokerUrl, mqttOptions);

client.on('connect', () => {
  console.log('🚀 Terhubung ke Broker MQTT via WebSocket');
  // Daftarkan topik-topik yang ingin disubscribe
  client.subscribe('node1', { qos: 0 });
});

client.on('error', (err) => {
  console.error('❌ Koneksi MQTT Error:', err);
});

client.on('reconnect', () => {
  console.log('🔄 Mencoba koneksi ulang ke Broker MQTT…');
});

client.on('message', (topic, payload) => {
  try {
    const message = payload.toString();
    const parsed  = JSON.parse(message);

    // ---- Sesuaikan parsing: 
    // parsed.data adalah objek { suhu:…, curahHujan:…, kelembaban:…, getaran:…, kemiringan:… }
    if (parsed.node === 'node1' && parsed.data) {
      const d = parsed.data;

      // Pastikan setiap field ada, baru update
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
