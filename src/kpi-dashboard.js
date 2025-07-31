#!/usr/bin/env node

// KPI Dashboard Generator - Creates standardized measurement visualizations

const fs = require('fs');
const path = require('path');

class KPIDashboard {
  constructor() {
    this.dashboardTemplate = this.createDashboardTemplate();
  }

  // Create HTML dashboard template
  createDashboardTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claudette KPI Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #2d3748;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .kpi-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 1.5rem; 
            margin: 2rem 0;
        }
        .kpi-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #4299e1;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .kpi-title { font-size: 0.9rem; color: #718096; margin-bottom: 0.5rem; }
        .kpi-value { font-size: 2rem; font-weight: bold; color: #2d3748; }
        .kpi-trend { font-size: 0.8rem; margin-top: 0.5rem; }
        .trend-up { color: #38a169; }
        .trend-down { color: #e53e3e; }
        .trend-neutral { color: #718096; }
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .model-comparison {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }
        .model-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .model-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .model-name {
            font-size: 1.5rem;
            font-weight: bold;
            margin-left: 0.5rem;
        }
        .model-status {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .status-excellent { background: #c6f6d5; color: #22543d; }
        .status-good { background: #bee3f8; color: #2a4365; }
        .status-acceptable { background: #faf089; color: #744210; }
        .status-poor { background: #fed7d7; color: #742a2a; }
        .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .metric-row:last-child { border-bottom: none; }
        .recommendations {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .recommendation {
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .rec-high { border-left-color: #e53e3e; background: #fed7d7; }
        .rec-medium { border-left-color: #d69e2e; background: #faf089; }
        .rec-low { border-left-color: #38a169; background: #c6f6d5; }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #718096;
            border-top: 1px solid #e2e8f0;
        }
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .kpi-grid { grid-template-columns: 1fr; }
            .model-comparison { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Claudette KPI Dashboard</h1>
        <p>Comprehensive AI Model Performance & Development Savings Analysis</p>
        <p style="opacity: 0.8; margin-top: 0.5rem;">Generated: {{TIMESTAMP}}</p>
    </div>

    <div class="container">
        <!-- Executive Summary KPIs -->
        <div class="kpi-grid">
            {{EXECUTIVE_KPIS}}
        </div>

        <!-- Quality Comparison Chart -->
        <div class="chart-container">
            <h2 style="margin-bottom: 1rem;">📊 Model Quality Comparison</h2>
            <canvas id="qualityChart" width="400" height="200"></canvas>
        </div>

        <!-- Cost vs Performance Chart -->
        <div class="chart-container">
            <h2 style="margin-bottom: 1rem;">💰 Cost vs Performance Analysis</h2>
            <canvas id="costPerformanceChart" width="400" height="200"></canvas>
        </div>

        <!-- Model Detailed Comparison -->
        <div class="model-comparison">
            {{MODEL_CARDS}}
        </div>

        <!-- Development Savings Analysis -->
        <div class="chart-container">
            <h2 style="margin-bottom: 1rem;">📈 Development Savings & ROI</h2>
            <canvas id="savingsChart" width="400" height="200"></canvas>
        </div>

        <!-- Recommendations -->
        <div class="recommendations">
            <h2 style="margin-bottom: 1rem;">💡 Actionable Recommendations</h2>
            {{RECOMMENDATIONS}}
        </div>
    </div>

    <div class="footer">
        <p>Generated by Claudette KPI Assessment Framework v1.0</p>
        <p>🤖 Intelligent AI Backend Routing & Cost Optimization</p>
    </div>

    <script>
        // Quality Comparison Chart
        const qualityCtx = document.getElementById('qualityChart').getContext('2d');
        new Chart(qualityCtx, {
            type: 'radar',
            data: {{QUALITY_CHART_DATA}},
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20 }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Cost vs Performance Chart
        const costPerfCtx = document.getElementById('costPerformanceChart').getContext('2d');
        new Chart(costPerfCtx, {
            type: 'scatter',
            data: {{COST_PERFORMANCE_CHART_DATA}},
            options: {
                responsive: true,
                scales: {
                    x: { 
                        title: { display: true, text: 'Cost per Task (EUR)' },
                        type: 'logarithmic'
                    },
                    y: { 
                        title: { display: true, text: 'Quality Score (%)' },
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Development Savings Chart
        const savingsCtx = document.getElementById('savingsChart').getContext('2d');
        new Chart(savingsCtx, {
            type: 'bar',
            data: {{SAVINGS_CHART_DATA}},
            options: {
                responsive: true,
                scales: {
                    y: { 
                        title: { display: true, text: 'Savings (%)' },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  // Generate executive summary KPIs HTML
  generateExecutiveKPIs(report) {
    const { executiveSummary } = report;
    
    const kpis = [
      {
        title: 'Best Overall Model',
        value: executiveSummary.bestOverallModel?.name?.toUpperCase() || 'N/A',
        trend: `${executiveSummary.bestOverallModel?.score?.toFixed(1) || 0}% Quality`,
        trendClass: 'trend-up'
      },
      {
        title: 'Average Quality Score',
        value: `${executiveSummary.avgQualityScore?.toFixed(1) || 0}%`,
        trend: 'Across all models',
        trendClass: 'trend-neutral'
      },
      {
        title: 'Total Cost Savings',
        value: `€${executiveSummary.totalCostSavings?.toFixed(4) || 0}`,
        trend: 'vs Direct API usage',
        trendClass: 'trend-up'
      },
      {
        title: 'Quality Improvement',
        value: `+${executiveSummary.avgQualityImprovement?.toFixed(1) || 0}%`,
        trend: 'Through optimization',
        trendClass: 'trend-up'
      },
      {
        title: 'Most Cost Effective',
        value: executiveSummary.mostCostEffectiveModel?.name?.toUpperCase() || 'N/A',
        trend: `€${executiveSummary.mostCostEffectiveModel?.cost?.toFixed(6) || 0} per test`,
        trendClass: 'trend-up'
      },
      {
        title: 'Fastest Response',
        value: executiveSummary.fastestModel?.name?.toUpperCase() || 'N/A',
        trend: `${executiveSummary.fastestModel?.latency || 0}ms average`,
        trendClass: 'trend-up'
      }
    ];

    return kpis.map(kpi => `
      <div class="kpi-card">
        <div class="kpi-title">${kpi.title}</div>
        <div class="kpi-value">${kpi.value}</div>
        <div class="kpi-trend ${kpi.trendClass}">${kpi.trend}</div>
      </div>
    `).join('');
  }

  // Generate model comparison cards
  generateModelCards(report) {
    const { kpiMetrics } = report;
    
    return Object.entries(kpiMetrics).map(([modelName, metrics]) => `
      <div class="model-card">
        <div class="model-header">
          <div class="model-name">${modelName.toUpperCase()}</div>
          <div class="model-status status-${metrics.qualityRating.toLowerCase()}">${metrics.qualityRating}</div>
        </div>
        <div class="metric-row">
          <span>Quality Score</span>
          <strong>${metrics.qualityScore.toFixed(1)}%</strong>
        </div>
        <div class="metric-row">
          <span>Success Rate</span>
          <strong>${metrics.successRate.toFixed(1)}%</strong>
        </div>
        <div class="metric-row">
          <span>Avg Response Time</span>
          <strong>${metrics.avgResponseTime}ms</strong>
        </div>
        <div class="metric-row">
          <span>Cost per Task</span>
          <strong>€${metrics.costPerTask.toFixed(6)}</strong>
        </div>
        <div class="metric-row">
          <span>Time to Value</span>
          <strong>${metrics.timeToValue.toFixed(1)}s</strong>
        </div>
        <div class="metric-row">
          <span>Cost Savings</span>
          <strong>${metrics.costSavingsPercent.toFixed(1)}%</strong>
        </div>
        <div class="metric-row">
          <span>Quality Improvement</span>
          <strong>+${metrics.qualityImprovement.toFixed(1)}%</strong>
        </div>
      </div>
    `).join('');
  }

  // Generate recommendations HTML
  generateRecommendations(report) {
    const { recommendations } = report;
    
    return recommendations.map(rec => `
      <div class="recommendation rec-${rec.priority}">
        <strong>[${rec.priority.toUpperCase()}]</strong> ${rec.recommendation}
      </div>
    `).join('');
  }

  // Generate chart data
  generateChartData(report) {
    const { kpiMetrics } = report;
    const models = Object.keys(kpiMetrics);
    
    // Quality radar chart data
    const qualityData = {
      labels: ['Quality Score', 'Success Rate', 'Response Time Rating', 'Cost Efficiency', 'Time to Value'],
      datasets: models.map((model, index) => {
        const metrics = kpiMetrics[model];
        const colors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0'][index % 5];
        
        return {
          label: model.toUpperCase(),
          data: [
            metrics.qualityScore,
            metrics.successRate,
            metrics.responseTimeRating === 'Excellent' ? 100 : 
            metrics.responseTimeRating === 'Good' ? 75 :
            metrics.responseTimeRating === 'Acceptable' ? 50 : 25,
            metrics.costEfficiencyRating === 'Excellent' ? 100 :
            metrics.costEfficiencyRating === 'Good' ? 75 :
            metrics.costEfficiencyRating === 'Acceptable' ? 50 : 25,
            Math.min(100, (10 - metrics.timeToValue) * 10) // Invert time to value
          ],
          backgroundColor: colors + '20',
          borderColor: colors,
          borderWidth: 2
        };
      })
    };

    // Cost vs Performance scatter plot
    const costPerformanceData = {
      datasets: models.map((model, index) => {
        const metrics = kpiMetrics[model];
        const colors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0'][index % 5];
        
        return {
          label: model.toUpperCase(),
          data: [{
            x: metrics.costPerTask,
            y: metrics.qualityScore
          }],
          backgroundColor: colors,
          borderColor: colors,
          pointRadius: 8,
          pointHoverRadius: 10
        };
      })
    };

    // Development savings bar chart
    const savingsData = {
      labels: models.map(m => m.toUpperCase()),
      datasets: [
        {
          label: 'Cost Savings %',
          data: models.map(model => kpiMetrics[model].costSavingsPercent),
          backgroundColor: '#36a2eb80',
          borderColor: '#36a2eb',
          borderWidth: 2
        },
        {
          label: 'Quality Improvement %',
          data: models.map(model => kpiMetrics[model].qualityImprovement),
          backgroundColor: '#4bc0c080',
          borderColor: '#4bc0c0',
          borderWidth: 2
        }
      ]
    };

    return {
      qualityData: JSON.stringify(qualityData),
      costPerformanceData: JSON.stringify(costPerformanceData),
      savingsData: JSON.stringify(savingsData)
    };
  }

  // Generate complete dashboard
  generateDashboard(report, outputPath = null) {
    const timestamp = new Date().toISOString();
    const chartData = this.generateChartData(report);
    
    let html = this.dashboardTemplate
      .replace('{{TIMESTAMP}}', timestamp)
      .replace('{{EXECUTIVE_KPIS}}', this.generateExecutiveKPIs(report))
      .replace('{{MODEL_CARDS}}', this.generateModelCards(report))
      .replace('{{RECOMMENDATIONS}}', this.generateRecommendations(report))
      .replace('{{QUALITY_CHART_DATA}}', chartData.qualityData)
      .replace('{{COST_PERFORMANCE_CHART_DATA}}', chartData.costPerformanceData)
      .replace('{{SAVINGS_CHART_DATA}}', chartData.savingsData);

    const dashboardPath = outputPath || path.join(__dirname, `kpi-dashboard-${Date.now()}.html`);
    fs.writeFileSync(dashboardPath, html);
    
    return dashboardPath;
  }
}

// Export for use in other modules
module.exports = { KPIDashboard };