# Claude Code Integration mit Claudette - Vollständige Anleitung

## 📋 **ÜBERBLICK**

Diese Anleitung erklärt, wie Sie die Claudette AI-Integration in Claude Code einrichten, mit vollständigem Multiplexing, Load Balancing und optimierter Performance.

---

## 🛠️ **INSTALLATIONS-SCHRITTE**

### **Schritt 1: Settings-Datei vorbereiten**

1. **Kopiere die Beispiel-Konfiguration:**
   ```bash
   cp example-claude-settings.json ~/.claude/settings.json
   ```

2. **Passe die Pfade an:**
   - Ersetze `[USERNAME]` mit deinem tatsächlichen Benutzernamen
   - Stelle sicher, dass alle Pfade zu deiner Claudette-Installation zeigen

### **Schritt 2: Berechtigungen setzen**

```bash
# Mache die Scripts ausführbar
chmod +x claudette-mcp-multiplexer.js
chmod +x mcp-multiplexer-monitor.js
chmod +x claudette-mcp-server-unified.js

# Teste die Syntax
node --check claudette-mcp-multiplexer.js
```

### **Schritt 3: Hooks einrichten (optional)**

```bash
# Erstelle das Hooks-Verzeichnis
mkdir -p ~/.claude/hooks

# Kopiere Anti-Halluzination Hook (falls vorhanden)
cp hooks/anti_hallucination_prompt.py ~/.claude/hooks/
```

### **Schritt 4: Claude Code neu starten**

```bash
# Starte Claude Code neu, um die neue Konfiguration zu laden
# (oder beende und starte Claude Code über die GUI neu)
```

---

## 📄 **BEISPIEL SETTINGS.JSON**

### **Basis-Konfiguration (Minimal)**
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": [
        "/Users/[USERNAME]/Documents/Python/claudette-dev/claudette/claudette-mcp-multiplexer.js"
      ],
      "description": "Claudette AI mit Multiplexing",
      "capabilities": ["tools", "resources"],
      "timeout": 120000,
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "logging": {
    "level": "info"
  }
}
```

### **Erweiterte Konfiguration (Vollständig)**
```json
{
  "enhancement_verification": {
    "enabled": true,
    "verification_on_startup": true
  },
  
  "mcpServers": {
    "claudette": {
      "command": "node", 
      "args": [
        "/Users/[USERNAME]/Documents/Python/claudette-dev/claudette/claudette-mcp-multiplexer.js"
      ],
      "description": "Claudette AI-System mit intelligentem Multiplexing",
      "capabilities": ["tools", "resources"],
      "timeout": 120000,
      "env": {
        "NODE_ENV": "production",
        "MCP_CONFIG_PATH": "/Users/[USERNAME]/Documents/Python/claudette-dev/claudette/mcp-multiplexer-config.json",
        "CLAUDETTE_LOG_LEVEL": "info"
      }
    }
  },
  
  "logging": {
    "level": "info",
    "enableMcpLogging": true
  },
  
  "performance": {
    "enableMetrics": true,
    "metricsInterval": 30000
  }
}
```

---

## ⚙️ **KONFIGURATION ANPASSEN**

### **Multiplexing-Einstellungen (`mcp-multiplexer-config.json`)**
```json
{
  "multiplexer": {
    "minInstances": 2,        // Minimum Instanzen (immer laufend)
    "maxInstances": 6,        // Maximum Instanzen (Skalierungsgrenze)
    "maxConcurrentRequests": 3, // Anfragen pro Instanz
    "requestTimeout": 90000,   // 90s Anfrage-Timeout
    "healthCheckInterval": 30000, // 30s Gesundheitschecks
    "scaleUpThreshold": 0.8,   // Hochskalierung bei 80% Last
    "scaleDownThreshold": 0.3  // Runterskalierung bei 30% Last
  },
  
  "loadBalancing": {
    "strategy": "least_connections",
    "circuitBreakerEnabled": true,
    "circuitBreakerThreshold": 3
  }
}
```

### **Performance-Tuning**
```json
{
  "// NIEDRIGE LATENZ": {
    "requestTimeout": 45000,
    "maxInstances": 4,
    "healthCheckInterval": 15000
  },
  
  "// HOHE DURCHSATZ": {
    "requestTimeout": 120000, 
    "maxInstances": 8,
    "maxConcurrentRequests": 5
  },
  
  "// RESSOURCEN SPAREN": {
    "minInstances": 1,
    "maxInstances": 3,
    "scaleDownThreshold": 0.1
  }
}
```

---

## 🧪 **TESTEN UND VALIDIERUNG**

### **1. Basis-Funktionstest**
```bash
# Syntax-Check
node --check claudette-mcp-multiplexer.js

# Startup-Test
timeout 10s node claudette-mcp-multiplexer.js
```

### **2. Multiplexing-Test**
```bash
# System-Status prüfen
node mcp-multiplexer-monitor.js status

# Gesundheitscheck
node mcp-multiplexer-monitor.js health

# Load-Balancing Test
node mcp-multiplexer-monitor.js test 10
```

### **3. Integration-Test mit Claude Code**
```bash
# In Claude Code testen:
# Sende eine einfache Anfrage an Claudette
```

### **4. Vollständige Diagnose**
```bash
# Umfassende System-Diagnose
node mcp-multiplexer-monitor.js diagnostics
```

**Erwartete Ausgabe:**
```
Running MCP Multiplexer Diagnostics...

1. File System Check:
✅ Multiplexer script exists
✅ Configuration file exists

2. Configuration Check:
✅ Configuration loaded successfully
   - Min instances: 2
   - Max instances: 6
   - Request timeout: 90000ms

3. Startup Test:
✅ Multiplexer starts successfully

4. Health Check:
✅ System is healthy

5. Load Balancing Test:
✅ Load balancing test completed
   - Success rate: 100.00%
   - Average response time: 847ms
   - Requests per second: 12

Diagnostics complete!
```

---

## 📊 **MONITORING UND WARTUNG**

### **System-Überwachung**
```bash
# Aktuelle System-Metriken
node mcp-multiplexer-monitor.js status

# Logs ansehen (letzte 50 Zeilen)  
node mcp-multiplexer-monitor.js logs 50

# Performance-Report generieren
node mcp-multiplexer-monitor.js report
```

### **Erwartete Performance-Metriken**
```json
{
  "totalInstances": 3,
  "readyInstances": 2, 
  "busyInstances": 1,
  "totalRequests": 127,
  "successRate": 0.984,
  "averageResponseTime": 847
}
```

### **Log-Analyse**
```bash
# Fehler in Logs suchen
grep -i error ~/.claude/logs/mcp-*.log

# Performance-Probleme identifizieren
grep -i "timeout\|slow\|failed" logs/mcp-multiplexer.log
```

---

## 🚨 **FEHLERBEHEBUNG**

### **Problem: MCP Server startet nicht**
```bash
# Diagnose:
node --check claudette-mcp-multiplexer.js
ls -la claudette-mcp-*.js

# Lösung:
chmod +x claudette-mcp-multiplexer.js
# Pfade in settings.json korrigieren
```

### **Problem: Timeout-Fehler**
```bash  
# Diagnose:
node mcp-multiplexer-monitor.js health

# Lösungen:
# 1. Timeout in settings.json erhöhen
# 2. Mehr Instanzen konfigurieren
# 3. Netzwerkverbindung prüfen
```

### **Problem: Multiplexing funktioniert nicht**
```bash
# Vollständige Diagnose:
node mcp-multiplexer-monitor.js diagnostics

# Load-Test:
node mcp-multiplexer-monitor.js test 20

# Konfiguration prüfen:
cat mcp-multiplexer-config.json
```

### **Problem: Hohe CPU-Last**
```bash
# Instanzen reduzieren:
# In mcp-multiplexer-config.json:
{
  "multiplexer": {
    "maxInstances": 3,
    "maxConcurrentRequests": 2
  }
}
```

---

## 🎯 **BEST PRACTICES**

### **1. Ressourcen-Management**
- **Minimum-Instanzen**: 2 für Redundanz
- **Maximum-Instanzen**: Nicht mehr als CPU-Kerne
- **Request-Limit**: 3 pro Instanz für optimale Performance

### **2. Monitoring**
- **Regelmäßige Gesundheitschecks**: Alle 30 Sekunden
- **Performance-Metriken**: Täglich überprüfen
- **Log-Rotation**: Logs regelmäßig archivieren

### **3. Skalierung**
- **Hochskalierung**: Bei 80% Last
- **Runterskalierung**: Bei 30% Last
- **Cooldown-Perioden**: Zu häufige Skalierung vermeiden

### **4. Sicherheit**
- **Berechtigungen**: Nur notwendige Dateiberechtigungen
- **Umgebungsvariablen**: Sichere Speicherung von Credentials
- **Logs**: Sensible Daten nicht loggen

---

## 📈 **PERFORMANCE-OPTIMIERUNG**

### **Für niedrige Latenz:**
```json
{
  "multiplexer": {
    "requestTimeout": 45000,
    "healthCheckInterval": 15000,
    "scaleUpThreshold": 0.6
  }
}
```

### **Für hohen Durchsatz:**
```json
{
  "multiplexer": {
    "maxInstances": 8,
    "maxConcurrentRequests": 5,
    "requestTimeout": 120000
  }
}
```

### **Für Ressourcen-Effizienz:**
```json
{
  "multiplexer": {
    "minInstances": 1,
    "maxInstances": 4,
    "scaleDownThreshold": 0.1
  }
}
```

---

## 🎉 **ERFOLGREICHE INTEGRATION**

Nach erfolgreicher Einrichtung haben Sie:

✅ **Multi-Instanz Claudette** (2-6 parallele Server)  
✅ **Intelligentes Load Balancing** (Least-connections)  
✅ **Automatische Skalierung** (Load-basiert)  
✅ **Fault Tolerance** (Automatic Failover)  
✅ **Performance Monitoring** (Real-time Metriken)  
✅ **Optimierte Timeouts** (Harmonisiert)  

**Ergebnis**: Claudette läuft reibungslos in Claude Code mit 6-18x erhöhter Concurrent-Kapazität und null Blocking-Problemen.