# Environment Setup Guide
*Complete guide for configuring Claudette environment variables*

**Version**: 3.0.1  
**Last Updated**: 2025-09-16  
**Status**: Stable

---

## 🚀 Quick Start

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials**:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Test connections**:
   ```bash
   node comprehensive-connection-test.js
   ```

---

## 🔑 Required Credentials

### LLM Backend APIs

#### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- **Required**: Yes (primary LLM backend)
- **Get from**: https://platform.openai.com/api-keys
- **Format**: Starts with `sk-`
- **Usage**: GPT models, embeddings, completions

#### Alternative Backend Configuration
```bash
ALTERNATIVE_API_URL=https://your-custom-backend.com
ALTERNATIVE_MODEL=your-model-name
ALTERNATIVE_API_KEY=your_api_key_here
```
- **Required**: No (alternative backend)
- **Purpose**: Custom models and specialized inference
- **Models**: Various models with specialized capabilities

### Graph Database Configuration

#### Ultipa GraphDB Cloud
```bash
ULTIPA_ENDPOINT=your-instance.eu-south-1.cloud.ultipa.com:8443
ULTIPA_ACCESS_TOKEN=your_access_token_here
ULTIPA_USERNAME=your_username
ULTIPA_PASSWORD=your_password
```
- **Required**: For graph-based AI reasoning
- **Get from**: Ultipa cloud console
- **Purpose**: Meta-cognitive reasoning, knowledge graphs, RAG enhancement

---

## 📋 Environment Variables Reference

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| `DEBUG` | No | `claudette:*` | Debug logging pattern |

### LLM Backends

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** | OpenAI API authentication |
| `ALTERNATIVE_API_URL` | No | Alternative backend endpoint |
| `ALTERNATIVE_MODEL` | No | Alternative model name |
| `ALTERNATIVE_API_KEY` | No | Alternative authentication |

### Graph Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ULTIPA_ENDPOINT` | **Yes** | - | GraphDB server endpoint |
| `ULTIPA_ACCESS_TOKEN` | **Yes** | - | API access token |
| `ULTIPA_USERNAME` | **Yes** | - | Database username |
| `ULTIPA_PASSWORD` | **Yes** | - | Database password |
| `ULTIPA_DATABASE` | No | `default` | Database name |
| `ULTIPA_GRAPH` | No | `claudette_graph` | Graph name |

### Performance Tuning

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDETTE_CACHE_TTL` | No | `3600` | Cache TTL in seconds |
| `CLAUDETTE_MAX_RETRIES` | No | `3` | Maximum retry attempts |
| `CLAUDETTE_TIMEOUT` | No | `30000` | Request timeout (ms) |

---

## 🔒 Security Best Practices

### API Key Management
- **Never commit** `.env` files to version control
- **Rotate keys** regularly (monthly recommended)
- **Use different keys** for different environments
- **Set up billing alerts** for usage monitoring

### Database Security
- **Use strong passwords** (minimum 12 characters)
- **Enable 2FA** where available
- **Monitor access logs** regularly
- **Use read-only credentials** when possible

### Environment Separation
```bash
# Development
.env.development

# Staging  
.env.staging

# Production
.env.production
```

---

## 🏗️ Setup Instructions

### 1. Local Development Setup

```bash
# Clone repository
git clone <your-repo>
cd claudette

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Test connections
node comprehensive-connection-test.js
```

### 2. Production Deployment

```bash
# Create production environment file
cp .env.example .env.production

# Set production-specific values
export NODE_ENV=production
export DEBUG=claudette:error

# Deploy with environment
docker run -d --env-file .env.production claudette:latest
```

### 3. CI/CD Pipeline Setup

```yaml
# GitHub Actions example
- name: Setup Environment
  run: |
    echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> .env
    echo "ULTIPA_ENDPOINT=${{ secrets.ULTIPA_ENDPOINT }}" >> .env
    echo "ULTIPA_ACCESS_TOKEN=${{ secrets.ULTIPA_ACCESS_TOKEN }}" >> .env
```

---

## 🧪 Testing Your Setup

### Connection Test
```bash
# Test all connections
node comprehensive-connection-test.js

# Test specific backend
node test-openai-connection.js
node test-ultipa-connection.js
```

### Expected Results
- **OpenAI**: ✅ Connected (X models available)
- **Flexcon**: ✅ Connected (model_name)
- **Ultipa**: ✅ Connected (endpoint + auth method)

### Troubleshooting Common Issues

#### OpenAI Connection Failed
```
❌ OpenAI - Connection: Invalid API key format
```
**Solution**: Verify API key starts with `sk-` and is complete

#### Alternative Backend Timeout
```
❌ Alternative Backend - Connection: Request timeout
```
**Solution**: Check network connectivity and API URL

#### Ultipa Authentication Failed  
```
❌ Ultipa - Connection: 403 Forbidden
```
**Solutions**:
1. Verify access token hasn't expired
2. Check username/password credentials
3. Confirm endpoint URL format
4. Test with basic auth: `username:password`

---

## 📈 Performance Optimization

### Cache Configuration
```bash
# Aggressive caching for production
CLAUDETTE_CACHE_TTL=7200

# Conservative caching for development  
CLAUDETTE_CACHE_TTL=300
```

### Timeout Tuning
```bash
# Fast networks
CLAUDETTE_TIMEOUT=15000

# Slow networks
CLAUDETTE_TIMEOUT=60000
```

### Retry Strategy
```bash
# Stable connections
CLAUDETTE_MAX_RETRIES=2

# Unstable connections
CLAUDETTE_MAX_RETRIES=5
```

---

## 🔄 Environment Migration

### From Development to Production

1. **Copy base configuration**:
   ```bash
   cp .env.development .env.production
   ```

2. **Update production-specific values**:
   ```bash
   sed -i 's/development/production/g' .env.production
   ```

3. **Validate configuration**:
   ```bash
   NODE_ENV=production node comprehensive-connection-test.js
   ```

### Credential Rotation

1. **Generate new credentials** in respective platforms
2. **Update `.env` files** with new values
3. **Test connections** before deploying
4. **Revoke old credentials** after successful deployment

---

## 📊 Monitoring & Logging

### Environment Variable Logging
```javascript
// Log environment status (without exposing secrets)
console.log('Environment Status:', {
  nodeEnv: process.env.NODE_ENV,
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  hasFlexcon: !!process.env.FLEXCON_API_KEY,
  hasUltipa: !!process.env.ULTIPA_ACCESS_TOKEN,
  cacheSettings: {
    ttl: process.env.CLAUDETTE_CACHE_TTL,
    timeout: process.env.CLAUDETTE_TIMEOUT
  }
});
```

### Health Check Endpoint
```javascript
// Health check with environment validation
app.get('/health', (req, res) => {
  const status = {
    environment: process.env.NODE_ENV,
    backends: {
      openai: !!process.env.OPENAI_API_KEY,
      flexcon: !!process.env.FLEXCON_API_KEY,
      ultipa: !!process.env.ULTIPA_ACCESS_TOKEN
    }
  };
  res.json(status);
});
```

---

## 📞 Support & Troubleshooting

### Common Issues
1. **Missing credentials**: Check `.env` file exists and is readable
2. **Invalid format**: Verify API keys match expected patterns
3. **Network issues**: Test basic connectivity to endpoints
4. **Permission errors**: Ensure proper file permissions on `.env`

### Getting Help
- **Check logs**: `DEBUG=claudette:* node your-app.js`
- **Test connections**: Use provided test scripts
- **Validate format**: Compare against `.env.example`
- **Review documentation**: This guide and API docs

---

*Complete environment setup guide for Claudette v3.0.1*