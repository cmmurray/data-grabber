const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/integuru/renderer/minimal.jsx', // Use the minimal version
  output: {
    path: path.resolve(__dirname, 'src/integuru/renderer'),
    filename: 'app.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};