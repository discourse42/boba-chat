module.exports = {
  apps: [
    {
      name: 'boba-chat-server',
      script: 'npx',
      args: 'tsx server/index.ts',
      cwd: './',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      watch: ['server'],
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'data', 'logs', '.git'],
      error_file: './logs/pm2-server-error.log',
      out_file: './logs/pm2-server-out.log',
      log_file: './logs/pm2-server-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'boba-chat-client',
      script: 'npm',
      args: 'run dev:client',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      },
      watch: false, // Vite has its own HMR
      error_file: './logs/pm2-client-error.log',
      out_file: './logs/pm2-client-out.log',
      log_file: './logs/pm2-client-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};