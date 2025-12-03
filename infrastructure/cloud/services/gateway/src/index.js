const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');

const app = express();
// CHANGED: Default to port 80 to match Terraform infrastructure placeholder
const PORT = process.env.PORT || 80;
const SHARED_SECRET = process.env.GATEWAY_SECRET;

// Add request ID
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${req.id}] Request received: ${req.method} ${req.originalUrl} from ${req.ip} | CLOUD_MAP_NAMESPACE: ${process.env.CLOUD_MAP_NAMESPACE}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log(`[${req.id}] Health check from ${req.ip}`);
  res.status(200).send('OK');
});

// Auth Middleware
app.use((req, res, next) => {
  console.log(`[${req.id}] Authentication attempt from ${req.ip}`);
  const authHeader = req.headers['x-openhive-gateway-secret'];
  
  if (!SHARED_SECRET) {
    console.error(`[${req.id}] GATEWAY_SECRET environment variable is not set`);
    return res.status(500).send('Gateway misconfigured');
  }

  if (authHeader !== SHARED_SECRET) {
    console.warn(`[${req.id}] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).send('Unauthorized');
  }

  console.log(`[${req.id}] Authentication successful`);
  next();
});

    // Dynamic Proxy Logic
    // Route format: /:agentName/api/...
    app.use('/:agentName', (req, res, next) => {
      const agentName = req.params.agentName;
      const namespace = process.env.CLOUD_MAP_NAMESPACE || 'openhive.local';
      
      // Target internal Cloud Map DNS
      // Agents are at http://[agentName].[namespace]:PORT
      // Port is determined by the x-openhive-agent-port header (default 4000)
      const agentPort = req.headers['x-openhive-agent-port'] || 4000;
      const target = `http://${agentName}.${namespace}:${agentPort}`;

      console.log(`[${req.id}] Proxying request for agent ${agentName} to ${target}${req.url}`);

      createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: {
          [`^/${agentName}`]: '', // Remove agent name from path when forwarding
        },
        // Increase buffer size for larger requests if needed
        // ws: true, // Enable WebSocket support if needed
        onProxyReq: (proxyReq, req, res) => {
          // Optional: Add headers if needed by agents
          proxyReq.setHeader('X-Forwarded-For', req.ip);
          proxyReq.setHeader('X-Request-ID', req.id);
          
          // IMPORTANT: Ensure we copy the accept header if present, 
          // although http-proxy-middleware should do this by default.
          if (req.headers.accept) {
             proxyReq.setHeader('Accept', req.headers.accept);
          }
        },
        onProxyRes: (proxyRes, req, res) => {
           // If the agent returns text/event-stream, we must ensure 
           // the gateway doesn't buffer it or compress it in a way that breaks SSE.
           const contentType = proxyRes.headers['content-type'];
           if (contentType && contentType.includes('text/event-stream')) {
             proxyRes.headers['cache-control'] = 'no-cache, no-transform';
             proxyRes.headers['connection'] = 'keep-alive';
             proxyRes.headers['x-accel-buffering'] = 'no';
             
             // Remove compression for SSE to avoid buffering
             delete proxyRes.headers['content-encoding'];
           }

           console.log(`[${req.id}] Received response from agent ${agentName}: ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
          console.error(`[${req.id}] Gateway error for ${agentName}:`, err.message);
          res.status(502).send('Bad Gateway: Could not reach agent');
        }
      })(req, res, next);
    });

const server = app.listen(PORT, () => {
  console.log(`OpenHive Gateway Service running on port ${PORT}`);
});

// Support long-running connections for SSE and large uploads (1 hour timeout)
const TIMEOUT_MS = 60 * 60 * 1000;
server.keepAliveTimeout = TIMEOUT_MS;
server.headersTimeout = TIMEOUT_MS + 5000; // Must be greater than keepAliveTimeout
server.requestTimeout = TIMEOUT_MS;
