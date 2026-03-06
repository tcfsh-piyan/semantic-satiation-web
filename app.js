import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- Firebase 初始化 ---
const firebaseConfig = {
  apiKey: "AIzaSyCHlnJz0R1ruHYnoOKbznaF9KO7g81DDSo",
  authDomain: "semantic-satiation-exp.firebaseapp.com",
  projectId: "semantic-satiation-exp",
  storageBucket: "semantic-satiation-exp.firebasestorage.app",
  messagingSenderId: "591342793924",
  appId: "1:591342793924:web:2359050e1a170bb53b0591"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 完整 11 主題詞庫定義 (已替換為"器官") ---
const wordBank = {
  "器官": { high: ["心臟", "小腸", "腎臟", "肝臟", "皮膚"], low: ["腦幹", "肺臟", "胰臟", "子宮", "膀胱"] },
  "文具": { high: ["自動筆", "鉛筆盒", "鉛筆", "原子筆", "橡皮擦"], low: ["膠水", "剪刀", "粉筆", "美工刀", "量角器"] },
  "運動": { high: ["重訓", "羽毛球", "籃球", "騎腳踏車", "跑步"], low: ["空手道", "滑雪", "跨欄", "射箭", "標槍"] },
  "植物": { high: ["牡丹花", "波斯菊", "菊花", "牽牛花", "向日葵"], low: ["竹子", "茶葉", "含羞草", "稻草", "罌粟"] },
  "飲料": { high: ["咖啡牛奶", "紅茶", "蕃茄汁", "七喜", "蘋果西打"], low: ["抹茶", "香檳", "茉莉花茶", "蘇打綠", "百事"] },
  "家具": { high: ["木桌", "化妝台", "茶几", "沙發", "椅子"], low: ["冷氣", "洗衣機", "鞋櫃", "馬桶", "冰箱"] },
  "動物": { high: ["班馬", "非洲象", "黃金獵犬", "老虎", "獅子"], low: ["狐狸", "鴨嘴獸", "麻雀", "驢子", "蠶寶寶"] },
  "食物": { high: ["蘿蔔糕", "鴨血", "雞腿", "米腸", "魚板"], low: ["火龍果", "柳丁", "奇異果", "餃子", "荔枝"] },
  "武器": { high: ["步槍", "手槍", "武士刀", "雙節棍", "甩棍"], low: ["核彈", "火箭筒", "飛彈", "戰車", "坦克"] },
  "職業": { high: ["老師", "會計師", "教授", "校長", "公務員"], low: ["祕書", "警衛", "水電工", "護士", "農夫"] },
  "服飾": { high: ["襯衫", "裙子", "褲子", "內衣", "洋裝"], low: ["緊身衣", "羽绒衣", "吊帶背心", "睡衣", "短裙"] }
};
const allCategories = Object.keys(wordBank);

// --- 全域變數 ---
let sub_id = "PLAYER_" + Math.random().toString(36).substring(2, 7).toUpperCase();
let experimentStatus = null; 
let myCategories = [];
let myCorrelation = "";
let isFirebaseReady = false;

// --- 洗牌函數 ---
function shuffle(array) {
  let arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- 區塊生成邏輯 (4 種條件) ---
function generateBlockTrials(coreCategory, correlationType) {
  let trials = [];
  let remainingCategories = shuffle(allCategories.filter(c => c !== coreCategory));

  let g1Targets = shuffle([...wordBank[coreCategory][correlationType]]);
  for (let i=0; i<5; i++) trials.push({ cue: coreCategory, target: g1Targets[i], match: true, condition: "重複_匹配" });
  for (let i=0; i<5; i++) trials.push({ cue: coreCategory, target: wordBank[remainingCategories[i]][correlationType][i], match: false, condition: "重複_不匹配" });
  for (let i=0; i<5; i++) trials.push({ cue: remainingCategories[i], target: wordBank[remainingCategories[i]][correlationType][0], match: true, condition: "不重複_匹配" });
  for (let i=5; i<10; i++) trials.push({ cue: remainingCategories[i], target: wordBank[remainingCategories[i-5]][correlationType][1], match: false, condition: "不重複_不匹配" });

  return shuffle(trials);
}

// ===============================================
// 1. 在背景非同步抓取 Firebase (加了防呆機制)
// ===============================================
async function fetchFirebaseInBackground() {
  try {
    const statusRef = doc(db, "experiments", "status");
    const docSnap = await getDoc(statusRef);
    if (docSnap.exists()) {
      experimentStatus = docSnap.data();
    } else {
      experimentStatus = { isPairComplete: true };
    }

    // 🛡️ 新增防呆檢查：確認 Firebase 存的舊主題，現在的詞庫裡到底還有沒有
    let savedCategories = experimentStatus.categories || [];
    let isDataValid = savedCategories.every(c => allCategories.includes(c));

    if (experimentStatus.isPairComplete === false && isDataValid && savedCategories.length === 5) {
      // 情境 A：上一組做一半，且主題資料都合法，就沿用並切換高低相關
      myCategories = savedCategories;
      myCorrelation = experimentStatus.correlation === "high" ? "low" : "high";
    } else {
      // 情境 B：全新開始，或者是「遇到舊的資料導致衝突」，就一律重新抽籤！
      console.log("啟動新回合或排除舊資料衝突");
      myCategories = shuffle([...allCategories]).slice(0, 5);
      myCorrelation = Math.random() > 0.5 ? "high" : "low";
    }
    
    isFirebaseReady = true;
  } catch (error) {
    console.error("Firebase 連線失敗，啟動備用條件:", error);
    myCategories = shuffle([...allCategories]).slice(0, 5);
    myCorrelation = Math.random() > 0.5 ? "high" : "low";
    isFirebaseReady = true;
  }
}
fetchFirebaseInBackground();

// ===============================================
// 2. 立刻啟動 jsPsych 介面 (直接進入名字畫面)
// ===============================================
const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  override_safe_mode: true
});

let timeline = [];

// 節點 A: 輸入名字
timeline.push({
  type: jsPsychSurveyText,
  questions: [{prompt: "<h2 style='color:white; margin-bottom:10px;'>請輸入您的名字或代號：</h2>", name: 'username', required: true}],
  button_label: "確認並開始",
  on_finish: function(data){
    if(data.response.username) sub_id = data.response.username.trim();
  }
});

// 節點 B: 說明頁
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="info-container">
      <h2>語意認知挑戰賽</h2>
      <p>準備好測試你的大腦反應速度了嗎？</p>
      <div class="score-board" style="text-align:left;">
        <p>1. 螢幕上方出現<b>類別</b>。</p>
        <p>2. 下方出現<b>詞彙</b>。</p>
        <p>3. 判斷是否符合：<br>
            👉 符合按 <b style="color:var(--success)">綠色按鈕 (F)</b><br>
            👉 不符按 <b style="color:#e74c3c">紅色按鈕 (J)</b>
        </p>
      </div>
      <button id="start" class="mobile-btn btn-f" style="display:inline-block; width:200px;">開始挑戰</button>
    </div>`,
  choices: [" "],
  on_load: () => { 
    document.getElementById('start').onclick = () => {
      if(!isFirebaseReady) {
        document.getElementById('start').innerText = "載入設定中...";
        let waitInterval = setInterval(() => {
          if(isFirebaseReady) {
            clearInterval(waitInterval);
            jsPsych.finishTrial();
          }
        }, 200);
      } else {
        jsPsych.finishTrial();
      }
    };
  },
  on_finish: () => {
    let dynamicTimeline = [];

    // 產生 6 個 Block
    myCategories.forEach((theme, bIdx) => {
      const trials = generateBlockTrials(theme, myCorrelation);
      
      trials.forEach(t => {
        dynamicTimeline.push({ type: jsPsychHtmlKeyboardResponse, stimulus: '', choices: "NO_KEYS", trial_duration: 800 });
        dynamicTimeline.push({
          type: jsPsychHtmlKeyboardResponse,
          stimulus: `<div class="trial-box"><div class="cue-label">${t.cue}</div><div class="target-label"></div></div>`,
          choices: "NO_KEYS", trial_duration: 800
        });

        dynamicTimeline.push({
          type: jsPsychHtmlKeyboardResponse,
          choices: ["f", "j"],
          data: { phase: 'test', block: bIdx + 1, cue: t.cue, target: t.target, condition: t.condition, match: t.match },
          stimulus: `
            <div class="trial-box"><div class="cue-label">${t.cue}</div><div class="target-label">${t.target}</div></div>
            <div class="control-panel">
              <button id="btn-f" class="mobile-btn btn-f">符合 (F)</button>
              <button id="btn-j" class="mobile-btn btn-j">不符合 (J)</button>
            </div>`,
          on_load: () => {
            const startT = performance.now();
            const handleResp = (key) => { jsPsych.finishTrial({ response: key, rt: performance.now() - startT }); };
            document.getElementById('btn-f').onclick = () => handleResp('f');
            document.getElementById('btn-j').onclick = () => handleResp('j');
          },
          on_finish: (data) => {
            const char = data.response;
            data.correct = (char === 'f' && t.match) || (char === 'j' && !t.match);
          }
        });
      });

      dynamicTimeline.push({
        type: jsPsychHtmlKeyboardResponse,
        choices: "NO_KEYS", trial_duration: 4000,
        stimulus: () => {
          const data = jsPsych.data.get().filter({block: bIdx+1, phase: 'test'});
          const correctCount = data.filter({correct: true}).count();
          const totalCount = data.count();
          const acc = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
          const rt = Math.round(data.select('rt').mean()) || 0;
          return `
            <div class="info-container"><h2>階段 ${bIdx+1} / 5 完成</h2>
            <div class="score-board"><div class="stat-row"><span class="stat-label">正確率</span><span class="stat-value">${acc}%</span></div>
            <div class="stat-row"><span class="stat-label">平均速度</span><span class="stat-value">${rt} ms</span></div></div>
            <p>下一關載入中...</p></div>`;
        }
      });
    });

    // 實驗結束與資料上傳
    dynamicTimeline.push({
      type: jsPsychHtmlKeyboardResponse,
      choices: "NO_KEYS",
      stimulus: () => {
        const allData = jsPsych.data.get().filter({phase: 'test'});
        const totalAcc = allData.filter({correct: true}).count() / allData.count(); 
        const totalRT = allData.select('rt').mean();
        let score = totalRT > 0 ? Math.round((Math.pow(totalAcc, 2) * 1000000) / totalRT) : 0;

        let title = "認知新手"; let beatPercent = 50;
        if (score > 1800) { title = "語意辨識之神"; beatPercent = 99; }
        else if (score > 1500) { title = "大腦超頻者"; beatPercent = 95; }
        else if (score > 1200) { title = "反應快手"; beatPercent = 85; }
        else if (score > 1000) { title = "潛力新星"; beatPercent = 70; }

        return `
          <div class="info-container" style="margin-top:10vh;">
            <h1>挑戰成功！</h1>
            <div class="score-board" style="max-width:500px;">
              <div class="rank-title">獲得稱號</div>
              <div class="final-rank">${title}</div>
              <div class="stat-row"><span class="stat-label">綜合積分</span><span class="stat-value">${score}</span></div>
              <div class="stat-row"><span class="stat-label">全服排名</span><span class="stat-value" style="color:#f1c40f">贏過 ${beatPercent}% 玩家</span></div>
              <div class="stat-row" style="border:none;"><span class="stat-label">總平均反應</span><span class="stat-value">${Math.round(totalRT)} ms</span></div>
            </div>
            <p id="upload-status" style="color:#888;">正在同步數據...</p>
          </div>`;
      },
      on_load: async () => {
        const finalData = jsPsych.data.get().filter({phase: 'test'}).values();
        const statusText = document.getElementById('upload-status');
        
        if (finalData.length === 100) { 
          try {
            statusText.innerText = "📡 數據上傳與狀態更新中...";
            statusText.style.color = "#3498db";

            await setDoc(doc(db, "results", sub_id), { 
              subjectId: sub_id, 
              trialsData: finalData,
              completionTime: new Date().toLocaleString("zh-TW"),
              totalTrials: finalData.length,
              accuracy: Math.round((jsPsych.data.get().filter({phase: 'test', correct: true}).count() / 100) * 100),
              device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
            });

            let newStatus = { categories: myCategories, correlation: myCorrelation };
            newStatus.isPairComplete = experimentStatus.isPairComplete ? false : true;
            await setDoc(doc(db, "experiments", "status"), newStatus);

            statusText.innerText = "✅ 數據已安全儲存，感謝參與！";
            statusText.style.color = "#2ecc71";
          } catch(e) { 
            console.error(e);
            statusText.innerText = "❌ 上傳失敗: " + e.message;
            statusText.style.color = "#e74c3c";
          }
        } else {
           statusText.innerText = "⚠️ 實驗未完成，資料不予記錄。";
        }
      }
    });

    jsPsych.addNodeToEndOfTimeline({ timeline: dynamicTimeline });
  }
});

jsPsych.run(timeline);

