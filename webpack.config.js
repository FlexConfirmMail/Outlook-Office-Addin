/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const urlDev = "https://127.0.0.1:10041/";
const urlProd = "https://127.0.0.1:10041/"; // CHANGE THIS TO YOUR PRODUCTION DEPLOYMENT LOCATION

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      app: ["./src/web/app.js"],
      confirm: ["./src/web/confirm.js"],
      "count-down": ["./src/web/count-down.js"],
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".html", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
        {
          test: /\.(png|jpg|jpeg|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "app.html",
        template: "./src/web/app.html",
        chunks: ["app"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "src/web/*.css",
            to: "[name][ext][query]",
          },
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "locales/*",
            to: "locales/[name][ext][query]",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content.toString().replace(new RegExp(urlDev, "g"), urlProd);
              }
            },
          },
          {
            from: "node_modules/@microsoft/office-js/dist",
            to: "lib/office-js",
          },
          {
            from: "node_modules/@microsoft/office-js/LICENSE.md",
            to: "lib/office-js/LICENSE.md",
          },
          {
            from: "node_modules/jquery/dist/jquery.min.js",
            to: "lib/jquery/jquery.min.js",
          },
          {
            from: "node_modules/jquery/LICENSE.txt",
            to: "lib/jquery/LICENSE.txt",
          },
          {
            from: "node_modules/@fluentui/web-components/dist/web-components.min.js",
            to: "lib/fluentui/web-components/web-components.min.js",
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "confirm.html",
        template: "./src/web/confirm.html",
        chunks: ["confirm"],
      }),
      new HtmlWebpackPlugin({
        filename: "count-down.html",
        template: "./src/web/count-down.html",
        chunks: ["count-down"],
      }),
      new HtmlWebpackPlugin({
        filename: "setting.html",
        template: "./src/web/setting.html",
        chunks: ["polyfill", "setting"],
      }),
    ],
    devServer: {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 10041,
    },
    optimization:{
      minimize: false
    },
  };

  return config;
};
