import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// 依照數據集精準分類的 11 個主題
const wordBank = {
  "動物": { high: ["非洲象", "班馬", "黃金獵犬", "老虎", "獅子"], low: ["駱駝", "狐狸", "鴨嘴獸", "驢子", "麻雀"] },
  "器官": { high: ["心臟", "小腸", "腎臟", "肝臟", "大腸"], low: ["肺臟", "胰臟", "子宮", "膀胱", "睪丸"] },
  "家具": { high: ["木桌", "化妝台", "沙發", "椅子", "茶几"], low: ["冷氣", "洗衣機", "鞋櫃", "馬桶", "冰箱"] },
  "文具": { high: ["自動筆", "鉛筆", "原子筆", "橡皮擦", "奇異筆"], low: ["膠水", "麥克筆", "直尺", "量角器", "三角板"] },
  "服飾": { high: ["裙子", "褲子", "內衣", "洋裝", "襯衫"], low: ["緊身衣", "吊帶背心", "睡衣", "短裙", "羽绒衣"] },
  "植物": { high: ["牡丹花", "波斯菊", "菊花", "牽牛花", "向日葵"], low: ["含羞草", "竹子", "松樹", "稻草", "楓樹"] },
  "樂器": { high: ["鋼琴", "提琴", "吉他", "長笛", "貝斯"], low: ["爵士鼓", "嗩吶", "陶笛", "木魚", "三角鐵"] },
  "武器": { high: ["手槍", "甩棍", "武士刀", "步槍", "雙節棍"], low: ["核彈", "火箭筒", "飛彈", "戰車", "坦克"] },
  "職業": { high: ["老師", "會計師", "教授", "校長", "公務員"], low: ["水電工", "祕書", "護士", "警衛", "農夫"] },
  "運動": { high: ["騎腳踏車", "跑步", "重訓", "籃球", "羽毛球"], low: ["空手道", "滑雪", "跨欄", "射箭", "標槍"] },
  "飲料": { high: ["紅茶", "七喜", "蘋果西打", "牛奶", "咖啡"], low: ["普洱茶", "抹茶", "燕麥奶", "香檳", "茉莉花茶"] }
};
const allCategories = Object.keys(wordBank);

let sub_id = "PLAYER_" + Math.random().toString(36).substring(2, 7).toUpperCase();

function shuffle(array) {
  let arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

const selectedCategories = shuffle([...allCategories]).slice(0, 6);
const blockConditions = shuffle(['high', 'high', 'high', 'low', 'low', 'low']);
const experimentBlocks = selectedCategories.map((cat, i) => ({
    category: cat,
    correlation: blockConditions[i],
    blockNum: i + 1
}));

const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  override_safe_mode: true
});

let timeline = [];

// 1. 姓名輸入框 (套用你原本設計的 score-board 風格)
timeline.push({
  type: jsPsychSurveyHtmlForm,
  html: `
    <div class="info-container">
      <h2 style="font-size: 2.5rem; margin-bottom: 20px;">大腦認知挑戰</h2>
      <div class="score-board" style="text-align: center; padding: 40px 20px;">
        <p style="font-size: 1.3rem; color: var(--text-dim); margin-bottom: 20px;">請輸入您的名字或學號</p>
        <input type="text" name="username" placeholder="例如：20927 陳小明" required autocomplete="off" 
               style="width: 80%; padding: 15px; font-size: 1.2rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: white; text-align: center; margin-bottom: 20px;">
      </div>
    </div>
  `,
  button_label: "確認並進入",
  on_finish: function(data){
    if(data.response.username) sub_id = data.response.username.trim();
  }
});

// 2. 說明頁 (套用你原本設計的 score-board 風格)
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="info-container" style="max-width: 600px;">
      <h2 style="color: var(--accent); text-shadow: 0 0 10px rgba(52, 152, 219, 0.5);">測驗規則說明</h2>
      
      <div class="score-board" style="text-align:left; padding: 25px;">
        <p style="color: var(--rank-gold); font-weight: bold; font-size: 1.2rem; margin-top: 0;">⚠️ 判斷特別附註：</p>
        <ul style="padding-left: 20px; line-height: 1.8; color: var(--text-main);">
          <li><b>家具：</b> 家電屬於家具之一。</li>
          <li><b>器官：</b> 僅包含人體器官。</li>
          <li><b style="background-color: var(--rank-gold); color: #000; padding: 2px 6px; border-radius: 4px;">職業與動物不重疊（例如：校長不屬動物）。</b></li>
        </ul>
        
        <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 20px 0;">
        
        <p>1. 畫面會先出現<b style="color:var(--text-dim)">類別</b>，接著出現<b>詞彙</b>。</p>
        <p>2. 請以<b>最快且直覺</b>的方式判斷：<br>
            👉 符合按 <b style="color:var(--success)">綠色按鈕 (F)</b><br>
            👉 不符按 <b style="color:#e74c3c">紅色按鈕 (J)</b>
        </p>
        <p style="color: #e74c3c; font-weight: bold; margin-bottom: 0;">⚡ 注意：每題限時 2.5 秒，請將手指預先放在鍵盤上！</p>
      </div>
      <button id="start" class="mobile-btn btn-f" style="display:inline-block; width:220px;">開始挑戰</button>
    </div>`,
  choices: [" "],
  on_load: () => { 
    document.getElementById('start').onclick = () => jsPsych.finishTrial();
  },
  on_finish: () => {
    let dynamicTimeline = [];

    experimentBlocks.forEach((bData, idx) => {
      const trials = generateBlockTrials(bData.category, bData.correlation);
      
      trials.forEach(t => {
        dynamicTimeline.push({ 
          type: jsPsychHtmlKeyboardResponse, 
          stimulus: `<div class="trial-box"><div class="cue-label">${t.cue}</div><div class="target-label"></div></div>`, 
          choices: "NO_KEYS", 
          trial_duration: 800 
        });

        dynamicTimeline.push({
          type: jsPsychHtmlKeyboardResponse,
          choices: ["f", "j"],
          trial_duration: 2500, 
          data: { phase: 'test', block_order: bData.blockNum, block_condition: bData.correlation, cue: t.cue, target: t.target, condition: t.condition, match: t.match },
          stimulus: `
            <div id="progress-container"><div id="progress-bar"></div></div>
            <div class="trial-box">
              <div class="cue-label">${t.cue}</div>
              <div class="target-label">${t.target}</div>
            </div>
            <div class="control-panel">
              <button id="btn-f" class="mobile-btn btn-f">符合 (F)</button>
              <button id="btn-j" class="mobile-btn btn-j">不符合 (J)</button>
            </div>`,
          on_load: () => {
            const startT = performance.now();
            requestAnimationFrame(() => {
              const pb = document.getElementById('progress-bar');
              if (pb) { pb.style.transition = 'width 2.5s linear'; pb.style.width = '0%'; }
            });
            const handleResp = (key) => { jsPsych.finishTrial({ response: key, rt: performance.now() - startT }); };
            document.getElementById('btn-f').onclick = () => handleResp('f');
            document.getElementById('btn-j').onclick = () => handleResp('j');
          },
          on_finish: (data) => {
            if (data.response === null) { data.correct = false; data.timeout = true; } 
            else { data.correct = (data.response === 'f' && t.match) || (data.response === 'j' && !t.match); data.timeout = false; }
          }
        });
      });

      // 3. 各階段休息畫面 (恢復原本的數據面板)
      if (idx < 5) {
        dynamicTimeline.push({
          type: jsPsychHtmlKeyboardResponse,
          choices: "NO_KEYS", trial_duration: 4000,
          stimulus: () => {
            const data = jsPsych.data.get().filter({block_order: bData.blockNum, phase: 'test'});
            const correctCount = data.filter({correct: true}).count();
            const totalCount = data.count();
            const acc = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
            const validRTs = data.select('rt').values.filter(rt => rt !== null);
            const rt = validRTs.length > 0 ? Math.round(validRTs.reduce((a,b)=>a+b, 0) / validRTs.length) : 0;
            
            return `
              <div class="info-container">
                <h2 style="margin-bottom: 20px;">階段 ${idx+1} / 6 完成</h2>
                <div class="score-board">
                  <div class="stat-row"><span class="stat-label">此階段正確率</span><span class="stat-value">${acc}%</span></div>
                  <div class="stat-row" style="border:none;"><span class="stat-label">平均反應速度</span><span class="stat-value">${rt} ms</span></div>
                </div>
                <p style="color: var(--text-dim); margin-top: 30px; animation: pulse 1.5s infinite;">下一區塊即將開始，請稍候...</p>
              </div>`;
          }
        });
      }
    });

    // 4. 疑義審查面板 (套用你原本設計的 score-board 風格)
    dynamicTimeline.push({
      type: jsPsychSurveyHtmlForm,
      button_label: '送出回饋並查看成績',
      html: () => {
        const allTest = jsPsych.data.get().filter({phase: 'test'});
        const validRTs = allTest.select('rt').values.filter(rt => rt !== null);
        const meanRT = validRTs.reduce((a,b)=>a+b, 0) / validRTs.length;
        const sdRT = Math.sqrt(validRTs.map(x => Math.pow(x - meanRT, 2)).reduce((a,b)=>a+b, 0) / validRTs.length);
        const hesitationThreshold = meanRT + sdRT;

        let reviewHtml = `<div class="info-container" style="max-width: 800px; width: 90vw;">
          <h2 style="color: var(--rank-gold);">📝 試次覆核</h2>
          <p style="color:var(--text-dim); font-size: 1rem; line-height: 1.6; margin-bottom: 20px;">
            以下是您未作答、答錯，或作答時間較長 (大於 ${Math.round(hesitationThreshold)}ms) 的題目。<br>
            若您認為該詞彙的歸類有疑義，請勾選。
          </p>
          <div class="score-board custom-scrollbar" style="max-height: 35vh; overflow-y: auto; text-align: left; padding: 20px; margin: 0 auto 20px auto; max-width: 600px; border: 1px solid rgba(255,255,255,0.1);">`;
        
        let counter = 0;
        allTest.values().forEach((t, i) => {
          let reason = "";
          if (t.timeout) reason = `<span style="background:rgba(231, 76, 60, 0.2); color:#e74c3c; padding:2px 8px; border-radius:12px; font-size:0.9rem;">逾時</span>`;
          else if (!t.correct) reason = `<span style="background:rgba(230, 126, 34, 0.2); color:#e67e22; padding:2px 8px; border-radius:12px; font-size:0.9rem;">答錯</span>`;
          else if (t.rt > hesitationThreshold) reason = `<span style="background:rgba(241, 196, 15, 0.2); color:#f1c40f; padding:2px 8px; border-radius:12px; font-size:0.9rem;">猶豫 (${Math.round(t.rt)}ms)</span>`;

          if (reason !== "") {
            reviewHtml += `<div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <label style="cursor: pointer; display: flex; align-items: center; gap: 15px;">
                <input type="checkbox" name="doubt_trial_${i}" style="width:20px; height:20px; accent-color: var(--accent);">
                <span style="flex-grow:1; font-size: 1.1rem;">類別：<b style="color:var(--accent);">${t.cue}</b> ➔ 詞彙：<b>${t.target}</b></span>
                <span>${reason}</span>
              </label>
            </div>`;
            counter++;
          }
        });

        if (counter === 0) reviewHtml += `<p style="text-align:center; color: var(--success); font-weight: bold; font-size: 1.2rem;">✨ 完美！沒有需要覆核的題目。</p>`;
        
        reviewHtml += `</div>
          <div style="text-align: left; max-width: 600px; margin: 0 auto;">
            <p style="color: var(--text-dim); margin-bottom: 10px; font-size: 0.95rem;">是否有其他未列在上方，但您認為會影響判斷的試次或原因？(選填)</p>
            <textarea name="extra_feedback" style="width: 100%; height: 80px; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 15px; font-family: inherit; font-size: 1rem; box-sizing: border-box; resize: none;"></textarea>
          </div>
        </div>`;

        return reviewHtml;
      },
      on_finish: (data) => {
         jsPsych.data.addProperties({ feedback: data.response });
      }
    });

    // 5. 最終結算與排行榜 (完全恢復你原本的稱號系統)
    dynamicTimeline.push({
      type: jsPsychHtmlKeyboardResponse,
      choices: "NO_KEYS",
      stimulus: () => {
        const allData = jsPsych.data.get().filter({phase: 'test'});
        const totalAcc = allData.filter({correct: true}).count() / allData.count(); 
        const validRTs = allData.select('rt').values.filter(rt => rt !== null);
        const totalRT = validRTs.length > 0 ? validRTs.reduce((a,b)=>a+b, 0) / validRTs.length : 0;
        let score = totalRT > 0 ? Math.round((Math.pow(totalAcc, 2) * 1000000) / totalRT) : 0;

        let title = "認知新手"; let beatPercent = 50;
        if (score > 1800) { title = "語意辨識之神"; beatPercent = 99; }
        else if (score > 1500) { title = "大腦超頻者"; beatPercent = 95; }
        else if (score > 1200) { title = "反應快手"; beatPercent = 85; }
        else if (score > 1000) { title = "潛力新星"; beatPercent = 70; }

        return `
          <div class="info-container" style="margin-top:5vh;">
            <h1 style="font-size: 2.5rem; margin-bottom: 10px;">挑戰成功！</h1>
            <div class="score-board" style="max-width:500px; padding: 40px 30px;">
              <div class="rank-title" style="color: var(--text-dim);">獲得稱號</div>
              <div class="final-rank">${title}</div>
              <div class="stat-row"><span class="stat-label">綜合積分</span><span class="stat-value">${score}</span></div>
              <div class="stat-row"><span class="stat-label">全服排名</span><span class="stat-value" style="color:#f1c40f">贏過 ${beatPercent}% 玩家</span></div>
              <div class="stat-row" style="border:none; padding-bottom: 0;"><span class="stat-label">總平均反應</span><span class="stat-value">${Math.round(totalRT)} ms</span></div>
            </div>
            <p id="upload-status" style="color:var(--text-dim); font-size: 1.1rem; margin-top: 20px;">正在同步數據至資料庫...</p>
          </div>`;
      },
      on_load: async () => {
        const finalData = jsPsych.data.get().filter({phase: 'test'}).values();
        const globalProps = jsPsych.data.getProperties();
        const statusText = document.getElementById('upload-status');
        
        try {
          statusText.innerText = "📡 數據上傳與狀態更新中...";
          statusText.style.color = "#3498db";

          await setDoc(doc(db, "results", sub_id), { 
            subjectId: sub_id, 
            experimentBlocks: experimentBlocks,
            trialsData: finalData,
            feedback: globalProps.feedback || {},
            completionTime: new Date().toLocaleString("zh-TW"),
            totalTrials: finalData.length,
            device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
          });

          statusText.innerText = "✅ 數據已安全儲存，感謝您的參與！";
          statusText.style.color = "#2ecc71";
          statusText.style.fontWeight = "bold";
        } catch(e) { 
          statusText.innerText = "❌ 上傳失敗: " + e.message;
          statusText.style.color = "#e74c3c";
        }
      }
    });

    jsPsych.addNodeToEndOfTimeline({ timeline: dynamicTimeline });
  }
});

jsPsych.run(timeline);
