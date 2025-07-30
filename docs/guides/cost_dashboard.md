# Claudette Cost Dashboard & Statistics Guide

**Version:** v0.6.0  
**Feature:** Cost Dashboard & Stats  
**Phase:** 7 Implementation  

## Overview

Claudette v0.6 introduces comprehensive cost analysis and visualization capabilities through interactive dashboards and detailed statistics. Track your AI usage costs, identify optimization opportunities, and gain insights into your development patterns.

## Features

### ✅ **Cost Statistics CLI**
- Detailed cost breakdowns by backend, time period, and files
- Token usage analysis and cost estimates  
- Filter by backend, date range, or file patterns
- Cache hit rate and efficiency metrics

### ✅ **Terminal Dashboard**
- Rich terminal interface with real-time cost monitoring
- Interactive cost trends and usage analytics
- Top files analysis by cost and usage
- Live monitoring mode with auto-refresh

### ✅ **Web Dashboard** 
- Browser-based interactive charts and visualizations
- Plotly-powered cost trend graphs
- Backend usage pie charts and detailed breakdowns
- Export capabilities for reports and analysis

### ✅ **Data Aggregation**
- Intelligent cost estimation based on 2025 AI pricing
- Cross-backend cost comparison and analysis
- Historical trend analysis with projections
- Compression effectiveness and cache efficiency metrics

## Quick Start

### 1. View Cost Statistics

```bash
# Show overall cost statistics
claudette stats

# Filter by backend
claudette stats --backend claude
claudette stats --backend openai

# Filter by time period
claudette stats --period today
claudette stats --period week
claudette stats --period month
claudette stats --period 7d      # Last 7 days

# Show top files by usage
claudette stats --files 10

# Show cache information
claudette stats --info
```

### 2. Terminal Dashboard

```bash
# Basic dashboard overview
claudette dashboard

# Explicit terminal dashboard
claudette dashboard terminal

# Show cost trends
claudette dashboard terminal --trends --days 14

# Show file usage
claudette dashboard terminal --files --limit 20

# Live monitoring (refreshes every 30 seconds)
claudette dashboard terminal --live --refresh 30
```

### 3. Web Dashboard

```bash
# Start web dashboard (opens http://127.0.0.1:8080)
claudette dashboard web

# Custom host and port
claudette dashboard web --host 0.0.0.0 --port 3000

# Debug mode for development
claudette dashboard web --debug
```

## Cost Analysis Features

### Backend Cost Comparison

```bash
claudette stats --period month
```

**Example Output:**
```
Date         Backend  Tokens   Cost     Requests  Commands            
------------------------------------------------------------ 
2025-07-21   claude   1,250    $0.0188  5         edit,commit        
2025-07-21   openai   800      $0.0012  3         edit,new           
2025-07-20   claude   2,100    $0.0315  7         edit,commit,new    
2025-07-20   ollama   500      $0.0000  2         edit               
------------------------------------------------------------
TOTALS       ALL      4,650    $0.0515  17        

Summary:
  Total requests: 17
  Total tokens: 4,650
  Estimated cost: $0.0515

By Backend:
  claude: 12 requests, 3,350 tokens (72.0%), $0.0503 (97.7%)
  openai: 3 requests, 800 tokens (17.2%), $0.0012 (2.3%)  
  ollama: 2 requests, 500 tokens (10.8%), $0.0000 (0.0%)
```

### File Usage Analysis

```bash
claudette stats --files 5
```

**Example Output:**
```
Top Files by Usage:
Files                                    Uses   Tokens   Last Used   
---------------------------------------------------------------------- 
["main.py"]                             8      2,400    2025-07-21    
["src/components/auth.jsx"]             6      1,800    2025-07-21    
["backend/models/user.py"]              4      1,200    2025-07-20    
["config/settings.yaml"]                3      600      2025-07-20    
["tests/test_integration.py"]           2      450      2025-07-19
```

### Cost Trends and Projections

```bash
claudette dashboard terminal --trends --days 30
```

Shows daily cost trends with visual bars and projections for:
- Daily average spending
- Weekly projection
- Monthly projection
- Cost trend direction (increasing/decreasing/stable)

## Web Dashboard Features

### Interactive Charts

The web dashboard at `http://127.0.0.1:8080` provides:

1. **Cost Summary Cards**
   - Total requests processed
   - Total tokens consumed  
   - Estimated total cost
   - Cache hit rate percentage

2. **Backend Usage Pie Chart**
   - Visual breakdown of costs by backend
   - Hover for detailed cost information
   - Interactive legend filtering

3. **Daily Cost Trends Line Chart**
   - 30-day cost history
   - Interactive data point exploration
   - Trend line visualization

### Export and Integration

The web dashboard data can be accessed via API endpoints:

```bash
# Get statistics JSON
curl http://127.0.0.1:8080/api/stats

# Get trend data
curl http://127.0.0.1:8080/api/trends/30

# Get chart data
curl http://127.0.0.1:8080/api/charts
```

## Cost Optimization Insights

### 1. Backend Selection Optimization

Monitor backend usage to optimize costs:

```bash
claudette stats --period week
```

**Optimization Tips:**
- Use Ollama for development/testing (free local inference)
- Use OpenAI GPT-3.5 for simple tasks (lower cost)
- Reserve Claude for complex reasoning (higher quality, higher cost)
- Enable fallback routing for automatic cost optimization

### 2. Cache Efficiency Analysis

```bash
claudette stats --info
```

**Metrics to Monitor:**
- **Cache hit rate**: Higher is better (reduces API costs)
- **Compression effectiveness**: Better compression = lower token costs
- **Repeated operations**: Identify patterns for optimization

### 3. File-Specific Cost Analysis

```bash
claudette stats --files 20 --period month
```

**Optimization Opportunities:**
- Files with high token usage may need compression
- Frequently edited files benefit from better caching
- Large context files should be optimized or split

## Configuration

### Dashboard Dependencies

Install visualization dependencies:

```bash
# For terminal dashboard
pip install rich>=13.0.0

# For web dashboard
pip install flask>=2.3.0 plotly>=5.17.0 pandas>=2.0.0

# Or install all at once
pip install claudette[dashboard]
```

### Cache Settings

Configure caching for better cost tracking in `config.yaml`:

```yaml
# Cost tracking and analysis
cache_dir: ~/.claudette/cache
history_enabled: true

# Dashboard settings
dashboard:
  default_period: "week"
  max_file_display: 20
  refresh_interval: 30
```

## Advanced Usage

### Custom Cost Analysis Scripts

Use the dashboard utilities for custom analysis:

```python
from core.cost_tracking.dashboard_utils import CostDataAggregator
from claudette.cache import get_cache_manager

# Initialize aggregator
cache_manager = get_cache_manager()
aggregator = CostDataAggregator(cache_manager)

# Generate comprehensive report
report = aggregator.generate_cost_report(days_back=30)

# Export to JSON
from core.cost_tracking.dashboard_utils import CostExporter
exporter = CostExporter(aggregator)
exporter.export_report("./reports", days_back=30, format="json")
```

### Integration with CI/CD

Monitor costs in CI/CD pipelines:

```bash
# Check if costs exceed budget
claudette stats --period today --info | grep "Estimated cost" | \
  awk '{print $3}' | sed 's/[$]//g' | \
  awk '{if($1 > 0.10) exit 1; else exit 0}'
```

## Troubleshooting

### Common Issues

**1. No cost data displayed**
- Ensure cache is enabled in `config.yaml`
- Run some claudette commands to generate data
- Check database path: `claudette stats --info`

**2. Web dashboard not loading**
- Verify dependencies: `pip install flask plotly pandas`
- Check port availability: `lsof -i :8080`
- Try different port: `claudette dashboard web --port 3000`

**3. Terminal dashboard display issues**
- Install rich: `pip install rich>=13.0.0`
- Check terminal compatibility
- Use basic mode if needed

### Performance Considerations

- Large databases (>10MB) may slow queries - use period filters
- Web dashboard generates charts on-demand - may be slow for large datasets
- Live monitoring consumes resources - adjust refresh interval appropriately

## Cost Rate Accuracy

Claudette uses 2025 accurate pricing for cost estimation:

| Backend | Model | Rate (per 1K tokens) |
|---------|-------|---------------------|
| Claude  | Sonnet | $0.015 (average) |
| Claude  | Haiku  | $0.005 |
| Claude  | Opus   | $0.045 |
| OpenAI  | GPT-4  | $0.030 |
| OpenAI  | GPT-4-Turbo | $0.010 |
| OpenAI  | GPT-3.5-Turbo | $0.0015 |
| Mistral | 7B Average | $0.0007 |
| Ollama  | Local | $0.000 |

**Note:** Costs are estimates based on token usage. Actual costs may vary based on your specific API pricing, model selection, and usage patterns.

## Best Practices

1. **Regular Monitoring**: Check costs weekly with `claudette stats --period week`
2. **Budget Alerts**: Set up scripts to monitor daily spending
3. **Cache Optimization**: Maintain >70% cache hit rate for efficiency
4. **Backend Strategy**: Use appropriate backend for task complexity
5. **File Organization**: Keep context files optimized to reduce token usage
6. **Historical Analysis**: Use trends to predict and budget future usage

---

**Next Steps:**
- Explore live monitoring for active development sessions
- Set up cost budgets and alerts
- Integrate with team reporting workflows
- Use insights to optimize your AI development workflow

For more information, see:
- [Cache Usage Guide](cache_usage.md)
- [Backend Configuration](../configuration.md)
- [Claudette Documentation](../README.md)