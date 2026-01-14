/* ================== DEMO MODE DETECTION ================== */
const DEMO_MODE = typeof chrome === 'undefined' || !chrome.storage;

/* ================== DEMO DATA GENERATOR ================== */
function generateDemoData() {
  const videosWatched = Math.floor(Math.random() * 20) + 5;

  const videoHistory = Array.from({ length: videosWatched }, () => {
    const duration = Math.floor(Math.random() * 60) + 10; // seconds
    const percentWatched = Math.floor(Math.random() * 100);
    return { duration, percentWatched };
  });

  const totalWatchedTime = videoHistory.reduce(
    (sum, v) => sum + v.duration * (v.percentWatched / 100),
    0
  );

  const avgPercentWatched =
    videoHistory.reduce((s, v) => s + v.percentWatched, 0) /
    videoHistory.length;

  return {
    videosWatched,
    totalWatchedTime,
    avgPercentWatched,
    videoHistory
  };
}

document.addEventListener('DOMContentLoaded', () => {

  const loadData = (data) => {
    const videos = data.videosWatched || 0;
    const totalTimeSec = data.totalWatchedTime || 0;
    const avgPercent = data.avgPercentWatched || 0;
    const history = data.videoHistory || [];

    document.getElementById('videos-count').textContent = videos;
    document.getElementById('avg-percent').textContent = `${Math.round(avgPercent)}%`;

    /* ================== THEME COLORS ================== */
    function getChartColors() {
      const isDark = document.body.classList.contains('dark');
      return {
        text: isDark ? '#ffffff' : '#000000',
        grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      };
    }

    /* ================== THEME TOGGLE ================== */
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        toggleBtn.textContent =
          document.body.classList.contains('dark') ? '☀️' : '🌙';
        updateChartColors();
      });
    }

    /* ================== RESET STATS ================== */
    const resetBtn = document.getElementById('reset-stats');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (DEMO_MODE) {
          location.reload();
        } else {
          chrome.storage.local.clear(() => location.reload());
        }
      });
    }

    let historyChart, pieChart;

    /* ================== WATCH HISTORY CHART ================== */
    if (history.length > 0 && typeof Chart !== 'undefined') {
      const ctx = document
        .getElementById('watch-history-chart')
        .getContext('2d');

      const percents = history.map(h => h.percentWatched);

      const movingAvg = percents.map((_, i, arr) => {
        const start = Math.max(0, i - 4);
        const slice = arr.slice(start, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });

      const colors = getChartColors();

      historyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map((_, i) => i + 1),
          datasets: [
            {
              label: '% Watched',
              data: percents,
              borderColor: 'steelblue',
              backgroundColor: 'rgba(54,162,235,0.2)',
              fill: true,
              tension: 0.2,
              pointRadius: 5
            },
            {
              label: 'Moving Avg (5)',
              data: movingAvg,
              borderColor: 'orange',
              borderWidth: 2,
              fill: false,
              tension: 0.2,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          animation: { duration: 800 },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: 'Watch %', color: colors.text },
              ticks: { color: colors.text },
              grid: { color: colors.grid }
            },
            x: {
              title: { display: true, text: 'Video index', color: colors.text },
              ticks: { color: colors.text },
              grid: { color: colors.grid }
            }
          },
          plugins: {
            legend: {
              display: true,
              labels: { color: colors.text }
            }
          }
        }
      });
    }

    /* ================== WATCHED vs WASTED PIE ================== */
    if (history.length > 0 && typeof Chart !== 'undefined') {
      let totalAvailableSec = 0;
      let totalWatchedSec = 0;

      history.forEach(v => {
        totalAvailableSec += v.duration;
        totalWatchedSec += v.duration * (v.percentWatched / 100);
      });

      const wastedSec = Math.max(totalAvailableSec - totalWatchedSec, 0);

      document.getElementById('watched-time').textContent =
        `Watched: ${Math.round(totalWatchedSec)} s`;
      document.getElementById('wasted-time').textContent =
        `Wasted: ${Math.round(wastedSec)} s`;
      document.getElementById('watch-time').textContent =
        `${Math.round(totalWatchedSec / 60)} min`;

      const ctxPie = document
        .getElementById('data-pie-chart')
        .getContext('2d');

      const colors = getChartColors();

      pieChart = new Chart(ctxPie, {
        type: 'pie',
        data: {
          labels: ['Watched Time', 'Wasted Time'],
          datasets: [{
            data: [totalWatchedSec, wastedSec],
            backgroundColor: ['#4CAF50', '#E74C3C'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: colors.text }
            }
          }
        }
      });
    }

    /* ================== UPDATE CHART COLORS ================== */
    function updateChartColors() {
      const colors = getChartColors();
      [historyChart, pieChart].forEach(chart => {
        if (!chart) return;
        if (chart.options.scales) {
          Object.values(chart.options.scales).forEach(axis => {
            axis.title.color = colors.text;
            axis.ticks.color = colors.text;
            axis.grid.color = colors.grid;
          });
        }
        if (chart.options.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color = colors.text;
        }
        chart.update();
      });
    }
  };

  /* ================== DATA SOURCE ================== */
  if (DEMO_MODE) {
    loadData(generateDemoData());
  } else {
    chrome.storage.local.get(
      ['videosWatched', 'totalWatchedTime', 'avgPercentWatched', 'videoHistory'],
      loadData
    );
  }
});
