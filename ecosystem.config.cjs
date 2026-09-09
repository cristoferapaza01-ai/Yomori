module.exports = {
  apps: [
    {
      name: 'keiyoushi-repo',
      cwd: './keiyoushi-repo-server',
      script: 'src/server.js',
      env: {
        PORT: 5000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'tachiyomi-backend',
      cwd: './backend',
      script: 'src/server.js',
      env: {
        PORT: 4000,
        REPO_SERVER_URL: 'http://127.0.0.1:5000',
        NODE_ENV: 'production'
      }
    }
  ]
};
