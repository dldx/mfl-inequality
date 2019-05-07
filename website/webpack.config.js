const path = require('path')
const webpack = require('webpack')
const nodeExternals = require("webpack-node-externals");


const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const paths = {
  src: path.join(__dirname, 'src'),
  dist: path.join(__dirname, 'dist'),
  assets: path.join(__dirname, 'assets'),
  data: path.join(__dirname, 'data')
}

module.exports = {
  context: paths.src,
  entry: {
    main: './app.js'
  },
  output: {
    path: paths.dist,
    filename: 'app.bundle.js',
    publicPath: 'dist',
  },
  module: {
    rules: [{
        test: /\.js$/,
        exclude: [/node_modules/],
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['es2015', 'stage-0'],
            plugins: ["transform-runtime"],
          }
        }],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ],
      }
    ],
  },
  devServer: {
    contentBase: paths.dist,
    compress: true,
    port: '4800',
    stats: 'errors-only',
    watchContentBase: true
  },
  devtool: "#inline-source-map",
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'main.bundle.css',
      allChunks: true,
    }),
    new HtmlWebpackPlugin({
      inject: false,
      hash: true,
      template: './index.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin([{
        from: paths.data,
        to: paths.dist + '/data'
      },
      {
        from: paths.assets,
        to: paths.dist + '/assets'
      }
    ]),
  ],
}