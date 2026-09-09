import type { DashboardData } from './types.ts'
import {
  bodyComposition,
  dailyCalories,
  exerciseWeeklyTotals,
  latestWeight,
  plannedWeightAt,
  progress,
  projectedGoalDate,
  sortByDate,
  weightMovingAverage,
} from './metrics.ts'
import { COMMON_CSS, COMMON_MOBILE_CSS, footerHtml, headerHtml } from './page-common.ts'

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function signed(x: number, unit: string): string {
  return `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x).toFixed(1)}${unit}`
}

const DASHBOARD_CSS = `
  .lead { padding: 32px 0 24px; }
  .lead h1 { font-size: 26px; line-height: 1.4; margin: 0 0 8px; font-weight: 600; letter-spacing: -.025em; }
  .lead .dek { color: var(--ink-soft); margin: 0; max-width: 750px; }
  .headline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .headline .item { padding: 20px 22px; border: 1px solid var(--rule); border-radius: 8px; }
  .headline .k { color: var(--ink-soft); display: block; font-size: 13px; }
  .headline .v { font-size: 34px; font-weight: 600; letter-spacing: -.035em; font-variant-numeric: tabular-nums; line-height: 1.3; display: block; margin-top: 8px; }
  .headline .v.is-good { color: var(--green); }
  .headline .n { font-size: 12px; color: var(--ink-soft); display: block; margin-top: 7px; }
  .dashboard-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; }
  .dashboard-main { min-width: 0; display: grid; gap: 20px; }
  .dashboard-side { min-width: 0; position: sticky; top: 24px; display: grid; gap: 20px; }
  .side-panel { padding: 20px; }
  .side-panel h2 { margin: 0 0 16px; font-size: 15px; font-weight: 600; }
  .goal-number { font-size: 30px; font-weight: 600; letter-spacing: -.03em; margin: 4px 0 14px; }
  .goal-number small { font-size: 14px; color: var(--ink-soft); font-weight: 400; }
  .side-panel p { color: var(--ink-soft); font-size: 12px; }
  .side-panel dl { margin: 18px 0; }
  .side-panel dl > div { display: flex; justify-content: space-between; gap: 12px; margin: 10px 0; font-size: 13px; }
  .side-panel dt { color: var(--ink-soft); }
  .side-panel dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 500; }
  .side-panel .button-link { width: 100%; }
  .side-links { display: grid; gap: 8px; }
  .track-bar { height: 8px; background: #eaeef2; border-radius: 8px; overflow: hidden; }
  .track-fill { height: 100%; background: #2da44e; border-radius: 8px; }
  .track-ends { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-soft); margin-top: 8px; }
  .section { border: 1px solid var(--rule); border-radius: 8px; padding: 22px; min-width: 0; }
  .section > h2 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
  .section > .note { font-size: 13px; color: var(--ink-soft); margin: 0 0 20px; }
  .chart { position: relative; height: 280px; }
  .readout { padding: 12px 14px; background: var(--bg-soft); border-radius: 6px; margin: 16px 0 0; font-size: 12px; color: var(--ink-soft); }
  .readout strong { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
  .section .table-scroll { margin-top: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { text-align: left; font-size: 12px; font-weight: 600; color: var(--ink-soft); padding: 10px 12px; border-bottom: 1px solid var(--rule); background: var(--bg-soft); }
  tbody td { padding: 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  tbody tr:last-child td { border: 0; }
  tbody tr:hover { background: var(--bg-soft); }
  td.num { white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.memo { color: var(--ink-soft); font-size: 12px; }
  .empty { color: var(--ink-soft); font-size: 14px; padding: 16px; }
`
const DASHBOARD_MOBILE_CSS = `
  @media (max-width: 960px) {
    .dashboard-layout { grid-template-columns: minmax(0, 1fr); }
    .dashboard-side { position: static; grid-row: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dashboard-side .quick-links { display: none; }
  }
  @media (max-width: 640px) {
    .lead { padding: 24px 0 20px; }
    .lead h1 { font-size: 23px; }
    .lead .dek { font-size: 13px; }
    .lead .page-heading > .badge { display: none; }
    .headline { gap: 8px; margin-bottom: 16px; }
    .headline .item { padding: 14px 10px; }
    .headline .v { font-size: 25px; }
    .headline .k, .headline .n { font-size: 11px; }
    .headline .v small { font-size: 12px !important; }
    .dashboard-layout, .dashboard-main { gap: 16px; }
    .dashboard-side { grid-template-columns: 1fr; gap: 12px; }
    .dashboard-side .nutrition-panel { display: none; }
    .side-panel { padding: 16px; }
    .side-panel dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; margin: 10px 0; }
    .side-panel dl > div { font-size: 12px; }
    .section { padding: 18px 14px; }
    .section h2 { font-size: 15px; }
    .chart { height: 250px; }
    .table-scroll table { min-width: 460px; }
  }
`

/** data/ の全レコードから dashboard.html の内容を生成する。データはHTML内に埋め込み、file:// で開ける。 */
export function buildDashboardHtml(data: DashboardData): string {
  const { profile } = data
  const weights = sortByDate(data.weights)
  const latest = latestWeight(weights)
  const current = latest ? latest.weight : profile.startWeight
  const prog = progress(profile, current)
  const projection = projectedGoalDate(weights, profile.goalWeight)
  const daily = dailyCalories(data.meals)
  const movingAvg = weightMovingAverage(weights, 7)
  const comp = bodyComposition(weights)
  const exWeeks = exerciseWeeklyTotals(data.exercises)

  const first = comp[0]
  const last = comp[comp.length - 1]
  const fatDelta = first && last ? last.fatMass - first.fatMass : null
  const leanDelta = first && last ? last.leanMass - first.leanMass : null
  const bodyFatDelta =
    latest?.bodyFat !== undefined && weights[0]?.bodyFat !== undefined ? latest.bodyFat - weights[0].bodyFat : null

  const elapsedDays =
    weights.length > 0
      ? Math.round(
          (Date.parse(`${weights[weights.length - 1].date}T00:00:00Z`) - Date.parse(`${profile.startDate}T00:00:00Z`)) /
            86400000,
        ) + 1
      : 0

  // 直近7日と、その前7日の摂取平均（食事の一貫性を1行で示すため）
  const recentDaily = daily.slice(-7)
  const avgKcal =
    recentDaily.length > 0 ? Math.round(recentDaily.reduce((s, d) => s + d.calories, 0) / recentDaily.length) : null
  const avgProtein =
    recentDaily.length > 0 ? Math.round(recentDaily.reduce((s, d) => s + d.protein, 0) / recentDaily.length) : null

  const lastWeek = exWeeks[exWeeks.length - 1]

  const weightChart = weights.map((w, i) => ({
    date: w.date,
    weight: w.weight,
    average: movingAvg[i]?.average ?? null,
    planned: plannedWeightAt(profile, w.date),
  }))

  const exercises = sortByDate(data.exercises).slice(-8).reverse()

  const embedded = JSON.stringify({
    weightChart,
    comp,
    daily,
    goal: profile.goalWeight,
    calorieTarget: profile.dailyCalorieTarget,
    proteinTarget: profile.dailyProteinTarget,
  }).replaceAll('</', '<\\/')

  const exerciseRows = exercises
    .map(
      (e) =>
        `<tr><td class="num">${esc(e.date)}</td><td>${esc(e.type)}</td><td class="num">${e.minutes}分</td><td class="memo">${esc(e.note ?? '')}</td></tr>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>減量・体力増強の記録</title>
<meta name="description" content="46歳・178cm の体組成改善の記録。体重・体脂肪率・摂取カロリー・運動を毎日計測し、脂肪だけを落とすことを目指しています。">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>${COMMON_CSS}${DASHBOARD_CSS}${COMMON_MOBILE_CSS}${DASHBOARD_MOBILE_CSS}</style>
</head>
<body>
${headerHtml('dashboard')}
<main id="main-content" class="wrap" tabindex="-1">

  <div class="lead">
    <p class="eyebrow">OVERVIEW / 記録の概要</p>
    <div class="page-heading"><h1>日々の変化を、ひと目で。</h1><span class="badge badge-green">${elapsedDays}日目の記録</span></div>
    <p class="dek">${profile.age}歳・${profile.heightCm}cm。体重・食事・運動を記録して、減量と体力づくりを続けています。${latest ? ` 最終計測 ${esc(latest.date)}` : ' 体重はまだ記録されていません。'}</p>
  </div>

  <div class="headline">
    <div class="item">
      <span class="k">体重</span>
      <span class="v">${current}<small style="font-size:16px;font-weight:400"> kg</small></span>
      <span class="n">開始 ${profile.startWeight}kg → ${signed(current - profile.startWeight, 'kg')}</span>
    </div>
    <div class="item">
      <span class="k">体脂肪率</span>
      <span class="v">${latest?.bodyFat ?? '—'}<small style="font-size:16px;font-weight:400"> %</small></span>
      <span class="n">${bodyFatDelta !== null ? `開始 ${weights[0].bodyFat}% → ${signed(bodyFatDelta, 'pt')}` : '—'}</span>
    </div>
    <div class="item">
      <span class="k">脂肪量の変化（推定）</span>
      <span class="v is-good">${fatDelta !== null ? signed(fatDelta, '') : '—'}<small style="font-size:16px;font-weight:400"> kg</small></span>
      <span class="n">${leanDelta !== null ? `脂肪の増減。除脂肪量は ${signed(leanDelta, 'kg')}` : '—'}</span>
    </div>
  </div>

  <div class="dashboard-layout">
  <div class="dashboard-main">
  <section class="section" id="weight">
    <h2>体重の推移</h2>
    <p class="note">日々の体重は水分や食事内容で ±0.5kg ほど振れます。トレンドを見るための 7日移動平均を重ねています。</p>
    <div class="chart"><canvas id="weight-chart" role="img" aria-label="体重と7日移動平均の推移">体重と7日移動平均の推移。概要は前後のテキストをご覧ください。</canvas></div>
    <p class="readout">薄い線は日々の計測、青い線は7日移動平均です。日ごとの変動と継続的な傾向を合わせて確認できます。</p>
  </section>

  <section class="section" id="composition">
    <h2>体組成の推移</h2>
    <p class="note">体重の増減だけでは、脂肪が減ったのか筋肉が減ったのか分かりません。体脂肪率から内訳を算出しています。</p>
    <div class="chart"><canvas id="comp-chart" role="img" aria-label="推定脂肪量と除脂肪量の推移">推定脂肪量と除脂肪量の推移。概要は前後のテキストをご覧ください。</canvas></div>
    ${
      fatDelta !== null && leanDelta !== null
        ? `<p class="readout">${elapsedDays}日で脂肪が <strong>${signed(fatDelta, 'kg')}</strong>、除脂肪量（筋肉・骨・水分）は <strong>${signed(leanDelta, 'kg')}</strong>。家庭用体組成計の測定値から算出した目安です。</p>`
        : ''
    }
  </section>

  <section class="section" id="nutrition">
    <h2>食事と栄養</h2>
    <p class="note">1日の目標は ${profile.dailyCalorieTarget}kcal / タンパク質 ${profile.dailyProteinTarget}g。カロリーを下げる分はご飯（炭水化物）で調整し、タンパク源は減らしません。</p>
    <div class="chart"><canvas id="calorie-chart" role="img" aria-label="摂取カロリーとタンパク質の推移">摂取カロリーとタンパク質の推移。概要は前後のテキストをご覧ください。</canvas></div>
    ${
      avgKcal !== null
        ? `<p class="readout">直近${recentDaily.length}記録日の平均は <strong>${avgKcal}kcal</strong> / タンパク質 <strong>${avgProtein}g</strong>。外食や飲み会のある日も含めた数字です。</p>`
        : ''
    }
  </section>

  <section class="section" id="activity">
    <h2>最近の運動</h2>
    <p class="note">卓球（週1〜2回）、自宅での自重トレ、20mシャトルラン。ジムには通っていません。</p>
    ${
      lastWeek
        ? `<p class="readout">${esc(lastWeek.weekStart)}からの記録週は <strong>${lastWeek.count}回・${lastWeek.minutes}分</strong>。下の一覧で直近8件の運動内容を確認できます。</p>`
        : ''
    }
    <div class="table-scroll" tabindex="0" role="region" aria-label="最近の運動一覧（横にスクロールできます）">
    ${
      exerciseRows
        ? `<table><thead><tr><th>日付</th><th>種類</th><th>時間</th><th>内容</th></tr></thead><tbody>${exerciseRows}</tbody></table>`
        : '<p class="empty">まだ記録がありません</p>'
    }
    </div>
  </section>

  </div>
  <aside class="dashboard-side" aria-label="目標とショートカット">
    <section class="panel side-panel">
      <h2>目標までの進捗</h2>
      <span class="badge badge-green">目標 ${esc(profile.goalDate)}</span>
      <div class="goal-number">${profile.goalWeight} <small>kg を目指して</small></div>
      <div class="track-bar" role="progressbar" aria-label="目標体重への進捗" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, prog.percent)}"><div class="track-fill" style="width:${Math.max(0, prog.percent)}%"></div></div>
      <div class="track-ends"><span>開始 ${profile.startWeight}kg</span><span>${prog.percent}%</span></div>
      <dl><div><dt>目標まで</dt><dd>${prog.remaining} kg</dd></div><div><dt>達成予測</dt><dd>${projection ? esc(projection) : current <= profile.goalWeight ? '目標達成' : '算出できません'}</dd></div></dl>
      <p>予測は直近2週間の記録をもとにした目安です。</p>
      <a class="button-link" href="plan.html">計画の詳細を見る →</a>
    </section>
    <section class="panel side-panel nutrition-panel">
      <h2>1日の栄養目標</h2>
      <dl><div><dt>カロリー</dt><dd>${profile.dailyCalorieTarget.toLocaleString('ja-JP')} kcal</dd></div><div><dt>タンパク質</dt><dd>${profile.dailyProteinTarget} g</dd></div></dl>
      <a class="button-link" href="menu.html">献立と買い物を見る →</a>
    </section>
    <nav class="panel side-panel quick-links" aria-label="記録の目次">
      <h2>このページの内容</h2><div class="side-links"><a href="#weight">体重の推移</a><a href="#composition">体組成の推移</a><a href="#nutrition">食事と栄養</a><a href="#activity">最近の運動</a></div>
    </nav>
  </aside>
  </div>
</main>
${footerHtml(esc(data.generatedAt))}

<script>
const DATA = ${embedded};
const INK = '#1f2328', FAINT = '#656d76', RULE = '#d8dee4', ACCENT = '#0969da';

Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif';
Chart.defaults.font.size = 11;
Chart.defaults.color = FAINT;

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 14, usePointStyle: true } },
    tooltip: { backgroundColor: INK, padding: 10, cornerRadius: 4, displayColors: true },
  },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
    y: { grid: { color: RULE, drawTicks: false }, border: { display: false } },
  },
};

new Chart(document.getElementById('weight-chart'), {
  data: {
    labels: DATA.weightChart.map(function (w) { return w.date.slice(5); }),
    datasets: [
      {
        type: 'line', label: '日々の体重',
        data: DATA.weightChart.map(function (w) { return w.weight; }),
        borderColor: RULE, backgroundColor: FAINT,
        borderWidth: 1, pointRadius: 2.5, pointBackgroundColor: FAINT, pointBorderWidth: 0,
      },
      {
        type: 'line', label: '7日移動平均',
        data: DATA.weightChart.map(function (w) { return w.average; }),
        borderColor: ACCENT, borderWidth: 2.5, pointRadius: 0, tension: 0.3, spanGaps: true,
      },
      {
        type: 'line', label: '計画ペース',
        data: DATA.weightChart.map(function (w) { return w.planned; }),
        borderColor: FAINT, borderDash: [3, 4], borderWidth: 1, pointRadius: 0, spanGaps: true,
      },
      {
        type: 'line', label: '目標 ' + DATA.goal + 'kg',
        data: DATA.weightChart.map(function () { return DATA.goal; }),
        borderColor: INK, borderDash: [6, 4], borderWidth: 1, pointRadius: 0,
      },
    ],
  },
  options: Object.assign({}, baseOptions, {
    scales: Object.assign({}, baseOptions.scales, {
      y: Object.assign({}, baseOptions.scales.y, { ticks: { callback: function (v) { return v + 'kg'; } } }),
    }),
  }),
});

new Chart(document.getElementById('comp-chart'), {
  data: {
    labels: DATA.comp.map(function (c) { return c.date.slice(5); }),
    datasets: [
      {
        type: 'line', label: '除脂肪量（筋肉・骨・水分）',
        data: DATA.comp.map(function (c) { return c.leanMass; }),
        borderColor: INK, backgroundColor: 'rgba(22,24,29,0.06)',
        borderWidth: 2, pointRadius: 0, tension: 0.3, fill: 'origin',
      },
      {
        type: 'line', label: '脂肪量',
        data: DATA.comp.map(function (c) { return c.fatMass; }),
        borderColor: ACCENT, backgroundColor: 'rgba(9,105,218,0.10)',
        borderWidth: 2, pointRadius: 0, tension: 0.3, fill: 'origin',
      },
    ],
  },
  options: Object.assign({}, baseOptions, {
    scales: Object.assign({}, baseOptions.scales, {
      y: Object.assign({}, baseOptions.scales.y, {
        beginAtZero: false,
        ticks: { callback: function (v) { return v + 'kg'; } },
      }),
    }),
  }),
});

new Chart(document.getElementById('calorie-chart'), {
  data: {
    labels: DATA.daily.map(function (d) { return d.date.slice(5); }),
    datasets: [
      {
        type: 'bar', label: '摂取カロリー',
        data: DATA.daily.map(function (d) { return d.calories; }),
        backgroundColor: 'rgba(9,105,218,0.32)', borderColor: ACCENT, borderWidth: 0,
        yAxisID: 'y', order: 3,
      },
      {
        type: 'line', label: '目標 ' + DATA.calorieTarget + 'kcal',
        data: DATA.daily.map(function () { return DATA.calorieTarget; }),
        borderColor: ACCENT, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, yAxisID: 'y', order: 1,
      },
      {
        type: 'line', label: 'タンパク質',
        data: DATA.daily.map(function (d) { return d.protein; }),
        borderColor: INK, borderWidth: 2, pointRadius: 0, tension: 0.3, yAxisID: 'y2', order: 2,
      },
      {
        type: 'line', label: 'タンパク質目標 ' + DATA.proteinTarget + 'g',
        data: DATA.daily.map(function () { return DATA.proteinTarget; }),
        borderColor: INK, borderDash: [5, 4], borderWidth: 1, pointRadius: 0, yAxisID: 'y2', order: 1,
      },
    ],
  },
  options: Object.assign({}, baseOptions, {
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: {
        position: 'left', beginAtZero: true, grid: { color: RULE, drawTicks: false }, border: { display: false },
        ticks: { callback: function (v) { return v + ''; } }, title: { display: true, text: 'kcal' },
      },
      y2: {
        position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, border: { display: false },
        title: { display: true, text: 'タンパク質 g' },
      },
    },
  }),
});
</script>
</body>
</html>
`
}
