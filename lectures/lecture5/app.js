// --- Application State ---
const state = {
    targetGoal: 50000,
    targetCurrent: 25000,
    dailyBudget: 3000,
    dailySpent: 1000,
    history: [
        { time: "10:15", item: "コンビニ（お茶・パン）", amount: 450, category: "食費", type: "expense" },
        { time: "08:30", item: "通勤電車チャージ", amount: 550, category: "交通費", type: "expense" }
    ],
    similarPurchases: {
        "クレーンゲーム": 1,
        "ゲーム課金": 1,
        "カフェ": 0
    },
    warnings: []
};

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const toastContainer = document.getElementById('toast-container');

// Dashboard DOM elements
const targetPercent = document.getElementById('target-percent');
const targetCurrentVal = document.getElementById('target-current');
const targetProgressBar = document.getElementById('target-progress-bar');
const dailyCircle = document.getElementById('daily-circle');
const dailyRemaining = document.getElementById('daily-remaining');
const paceBadge = document.getElementById('pace-badge');
const paceDesc = document.getElementById('pace-desc');
const warningsList = document.getElementById('warnings-list');
const historyList = document.getElementById('history-list');

// --- Helper Functions ---

// Format numbers as currency
function formatYen(num) {
    return '¥' + num.toLocaleString('ja-JP');
}

// Get current timestamp (HH:MM)
function getTimestamp() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

// Add message to chat screen
function appendMessage(sender, text, type = 'assistant', extraHtml = '') {
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    
    if (sender === 'ココ') {
        bubble.classList.add('msg-assistant');
        bubble.innerHTML = `<strong>${sender}</strong><br>${text}${extraHtml}`;
    } else if (sender === 'あなた') {
        bubble.classList.add('msg-user');
        bubble.innerHTML = text;
    } else if (sender === 'SYSTEM') {
        bubble.classList.add('msg-alert');
        bubble.innerHTML = `
            <div class="msg-alert-header">
                <span>🚨 リアルタイム決済検知</span>
            </div>
            <div class="msg-alert-body">
                <span>${text}</span>
                <span class="amount-expense">${extraHtml}</span>
            </div>
            <div class="msg-alert-footer">
                決済カード: Visa **** 1290 / 検知時刻: ${getTimestamp()}
            </div>
        `;
    }
    
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show Premium Toast Notification
function showToast(title, message, amount, type = 'danger') {
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    
    let icon = '🔔';
    if (type === 'danger') icon = '🚨';
    if (type === 'warning') icon = '⚠️';
    if (type === 'success') icon = '🎁';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
            ${amount ? `<div class="toast-amount ${type === 'success' ? 'amount-income' : 'amount-expense'}">${formatYen(amount)}</div>` : ''}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Dynamic scale and audio visual feedback
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4500);
}

// Update the entire dashboard dynamically
function updateDashboard() {
    // 1. Update Filial Piety (親孝行) Goal
    const percent = Math.min(Math.round((state.targetCurrent / state.targetGoal) * 100), 100);
    targetPercent.textContent = percent + '%';
    targetCurrentVal.textContent = formatYen(state.targetCurrent);
    targetProgressBar.style.width = percent + '%';

    // 2. Update Today's Remaining Budget
    const remaining = state.dailyBudget - state.dailySpent;
    dailyRemaining.textContent = formatYen(Math.max(remaining, 0));
    if (remaining < 0) {
        dailyRemaining.classList.add('amount-expense');
    } else {
        dailyRemaining.classList.remove('amount-expense');
    }

    // Update Circle Progress
    // Total perimeter = 2 * PI * R = 2 * 3.14159 * 40 = 251.2
    const totalCircumference = 251.2;
    const budgetRatio = Math.max(remaining / state.dailyBudget, 0);
    const strokeDashoffset = totalCircumference * (1 - budgetRatio);
    dailyCircle.style.strokeDashoffset = strokeDashoffset;

    // Change circle color based on budget remaining
    if (budgetRatio <= 0) {
        dailyCircle.style.stroke = 'var(--color-danger)';
    } else if (budgetRatio < 0.3) {
        dailyCircle.style.stroke = 'var(--color-warning)';
    } else {
        dailyCircle.style.stroke = 'var(--color-success)';
    }

    // 3. Update Savings Pace Badge
    let pace = 'success'; // default safety
    let paceLabel = '安全';
    let paceDescription = 'このペースを維持できれば、目標日までにプレゼントを購入できます！非常に順調です。';

    const recentDangerLogs = state.history.filter(h => h.category === 'ゲーム・娯楽' && h.type === 'expense');
    const totalDangerSpent = recentDangerLogs.reduce((sum, current) => sum + current.amount, 0);

    if (remaining < 0 || totalDangerSpent >= 5000) {
        pace = 'danger';
        paceLabel = '危険';
        paceDescription = '無駄遣いまたは予算超過が発生しています！親孝行プレゼントの達成予定日が遅れる恐れがあります。今すぐ引き締めましょう！';
    } else if (remaining < 1000 || totalDangerSpent > 0) {
        pace = 'warning';
        paceLabel = '警告';
        paceDescription = '少し支出ペースが上がっています。特に娯楽カテゴリでの出費に注意し、親孝行用の予算を確保しましょう。';
    }

    paceBadge.className = `pace-badge badge-${pace}`;
    paceBadge.textContent = paceLabel;
    paceDesc.textContent = paceDescription;

    // 4. Update Warning Log Section
    warningsList.innerHTML = '';
    if (state.warnings.length === 0) {
        warningsList.innerHTML = '<div class="no-warning">現在、類似商品の重複購入に関する警告はありません。無駄遣いゼロを維持しています！</div>';
    } else {
        state.warnings.forEach(w => {
            const item = document.createElement('div');
            item.classList.add('warning-item');
            item.textContent = w;
            warningsList.appendChild(item);
        });
    }

    // 5. Update Expense Logs
    historyList.innerHTML = '';
    state.history.forEach(h => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.innerHTML = `
            <div class="history-item-left">
                <span class="history-category">${h.category}</span>
                <span>${h.item}</span>
            </div>
            <div class="history-amount ${h.type === 'expense' ? 'amount-expense' : 'amount-income'}">
                ${h.type === 'expense' ? '-' : '+'}${formatYen(h.amount)}
            </div>
        `;
        historyList.appendChild(item);
    });
}

// Check for duplicated or similar purchases and issue warning if needed
function checkDuplicatedPurchases(item, amount, category) {
    if (category === 'ゲーム・娯楽') {
        if (item.includes('クレーンゲーム')) {
            state.similarPurchases['クレーンゲーム']++;
            if (state.similarPurchases['クレーンゲーム'] >= 2) {
                const warnMsg = `⚠️ 重複警告: 『クレーンゲーム』の支出を短期間に複数回検知しました。部屋の置き場所がなくなるバグ（VPCバグ#11）や無駄遣いを防ぐ約束です！`;
                if (!state.warnings.includes(warnMsg)) {
                    state.warnings.unshift(warnMsg);
                }
                return 'crane_warn';
            }
        }
        if (item.includes('ソシャゲ') || item.includes('ガチャ') || item.includes('課金') || item.includes('ゲーム課金')) {
            state.similarPurchases['ゲーム課金']++;
            if (state.similarPurchases['ゲーム課金'] >= 2) {
                const warnMsg = `⚠️ 浪費警告: 『ゲーム内課金』が連続して検知されています。VPCバグ#1「クレーンゲームやガチャ無駄遣い」を抑制し、親孝行資金に回しましょう！`;
                if (!state.warnings.includes(warnMsg)) {
                    state.warnings.unshift(warnMsg);
                }
                return 'game_warn';
            }
        }
    }
    
    if (category === 'カフェ・軽食' || item.includes('カフェ') || item.includes('スタバ') || item.includes('コーヒー')) {
        state.similarPurchases['カフェ']++;
        if (state.similarPurchases['カフェ'] >= 2) {
            const warnMsg = `☕ 類似警告: カフェでの小まめな出費（ラテマネー）が重なっています。1回は小さくても、積もると親孝行貯金を圧迫しますよ！`;
            if (!state.warnings.includes(warnMsg)) {
                state.warnings.unshift(warnMsg);
            }
            return 'cafe_warn';
        }
    }

    return 'none';
}

// Process new expenses (Common handler for Chat and Simulator)
function processExpense(item, amount, category, isSimulator = false) {
    const isGoalSaving = item.includes('親孝行') || item.includes('プレゼント') || category === '親孝行';

    if (isGoalSaving) {
        // Goal Saving / Income
        state.targetCurrent += amount;
        state.history.unshift({
            time: getTimestamp(),
            item: item,
            amount: amount,
            category: '親孝行貯金',
            type: 'income'
        });

        // Assistant praises
        const praiseMsg = `素晴らしいです！お母さんへのプレゼント資金口座へ <strong>${formatYen(amount)}</strong> を貯金しました！目標達成度がアップし、現在 <strong>${formatYen(state.targetCurrent)}</strong> 貯まりました！この調子で親孝行を実現させましょう！🥰🎁`;
        setTimeout(() => {
            appendMessage('ココ', praiseMsg, 'assistant');
        }, isSimulator ? 1500 : 300);

    } else {
        // Normal Expense
        state.dailySpent += amount;
        state.history.unshift({
            time: getTimestamp(),
            item: item,
            amount: amount,
            category: category,
            type: 'expense'
        });

        // Duplication and budget check
        const duplicationType = checkDuplicatedPurchases(item, amount, category);
        const remaining = state.dailyBudget - state.dailySpent;

        // Generate AI Assistant Response
        let response = `出費 <strong>${item}</strong> (${formatYen(amount)}) を記録しました。`;
        
        if (duplicationType === 'crane_warn') {
            response += `<br><br><span style="color:var(--color-danger); font-weight:700;">🚨 ココからの超重要警告：</span><br>ちょっと待ってください！またクレーンゲームですか？先ほどもやりましたよね！💸<br>「クレーンゲームでお金を無駄遣いするバグ」（VPCバグ#1）が発生しています。お部屋の置き場所（VPCバグ#11）もなくなってしまいます。今日はもうストップしましょう！約束ですよ。`;
        } else if (duplicationType === 'game_warn') {
            response += `<br><br><span style="color:var(--color-danger); font-weight:700;">🚨 ココからの超重要警告：</span><br>またアプリ内課金ですか！？ゲームでの浪費はお財布の天敵です。この <strong>${formatYen(amount)}</strong> があれば、お母さんに美味しい食事をもう一品プレゼントできましたよ。目標の温泉旅行に向けて、いま一度目的を思い出してください！🔥`;
        } else if (duplicationType === 'cafe_warn') {
            response += `<br><br><span style="color:var(--color-warning); font-weight:700;">⚠️ ココからのアドバイス：</span><br>今日2回目のカフェ出費ですね。リフレッシュも大切ですが、少し回数を減らすだけで親孝行貯金のペースがぐっと安定しますよ！`;
        } else {
            // General responses
            if (remaining < 0) {
                response += `<br><br><span style="color:var(--color-danger); font-weight:700;">⚠️ 予算オーバー警告：</span><br>今日の残予算を超過しました（現在オーバー分: ${formatYen(Math.abs(remaining))}）。明日は少し買い物を控えて、帳尻を合わせましょう！`;
            } else if (remaining < 1000) {
                response += `<br><br>今日の残予算が残り少なくなっています（あと ${formatYen(remaining)}）。無駄遣いしないよう気を引き締めましょう！`;
            } else {
                response += `<br>本日の残予算は ${formatYen(remaining)} です。この調子で余計なものは買わないように頑張りましょう！👍`;
            }
        }

        setTimeout(() => {
            appendMessage('ココ', response, 'assistant');
        }, isSimulator ? 1500 : 300);
    }

    updateDashboard();
}

// --- Natural Language Processing (Basic regex parsing) ---
function parseChatMessage(text) {
    // Look for numbers representing money
    const amountRegex = /(\d+[,0-9]*)\s*(?:円|yen|Yen|円使った|の出費|の支出)/i;
    const simpleNumberRegex = /(?:合計|金額|で)?\s*(\d+[,0-9]*)\s*$/; // Fallback to numbers at the end of string

    let match = text.match(amountRegex);
    if (!match) {
        match = text.match(simpleNumberRegex);
    }

    if (!match) return null;

    const amount = parseInt(match[1].replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) return null;

    // Determine item and category
    let item = text.replace(match[0], '').trim();
    
    // Clean up particles and verbs
    item = item.replace(/^(で|に|が)/, '').replace(/(を使った|を購入|しました|使った|買った|です|だ)$/, '').trim();
    if (!item) item = "未分類の支出";

    // Detect category automatically
    let category = "その他";
    if (item.includes("ラーメン") || item.includes("ご飯") || item.includes("お昼") || item.includes("ランチ") || item.includes("スタバ") || item.includes("カフェ") || item.includes("コーヒー") || item.includes("おにぎり") || item.includes("食")) {
        category = item.includes("カフェ") || item.includes("スタバ") || item.includes("コーヒー") ? "カフェ・軽食" : "食費";
    } else if (item.includes("ゲーム") || item.includes("ガチャ") || item.includes("課金") || item.includes("クレーンゲーム") || item.includes("ゲーセン")) {
        category = "ゲーム・娯楽";
    } else if (item.includes("電車") || item.includes("タクシー") || item.includes("バス") || item.includes("切符") || item.includes("交通")) {
        category = "交通費";
    } else if (item.includes("貯金") || item.includes("親孝行") || item.includes("プレゼント")) {
        category = "親孝行";
    }

    return { item, amount, category };
}

// --- Event Listeners ---

// Chat submit handler
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Append user message
    appendMessage('あなた', text, 'user');
    chatInput.value = '';

    // Parse message
    const parsed = parseChatMessage(text);

    if (parsed) {
        processExpense(parsed.item, parsed.amount, parsed.category, false);
    } else {
        // Helper bot response when not understood
        setTimeout(() => {
            appendMessage('ココ', 'すみません、出費の金額がうまく読み取れませんでした…💦<br>「コーヒーに500円」や「ラーメン 800」のように、<b>品目名と金額</b>を一緒に送ってみてください！', 'assistant');
        }, 400);
    }
});

// Simulator Button Handlers
document.querySelectorAll('.sim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const amount = parseInt(btn.getAttribute('data-amount'), 10);
        const item = btn.getAttribute('data-item');
        const category = btn.getAttribute('data-category');

        // Determine severity of toast
        let toastType = 'danger';
        let toastTitle = '💳 決済検知（ゲーム・娯楽）';
        let toastMsg = `クレジットカードの利用通知を受け取りました：${item}`;

        if (category === 'カフェ・軽食') {
            toastType = 'warning';
            toastTitle = '💳 決済検知（カフェ）';
        } else if (category === '親孝行') {
            toastType = 'success';
            toastTitle = '🎁 専用口座への振替完了';
            toastMsg = `親孝行用貯金口座へ送金が実行されました：${item}`;
        }

        // 1. Show Toast Popup immediately
        showToast(toastTitle, toastMsg, amount, toastType);

        // 2. Insert special systemic alert card into Chat interface after a short delay
        setTimeout(() => {
            appendMessage('SYSTEM', `${item} の決済を検知しました。自動記録します。`, 'system', formatYen(amount));
            
            // 3. Process the expense log and trigger bot response
            processExpense(item, amount, category, true);
        }, 800);
    });
});

// --- Initial Launch Setup ---
window.addEventListener('DOMContentLoaded', () => {
    // Initial welcome message from AI Assistant
    const welcomeText = `こんにちは！AIアシスタントの<strong>ココ</strong>です。😊<br><br>お母さんへのプレゼント（目標：50,000円）に向けて、今日も無駄遣いを防ぐチャット家計簿をスタートしましょう！<br><br>あなたがチャット欄に「お昼ご飯に850円」のように送信するか、あるいは左側の<b>クレジットカード決済シミュレーター</b>を動作させると、出費を<b>リアルタイムに検知</b>して家計簿に自動登録し、貯金への影響や類似商品の警告をすぐにお知らせします！<br><br>無駄なゲーム課金や、ついつい買いすぎてしまうクレーンゲームなどは厳しくチェックしますからね！応援しています！🔥`;
    
    appendMessage('ココ', welcomeText, 'assistant');
    updateDashboard();
});
