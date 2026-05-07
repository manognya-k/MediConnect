import {
  Chart,
  LineController, BarController, DoughnutController,
  LineElement, BarElement, ArcElement,
  PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  registerables
} from 'chart.js';

let registered = false;

export function ensureChartRegistered(): void {
  if (registered) return;
  registered = true;
  Chart.register(
    LineController, BarController, DoughnutController,
    LineElement, BarElement, ArcElement,
    PointElement, CategoryScale, LinearScale,
    Tooltip, Legend, Filler,
    ...registerables
  );
  Chart.defaults.color           = '#94A3B8';
  Chart.defaults.font.family     = "'DM Sans'";
  Chart.defaults.font.size       = 10;
  Chart.defaults.borderColor     = 'rgba(255,255,255,.05)';
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.padding  = 12;
}
