// 効果音
//
// Web Audio API で音を合成している。音声ファイルを持たないので,
// 素材のライセンスも, 読み込み待ちも, ファイルの置き場所も要らない。
//
// 既成の効果音素材に差し替えたくなったら, 下の se〜 の関数の中身を
// new Audio("sounds/xxx.mp3").play() に置き換えればよい。
// 呼び出し側 (script.js) は直さなくて済むようにしてある。

let onseiOn = true;      // 音を鳴らすかどうか
let audioCtx = null;     // 音を作る為の箱

// ブラウザは最初のクリックより前に音を鳴らすことを許していない。
// ゲーム開始ボタンを押した時に呼ばれるので, そこで用意する。
function audioWoYoui() {
  if (audioCtx === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      return null;              // 対応していないブラウザでは音なしで動かす
    }
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// 音を1つ鳴らす
//   shuuhasu : 高さ (Hz)
//   nagasa   : 長さ (秒)
//   katachi  : 波の形 "sine" やわらかい / "triangle" 軽い / "square" 電子音
//   onryou   : 音量 (0〜1)
//   okure    : 何秒後に鳴らすか
function otoWoNarasu(shuuhasu, nagasa, katachi, onryou, okure) {
  if (!onseiOn) {
    return;
  }
  const ctx = audioWoYoui();
  if (ctx === null) {
    return;
  }
  const t = ctx.currentTime + (okure || 0);

  const hassinki = ctx.createOscillator();   // 音の元
  const onryouChousei = ctx.createGain();    // 音量の調整

  hassinki.type = katachi;
  hassinki.frequency.setValueAtTime(shuuhasu, t);

  // 立ち上がりを一瞬で, 減衰をなめらかにする。
  // いきなり音量を変えるとプツッという雑音が入る為
  onryouChousei.gain.setValueAtTime(0, t);
  onryouChousei.gain.linearRampToValueAtTime(onryou, t + 0.01);
  onryouChousei.gain.exponentialRampToValueAtTime(0.0001, t + nagasa);

  hassinki.connect(onryouChousei);
  onryouChousei.connect(ctx.destination);
  hassinki.start(t);
  hassinki.stop(t + nagasa);
}

// ---- 場面ごとの音 ----

// 地図にピンを立てた時. 軽く短く
function sePin() {
  otoWoNarasu(880, 0.08, "triangle", 0.18, 0);
}

// ヒントを開いた時. 得をしたわけではないので, ピンより低く短い音にする
function seHint() {
  otoWoNarasu(587, 0.06, "triangle", 0.14, 0);
  otoWoNarasu(494, 0.12, "triangle", 0.14, 0.06);
}

// 決定を押した時. 低い音から高い音へ
function seKettei() {
  otoWoNarasu(523, 0.09, "sine", 0.22, 0);
  otoWoNarasu(784, 0.14, "sine", 0.22, 0.07);
}

// 結果が出た時. 得点が高いほど高い音にする。
// 数字を読む前に, 近かったか遠かったかが音で分かる
function seKekka(tokuten) {
  const wariai = tokuten / 1000;
  if (wariai >= 0.5) {
    // 近い. 明るい三和音
    otoWoNarasu(523, 0.12, "sine", 0.22, 0);
    otoWoNarasu(659, 0.12, "sine", 0.22, 0.09);
    otoWoNarasu(784, 0.28, "sine", 0.22, 0.18);
  } else if (wariai >= 0.15) {
    // そこそこ. 二音だけ
    otoWoNarasu(523, 0.12, "sine", 0.20, 0);
    otoWoNarasu(622, 0.22, "sine", 0.20, 0.09);
  } else {
    // 遠い. 下がる二音
    otoWoNarasu(392, 0.14, "triangle", 0.18, 0);
    otoWoNarasu(294, 0.26, "triangle", 0.18, 0.10);
  }
}

// 次の問題へ進む時
function seTsugi() {
  otoWoNarasu(660, 0.07, "triangle", 0.15, 0);
}

// 最終結果. 四音の上昇
function seOwari() {
  otoWoNarasu(523, 0.14, "sine", 0.24, 0);
  otoWoNarasu(659, 0.14, "sine", 0.24, 0.13);
  otoWoNarasu(784, 0.14, "sine", 0.24, 0.26);
  otoWoNarasu(1047, 0.40, "sine", 0.24, 0.39);
}

// ---- 音の入切 ----
function onseiWoKirikae() {
  onseiOn = !onseiOn;
  const label = onseiOn ? "♪ 音あり" : "♪ 音なし";
  for (const id of ["btn-sound-game", "btn-sound-result"]) {
    const b = document.getElementById(id);
    if (b !== null) {
      b.textContent = label;
    }
  }
  if (onseiOn) {
    sePin();              // 入れ直した時に確認用の音を鳴らす
  }
}