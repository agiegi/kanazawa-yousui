// 読み込み確認用. 3つのファイルが繋がっていればここが動く
const status = document.getElementById("status");
status.textContent = "読み込みOK　問題数: " + QUESTIONS.length;

console.log("script.js 読み込み完了", QUESTIONS);