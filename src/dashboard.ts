import type { DashboardData } from './types.ts'
import {
  dailyCalories,
  latestWeight,
  plannedWeightAt,
  progress,
  projectedGoalDate,
  sortByDate,
  weeklyAverages,
} from './metrics.ts'

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/** data/ の全レコードから dashboard.html の内容を生成する。データはHTML内に埋め込み、file:// で開ける。 */
export function buildDashboardHtml(data: DashboardData): string {
  const { profile } = data
  const weights = sortByDate(data.weights)
  const latest = latestWeight(weights)
  const current = latest ? latest.weight : profile.startWeight
  const prog = progress(profile, current)
  const projection = projectedGoalDate(weights, profile.goalWeight)
  const daily = dailyCalories(data.meals)
  const weeks = weeklyAverages(weights)

  const weightChart = weights.map((w) => ({
    date: w.date,
    weight: w.weight,
    bodyFat: w.bodyFat ?? null,
    planned: plannedWeightAt(profile, w.date),
  }))

  const exercises = sortByDate(data.exercises).slice(-10).reverse()
  const conditions = sortByDate(data.conditions).slice(-10).reverse()

  const summary = {
    current,
    currentDate: latest ? latest.date : null,
    currentBodyFat: latest?.bodyFat ?? null,
    goal: profile.goalWeight,
    lost: prog.lost,
    remaining: prog.remaining,
    percent: prog.percent,
    projection,
    calorieTarget: profile.dailyCalorieTarget,
    proteinTarget: profile.dailyProteinTarget,
  }

  const embedded = JSON.stringify({
    summary,
    weightChart,
    daily,
    weeks,
    goalDate: profile.goalDate,
    planMd: data.planMd,
    menuMd: data.menuMd,
    recipesMd: data.recipesMd,
  }).replaceAll('</', '<\\/')

  const exerciseRows = exercises
    .map(
      (e) =>
        `<tr><td>${esc(e.date)}</td><td>${esc(e.type)}</td><td>${e.minutes}分</td><td>${esc(e.note ?? '')}</td></tr>`,
    )
    .join('\n')
  const conditionRows = conditions
    .map(
      (c) =>
        `<tr><td>${esc(c.date)}</td><td>${c.sleepHours !== undefined ? `${c.sleepHours}h` : '-'}</td><td>${esc(c.note ?? '')}</td></tr>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>減量ダッシュボード</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
  header { background: #1e293b; color: #fff; padding: 20px 24px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .date { font-size: 12px; opacity: 0.7; }
  main { max-width: 960px; margin: 0 auto; padding: 16px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .card { background: #fff; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
  .card .label { font-size: 11px; color: #64748b; }
  .card .value { font-size: 22px; font-weight: 700; margin-top: 2px; }
  .card .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .progress-wrap { background: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
  .progress-bar { height: 14px; background: #e2e8f0; border-radius: 7px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #22c55e); width: 0; transition: width 0.6s; }
  .progress-text { font-size: 12px; color: #475569; margin-top: 6px; }
  section { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
  section h2 { margin: 0 0 12px; font-size: 15px; }
  .chart-box { position: relative; height: 260px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { color: #64748b; font-weight: 600; }
  .empty { color: #94a3b8; font-size: 13px; }
  .tabs { display: flex; gap: 8px; margin-top: 14px; }
  .tab { background: transparent; color: #cbd5e1; border: 1px solid #475569; border-radius: 999px; padding: 6px 16px; font-size: 13px; cursor: pointer; }
  .tab.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .tab:hover { border-color: #93c5fd; }
  .md h1 { font-size: 20px; margin: 8px 0 12px; }
  .md h2 { font-size: 17px; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .md h3 { font-size: 15px; margin: 16px 0 6px; }
  .md p, .md li { font-size: 14px; line-height: 1.7; }
  .md ul, .md ol { padding-left: 22px; }
  .md table { margin: 8px 0 16px; }
  .md code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  .md pre { background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto; }
  .md a { color: #2563eb; }
  .md blockquote { border-left: 3px solid #cbd5e1; margin: 8px 0; padding: 2px 12px; color: #475569; }
  .md table { display: block; overflow-x: auto; }
  @media (max-width: 640px) {
    header { padding: 14px 16px; }
    main { padding: 10px; }
    .cards { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .card .value { font-size: 18px; }
    .chart-box { height: 220px; }
    .tabs { flex-wrap: wrap; }
    .tab { flex: 1 1 40%; text-align: center; padding: 8px 4px; font-size: 12px; }
    section { padding: 12px; }
    section table { display: block; overflow-x: auto; }
  }
</style>
</head>
<body>
<header>
  <h1>減量ダッシュボード</h1>
  <div class="date">生成: ${esc(data.generatedAt)} ／ 目標: ${profile.goalWeight}kg（${esc(profile.goalDate)}）</div>
  <nav class="tabs">
    <button class="tab active" data-tab="dashboard">ダッシュボード</button>
    <button class="tab" data-tab="plan">計画書</button>
    <button class="tab" data-tab="menu">メニュー・買い物</button>
    <button class="tab" data-tab="recipes">レシピ</button>
  </nav>
</header>
<main>
  <div id="tab-dashboard" class="tab-pane">
  <div class="cards">
    <div class="card"><div class="label">現在の体重</div><div class="value">${current}kg</div><div class="sub">${esc(summary.currentDate ?? '')}${summary.currentBodyFat !== null ? ` 体脂肪 ${summary.currentBodyFat}%` : ''}</div></div>
    <div class="card"><div class="label">開始から</div><div class="value">-${prog.lost}kg</div><div class="sub">開始 ${profile.startWeight}kg</div></div>
    <div class="card"><div class="label">目標まで</div><div class="value">残り ${prog.remaining}kg</div><div class="sub">目標 ${profile.goalWeight}kg</div></div>
    <div class="card"><div class="label">達成予測</div><div class="value" style="font-size:16px">${projection ?? '—'}</div><div class="sub">${projection ? '直近トレンドより' : 'データ不足またはトレンドなし'}</div></div>
  </div>

  <div class="progress-wrap">
    <div class="progress-bar"><div class="progress-fill" style="width: ${prog.percent}%"></div></div>
    <div class="progress-text">進捗 ${prog.percent}%（${profile.startWeight}kg → ${current}kg ／ 目標 ${profile.goalWeight}kg）</div>
  </div>

  <section>
    <h2>体重・体脂肪率の推移</h2>
    <div class="chart-box"><canvas id="weight-chart"></canvas></div>
  </section>

  <section>
    <h2>日次カロリー・タンパク質</h2>
    <div class="chart-box"><canvas id="calorie-chart"></canvas></div>
  </section>

  <section>
    <h2>運動履歴（直近10件）</h2>
    ${exerciseRows ? `<table><thead><tr><th>日付</th><th>種類</th><th>時間</th><th>メモ</th></tr></thead><tbody>${exerciseRows}</tbody></table>` : '<p class="empty">まだ記録がありません</p>'}
  </section>

  <section>
    <h2>睡眠・体調メモ（直近10件）</h2>
    ${conditionRows ? `<table><thead><tr><th>日付</th><th>睡眠</th><th>メモ</th></tr></thead><tbody>${conditionRows}</tbody></table>` : '<p class="empty">まだ記録がありません</p>'}
  </section>
  </div>

  <div id="tab-plan" class="tab-pane" hidden>
    <section><article id="plan-content" class="md"></article></section>
  </div>

  <div id="tab-menu" class="tab-pane" hidden>
    <section><article id="menu-content" class="md"></article></section>
  </div>

  <div id="tab-recipes" class="tab-pane" hidden>
    <section><article id="recipes-content" class="md"></article></section>
  </div>
</main>

<script>
const DATA = ${embedded};

document.getElementById('plan-content').innerHTML = marked.parse(DATA.planMd);
document.getElementById('menu-content').innerHTML = marked.parse(DATA.menuMd);
document.getElementById('recipes-content').innerHTML = marked.parse(DATA.recipesMd);

document.querySelectorAll('.tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
    document.querySelectorAll('.tab-pane').forEach(function (pane) { pane.hidden = pane.id !== 'tab-' + btn.dataset.tab; });
  });
});

const weightCtx = document.getElementById('weight-chart');
new Chart(weightCtx, {
  data: {
    labels: DATA.weightChart.map(function (w) { return w.date; }),
    datasets: [
      {
        type: 'line',
        label: '体重(kg)',
        data: DATA.weightChart.map(function (w) { return w.weight; }),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.2,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: '体脂肪率(%)',
        data: DATA.weightChart.map(function (w) { return w.bodyFat; }),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.2,
        spanGaps: true,
        yAxisID: 'y2',
      },
      {
        type: 'line',
        label: '目標 ' + DATA.summary.goal + 'kg',
        data: DATA.weightChart.map(function () { return DATA.summary.goal; }),
        borderColor: '#ef4444',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 1.5,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: '計画ペース',
        data: DATA.weightChart.map(function (w) { return w.planned; }),
        borderColor: '#94a3b8',
        borderDash: [2, 3],
        pointRadius: 0,
        borderWidth: 1.5,
        spanGaps: true,
        yAxisID: 'y',
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { position: 'left', title: { display: true, text: 'kg' } },
      y2: { position: 'right', title: { display: true, text: '%' }, grid: { drawOnChartArea: false } },
    },
  },
});

const calorieCtx = document.getElementById('calorie-chart');
new Chart(calorieCtx, {
  data: {
    labels: DATA.daily.map(function (d) { return d.date; }),
    datasets: [
      {
        type: 'bar',
        label: '摂取カロリー(kcal)',
        data: DATA.daily.map(function (d) { return d.calories; }),
        backgroundColor: '#3b82f6',
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'カロリー目標 ' + DATA.summary.calorieTarget + 'kcal',
        data: DATA.daily.map(function () { return DATA.summary.calorieTarget; }),
        borderColor: '#ef4444',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 1.5,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'タンパク質(g)',
        data: DATA.daily.map(function (d) { return d.protein; }),
        backgroundColor: '#22c55e',
        yAxisID: 'y2',
      },
      {
        type: 'line',
        label: 'タンパク質目標 ' + DATA.summary.proteinTarget + 'g',
        data: DATA.daily.map(function () { return DATA.summary.proteinTarget; }),
        borderColor: '#15803d',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 1.5,
        yAxisID: 'y2',
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { position: 'left', title: { display: true, text: 'kcal' } },
      y2: { position: 'right', title: { display: true, text: 'g' }, grid: { drawOnChartArea: false } },
    },
  },
});
</script>
</body>
</html>
`
}
