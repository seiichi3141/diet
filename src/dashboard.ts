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
  /* リード: 現在地を数字で示す */
  .lead { padding: 56px 0 40px; }
  .lead h1 {
    font-family: var(--serif); font-size: 30px; line-height: 1.5;
    margin: 0 0 10px; letter-spacing: 0.01em; font-weight: 600;
  }
  .lead .dek { font-size: 15px; color: var(--ink-soft); margin: 0; }

  .headline {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 4px; margin: 36px 0 8px;
    border-top: 2px solid var(--ink); border-bottom: 1px solid var(--rule);
  }
  .headline .item { padding: 20px 0 18px; }
  .headline .item + .item { border-left: 1px solid var(--rule); padding-left: 20px; }
  .headline .k { font-size: 11px; letter-spacing: 0.08em; color: var(--ink-faint); display: block; }
  .headline .v {
    font-family: var(--num); font-size: 34px; font-weight: 600;
    letter-spacing: -0.02em; line-height: 1.15; display: block; margin-top: 6px;
  }
  .headline .v.is-good { color: var(--accent); }
  .headline .n { font-size: 12px; color: var(--ink-soft); display: block; margin-top: 4px; }

  /* 進捗 */
  .track { margin: 28px 0 8px; }
  .track-bar { height: 6px; background: var(--rule); border-radius: 3px; overflow: hidden; }
  .track-fill { height: 100%; background: var(--accent); border-radius: 3px; }
  .track-ends {
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--ink-faint); margin-top: 8px;
  }

  /* 本文セクション */
  .section { padding-top: 44px; }
  .section > h2 {
    font-family: var(--serif); font-size: 20px; font-weight: 600;
    margin: 0 0 6px; letter-spacing: 0.01em;
  }
  .section > .note { font-size: 14px; color: var(--ink-soft); margin: 0 0 20px; }
  .chart { position: relative; height: 300px; }

  /* 読み取り: グラフの下に置く一言 */
  .readout {
    border-left: 2px solid var(--accent); background: var(--accent-soft);
    padding: 12px 16px; margin-top: 18px; font-size: 14px; border-radius: 0 4px 4px 0;
  }
  .readout strong { font-family: var(--num); font-weight: 600; }

  /* 表 */
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th {
    text-align: left; font-size: 11px; letter-spacing: 0.06em; font-weight: 600;
    color: var(--ink-faint); padding: 0 12px 8px 0; border-bottom: 1px solid var(--ink);
  }
  tbody td { padding: 11px 12px 11px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
  tbody td.num { font-family: var(--num); white-space: nowrap; }
  tbody td.memo { color: var(--ink-soft); font-size: 13px; }
  .empty { color: var(--ink-faint); font-size: 14px; }
`

const DASHBOARD_MOBILE_CSS = `
  @media (max-width: 640px) {
    .lead { padding: 32px 0 24px; }
    .lead h1 { font-size: 23px; }
    .headline { grid-template-columns: 1fr 1fr; }
    .headline .item:nth-child(3) { grid-column: 1 / -1; border-left: 0; padding-left: 0; border-top: 1px solid var(--rule); }
    .headline .item:nth-child(2) { padding-left: 16px; }
    .headline .v { font-size: 28px; }
    .section { padding-top: 34px; }
    .chart { height: 250px; }
    .table-scroll { overflow-x: auto; }
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
<main class="wrap">

  <div class="lead">
    <h1>46歳・${profile.heightCm}cm、<br>脂肪だけを落とす${elapsedDays}日間</h1>
    <p class="dek">毎朝の体重・体脂肪率と、食べたもの・動いたものをすべて記録しています。目標は ${profile.goalWeight}kg（${esc(profile.goalDate)}まで）。</p>
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
      <span class="k">内訳の変化</span>
      <span class="v is-good">${fatDelta !== null ? signed(fatDelta, '') : '—'}<small style="font-size:16px;font-weight:400"> kg</small></span>
      <span class="n">${leanDelta !== null ? `脂肪の増減。除脂肪量は ${signed(leanDelta, 'kg')}` : '—'}</span>
    </div>
  </div>

  <div class="track">
    <div class="track-bar"><div class="track-fill" style="width:${prog.percent}%"></div></div>
    <div class="track-ends">
      <span>${profile.startWeight}kg</span>
      <span>進捗 ${prog.percent}%　残り ${prog.remaining}kg${projection ? `　達成予測 ${esc(projection)}` : ''}</span>
      <span>${profile.goalWeight}kg</span>
    </div>
  </div>

  <section class="section">
    <h2>体重の推移</h2>
    <p class="note">日々の体重は水分や食事内容で ±0.5kg ほど振れます。トレンドを見るための 7日移動平均を重ねています。</p>
    <div class="chart"><canvas id="weight-chart"></canvas></div>
    <p class="readout">判断材料になるのは移動平均の線だけです。1日の上下、とくに運動した翌日や飲酒の翌朝の変動は、ほぼ水分によるものでした。</p>
  </section>

  <section class="section">
    <h2>体重の中身 — 脂肪と除脂肪量</h2>
    <p class="note">体重の増減だけでは、脂肪が減ったのか筋肉が減ったのか分かりません。体脂肪率から内訳を算出しています。</p>
    <div class="chart"><canvas id="comp-chart"></canvas></div>
    ${
      fatDelta !== null && leanDelta !== null
        ? `<p class="readout">${elapsedDays}日で脂肪が <strong>${signed(fatDelta, 'kg')}</strong>、除脂肪量（筋肉・骨・水分）は <strong>${signed(leanDelta, 'kg')}</strong>。減った分のほとんどが脂肪です。</p>`
        : ''
    }
  </section>

  <section class="section">
    <h2>食べたもの</h2>
    <p class="note">1日の目標は ${profile.dailyCalorieTarget}kcal / タンパク質 ${profile.dailyProteinTarget}g。カロリーを下げる分はご飯（炭水化物）で調整し、タンパク源は減らしません。</p>
    <div class="chart"><canvas id="calorie-chart"></canvas></div>
    ${
      avgKcal !== null
        ? `<p class="readout">直近7日の平均は <strong>${avgKcal}kcal</strong> / タンパク質 <strong>${avgProtein}g</strong>。外食や飲み会のある日も含めた数字です。</p>`
        : ''
    }
  </section>

  <section class="section">
    <h2>動いたもの</h2>
    <p class="note">卓球（週1〜2回）、自宅での自重トレ、20mシャトルラン。ジムには通っていません。</p>
    ${
      lastWeek
        ? `<p class="readout">直近の週は <strong>${lastWeek.count}回・${lastWeek.minutes}分</strong>。筋トレを続けているかどうかが、除脂肪量を保てるかを分けています。</p>`
        : ''
    }
    <div class="table-scroll">
    ${
      exerciseRows
        ? `<table><thead><tr><th>日付</th><th>種類</th><th>時間</th><th>内容</th></tr></thead><tbody>${exerciseRows}</tbody></table>`
        : '<p class="empty">まだ記録がありません</p>'
    }
    </div>
  </section>

</main>
${footerHtml(esc(data.generatedAt))}

<script>
const DATA = ${embedded};
const INK = '#16181d', FAINT = '#9aa1af', RULE = '#e6e8ec', ACCENT = '#c2410c';

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
        borderColor: ACCENT, backgroundColor: 'rgba(194,65,12,0.10)',
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
        backgroundColor: 'rgba(194,65,12,0.22)', borderColor: ACCENT, borderWidth: 0,
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
