// 金沢用水ジオゲッサー
// 画面の切り替えとスコア計算をまとめたファイル.

// ---- 状態 ----
let genzaiNo = 0;          // 今が何問目か (0 から数える)
let goukeiTokuten = 0;     // 合計点
let kaitouIchi = null;     // 今の問題で置いたピンの位置
let chizu = null;          // ゲーム画面の地図
let kekkaChizu = null;     // 結果画面の地図
let kaitouMarker = null;   // ゲーム画面に置いたピン

// ---- 画面の切り替え ----
// .active が付いている section だけが表示される
function gamenWoHyouji(id) {
  const list = document.querySelectorAll(".screen");
  for (const el of list) {
    el.classList.remove("active");
  }
  document.getElementById(id).classList.add("active");
}

// ---- 距離を求める (ハヴァサインの公式) ----
// 2地点の緯度経度から、地球の表面に沿った距離をメートルで返す
function kyoriWoMotomeru(lat1, lng1, lat2, lng2) {
  const R = 6371000;                       // 地球の半径 (m)
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(lat1 * rad) * Math.cos(lat2 * rad)
          * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- 点数を求める ----
// ぴったりで1000点. 離れるほど急に下がる.
// 1000 で割っている部分が「何メートルずれたら何点」の調整つまみ.
function tokutenWoMotomeru(kyori) {
  return Math.round(1000 * Math.exp(-kyori / 1000));
}

// ---- ゲーム開始 ----
function gameWoHajimeru() {
  genzaiNo = 0;
  goukeiTokuten = 0;
  gamenWoHyouji("screen-game");
  chizuWoYoui();
  mondaiWoHyouji();
}

// ---- 地図の用意 ----
// 非表示の div に地図を作るとサイズが 0 になるので、
// 表示してから invalidateSize() を呼んで作り直させる
function chizuWoYoui() {
  if (chizu === null) {
    chizu = L.map("map").setView([36.5613, 136.6562], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(chizu);
    chizu.on("click", chizuWoClick);
  }
  chizu.invalidateSize();
}

// ---- 問題を表示 ----
function mondaiWoHyouji() {
  const mondai = QUESTIONS[genzaiNo];

  document.getElementById("game-progress").textContent =
    "第" + (genzaiNo + 1) + "問 / " + QUESTIONS.length + "問";
  document.getElementById("game-score").textContent =
    "合計 " + goukeiTokuten + " 点";

  // 写真. ファイルが無ければ灰色の枠を出す
  const shashin = document.getElementById("photo");
  const nashi = document.getElementById("photo-missing");
  shashin.style.display = "block";
  nashi.style.display = "none";
  shashin.onerror = function () {
    shashin.style.display = "none";
    nashi.style.display = "block";
  };
  shashin.src = mondai.photo;

  // ピンと決定ボタンを初期状態に戻す
  kaitouIchi = null;
  if (kaitouMarker !== null) {
    chizu.removeLayer(kaitouMarker);
    kaitouMarker = null;
  }
  document.getElementById("btn-decide").disabled = true;
  document.getElementById("map-help").textContent =
    "地図をタップしてピンを立ててください";
  chizu.setView([36.5613, 136.6562], 13);
}

// ---- 地図をクリックしたとき ----
function chizuWoClick(e) {
  kaitouIchi = e.latlng;
  if (kaitouMarker === null) {
    kaitouMarker = L.marker(kaitouIchi).addTo(chizu);
  } else {
    kaitouMarker.setLatLng(kaitouIchi);
  }
  document.getElementById("btn-decide").disabled = false;
  document.getElementById("map-help").textContent =
    "ここでよければ決定を押してください";
}

// ---- 決定 ----
function ketteiSuru() {
  if (kaitouIchi === null) {
    return;
  }
  const mondai = QUESTIONS[genzaiNo];
  const kyori = kyoriWoMotomeru(
    kaitouIchi.lat, kaitouIchi.lng, mondai.lat, mondai.lng
  );
  const tokuten = tokutenWoMotomeru(kyori);
  goukeiTokuten = goukeiTokuten + tokuten;

  document.getElementById("result-title").textContent =
    "第" + (genzaiNo + 1) + "問の結果";
  document.getElementById("result-score").textContent = tokuten + " 点";
  document.getElementById("result-distance").textContent =
    "正解まで " + Math.round(kyori) + " m ずれていました";
  document.getElementById("result-name").textContent = mondai.name;
  document.getElementById("result-hint").textContent = mondai.hint;
  document.getElementById("btn-next").textContent =
    (genzaiNo === QUESTIONS.length - 1) ? "結果を見る" : "次の問題へ";

  gamenWoHyouji("screen-result");
  kekkaChizuWoHyouji(kaitouIchi, mondai);
}

// ---- 結果画面の地図 ----
// 自分のピンと正解のピンを線で結んで、両方が入るように表示する
function kekkaChizuWoHyouji(kaitou, mondai) {
  if (kekkaChizu === null) {
    kekkaChizu = L.map("result-map");
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(kekkaChizu);
  } else {
    // 前の問題のピンと線を消す
    kekkaChizu.eachLayer(function (layer) {
      if (!(layer instanceof L.TileLayer)) {
        kekkaChizu.removeLayer(layer);
      }
    });
  }
  kekkaChizu.invalidateSize();

  const seikai = L.latLng(mondai.lat, mondai.lng);
  L.marker(kaitou).addTo(kekkaChizu).bindPopup("あなたの回答");
  L.marker(seikai).addTo(kekkaChizu).bindPopup(mondai.name);
  L.polyline([kaitou, seikai], { color: "#c0392b", dashArray: "6 6" })
    .addTo(kekkaChizu);
  kekkaChizu.fitBounds(L.latLngBounds([kaitou, seikai]).pad(0.3));
}

// ---- 次へ ----
function tsugiHe() {
  genzaiNo = genzaiNo + 1;
  if (genzaiNo < QUESTIONS.length) {
    gamenWoHyouji("screen-game");
    chizu.invalidateSize();
    mondaiWoHyouji();
  } else {
    saishuKekkaWoHyouji();
  }
}

// ---- 最終結果 ----
function saishuKekkaWoHyouji() {
  const mantenn = QUESTIONS.length * 1000;
  document.getElementById("final-score").textContent = goukeiTokuten;

  const wariai = goukeiTokuten / mantenn;
  let comment = "";
  if (wariai >= 0.7) {
    comment = "よく知っています。もう用水が目印として見えているのだと思います。";
  } else if (wariai >= 0.4) {
    comment = "だいたいの位置はつかめています。実際に歩くともっと分かります。";
  } else {
    comment = "似たような風景が多かったと思います。解説を読んでから歩いてみてください。";
  }
  document.getElementById("final-comment").textContent = comment;

  // 現地訪問の案内. Googleマップへのリンクを並べる
  const list = document.getElementById("final-list");
  list.innerHTML = "";
  for (const mondai of QUESTIONS) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "https://www.google.com/maps?q=" + mondai.lat + "," + mondai.lng;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = mondai.name;
    li.appendChild(a);
    list.appendChild(li);
  }

  gamenWoHyouji("screen-final");
}

// ---- ボタンの登録 ----
document.getElementById("btn-start").onclick = gameWoHajimeru;
document.getElementById("btn-decide").onclick = ketteiSuru;
document.getElementById("btn-next").onclick = tsugiHe;
document.getElementById("btn-retry").onclick = gameWoHajimeru;

// 最初はトップ画面
gamenWoHyouji("screen-top");