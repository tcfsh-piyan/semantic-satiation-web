import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. 你的 Firebase 設定金鑰 (已為你填入)
const firebaseConfig = {
    apiKey: "AIzaSyCHlnJz0R1ruHYnoOKbznaF9KO7g81DDSo",
    authDomain: "semantic-satiation-exp.firebaseapp.com",
    projectId: "semantic-satiation-exp",
    storageBucket: "semantic-satiation-exp.firebasestorage.app",
    messagingSenderId: "591342793924",
    appId: "1:591342793924:web:2359050e1a170bb53b0591"
};

// 2. 初始化 Firebase 與資料庫
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. 抓取資料並渲染表格的核心邏輯
async function loadResults() {
    const statusMsg = document.getElementById("statusMessage");
    const tbody = document.getElementById("resultTableBody");
    
    statusMsg.innerHTML = "正在向 Firebase 請求資料...";
    tbody.innerHTML = ""; // 清空表格

    try {
        // 從 Firestore 抓取 "results" 這個集合內的所有實驗結果
        const querySnapshot = await getDocs(collection(db, "results"));
        let count = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id; // 這筆資料在資料庫裡的唯一 ID
            count++;

            // 動態建立表格的列 (Row)
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${data.subjectId || "未知受試者"}</td>
                <td>${data.completionTime || "無紀錄"}</td>
                <td><span class="badge bg-danger text-white rounded-pill">${data.device || "mobile"}</span></td>
                <td>${data.totalTrials || 120}</td>
                <td>${data.accuracy || "0"}%</td>
                <td>
                    <button class="btn btn-sm btn-success download-btn" data-id="${docId}">Excel</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${docId}">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        statusMsg.innerHTML = `✅ 成功載入 <strong>${count}</strong> 筆受試者資料。`;
        statusMsg.className = "status-bar"; // 確保成功時的背景色是綠色

    } catch (error) {
        console.error("抓取資料失敗：", error);
        statusMsg.innerHTML = "❌ 載入失敗，請檢查網路或 Firebase 設定權限。";
        statusMsg.className = "alert alert-danger"; // 失敗時變成紅色警告
    }
}

// 綁定「重新整理」按鈕的點擊事件
document.getElementById("refreshBtn").addEventListener("click", loadResults);

// 網頁開啟時，自動先載入一次資料
loadResults();