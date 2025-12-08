module.exports = {
  apps : [{
    name: "translate-app",
    script: "server.js",
    env: {
      NODE_ENV: "production",
      // OPENROUTER_API_KEY: "YOUR_API_KEY_HERE" // 建议：在此处填入，或在服务器系统中配置环境变量
    },
    env_production: {
      NODE_ENV: "production"
    }
  }]
}
