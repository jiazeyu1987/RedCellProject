const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 设置代理配置: /api -> http://localhost:3000/v1');
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/v1'
      },
      onError: function(err, req, res) {
        console.error('❌ 代理错误:', err.message);
        console.error('请求路径:', req.path);
      },
      onProxyReq: function(proxyReq, req, res) {
        console.log('📤 代理请求:', req.method, req.path, '->', proxyReq.path);
      },
      onProxyRes: function(proxyRes, req, res) {
        console.log('📥 代理响应:', proxyRes.statusCode, req.path);
      },
      logLevel: 'debug'
    })
  );
  
  console.log('✅ 代理配置完成');
};