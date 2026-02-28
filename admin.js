import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. Firebase 初始化
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

// 2. 抓取資料並渲染表格的核心邏輯
async function loadResults() {
    const statusMsg = document.getElementById("statusMessage");
    const tbody = document.getElementById("resultTableBody");
    
    statusMsg.innerHTML = "正在向 Firebase 請求資料...";
    tbody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "results"));
        let count = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id; 
            count++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${data.subjectId || "未知受試者"}</td>
                <td>${data.completionTime || "無紀錄"}</td>
                <td><span class="badge bg-danger text-white rounded-pill">${data.device || "mobile"}</span></td>
                <td>${data.totalTrials || 100}</td>
                <td>${data.accuracy || "0"}%</td>
                <td>
                    <button class="btn btn-sm btn-success download-btn" data-id="${docId}">Excel</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${docId}">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        statusMsg.innerHTML = `✅ 成功載入 <strong>${count}</strong> 筆受試者資料。`;
        statusMsg.className = "status-bar";

    } catch (error) {
        console.error("抓取資料失敗：", error);
        statusMsg.innerHTML = "❌ 載入失敗，請檢查網路或 Firebase 設定權限。";
        statusMsg.className = "alert alert-danger"; 
    }
}

// 3. 事件代理：監聽整個表格裡面的「下載」跟「刪除」點擊
document.getElementById("resultTableBody").addEventListener("click", async (e) => {
    
    // --- 如果點擊的是【下載 Excel】按鈕 ---
    if (e.target.classList.contains("download-btn")) {
        const docId = e.target.getAttribute("data-id");
        e.target.innerText = "下載中...";
        e.target.disabled = true;

        try {
            // 從資料庫抓取這筆文件裡面的完整 120 題詳細資料
            const docSnap = await getDoc(doc(db, "results", docId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const trials = data.trialsData || [];

                // 🌟 這裡負責把 JSON 排版成 Excel 欄位格式 🌟
                const excelData = trials.map((trial, index) => ({
                    "subject_id (受試者)": data.subjectId,
                    "block": trial.block,
                    "trial_index": index + 1,
                    "condition (條件)": trial.condition, // 重複_匹配 等
                    "cue (主題詞)": trial.cue,
                    "target (目標詞)": trial.target,
                    "match (預期)": trial.match ? "TRUE" : "FALSE",
                    "response (按鍵)": trial.response,
                    "correct (正確)": trial.correct ? "TRUE" : "FALSE",
                    "rt (反應時間ms)": Math.round(trial.rt)
                }));

                // 呼叫 SheetJS 產生檔案並觸發下載
                const worksheet = XLSX.utils.json_to_sheet(excelData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Trials Data");
                
                // 檔案名稱會自動加上受試者的名字
                XLSX.writeFile(workbook, `語意飽和實驗_${data.subjectId}.xlsx`);
            }
        } catch (error) {
            console.error("下載失敗", error);
            alert("下載失敗，請檢查網路。");
        } finally {
            e.target.innerText = "Excel";
            e.target.disabled = false;
        }
    }

    // --- 如果點擊的是【刪除】按鈕 ---
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("確定要刪除這筆實驗數據嗎？刪除後無法復原！")) {
            const docId = e.target.getAttribute("data-id");
            try {
                e.target.innerText = "刪除中...";
                await deleteDoc(doc(db, "results", docId));
                loadResults(); // 刪除完自動重新載入表格
            } catch (error) {
                console.error("刪除失敗", error);
                alert("刪除失敗！");
                e.target.innerText = "刪除";
            }
        }
    }
});

// 綁定「重新整理」按鈕的點擊事件
document.getElementById("refreshBtn").addEventListener("click", loadResults);

// 網頁開啟時，自動先載入一次資料
loadResults();

