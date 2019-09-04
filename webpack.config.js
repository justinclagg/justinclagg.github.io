const webpack = require('webpack');
const path = require('path');
const ejsBuilder = require('ejs-webpack-builder');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const SRC_DIR = path.resolve(__dirname, './src');

module.exports = {
	entry: path.resolve(__dirname, './src/js/index.js'),
	output: {
		path: path.resolve(__dirname),
		filename: './js/app.js',
		publicPath: '/'
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: './css/[name].css',
			chunkFilename: '[id].css',
			ignoreOrder: false
		}),
		new ejsBuilder({
			root: path.resolve(__dirname, './src/templates/'),
			files: [
				// {
				// 	source: {
				// 		name: 'index.ejs',
				// 	},
				// 	parameters: { filename: 'index.ejs', title: 'Portfolio', js: null }
				// },
				// {
				// 	source: {
				// 		name: 'about.ejs',
				// 	},
				// 	parameters: { filename: 'about.ejs', title: 'About', js: './js/app.js' }
				// },
				{
					source: {
						name: 'index.ejs',
					},
					parameters: { filename: 'index.ejs', title: 'About', js: './js/app.js' }
				},
				{
					source: {
						name: 'contact.ejs',
					},
					parameters: { filename: 'contact.ejs', title: 'Contact', js: './js/app.js' }
				},
				{
					source: {
						name: 'construction.ejs',
					},
					parameters: { filename: 'construction.ejs', title: 'Under Construction', js: null }
				}
			]
		})
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				include: path.resolve(SRC_DIR),
				exclude: /node_modules/,
				loader: 'babel-loader'
			},
			{
				test: /\.s?css$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							publicPath: path.resolve(SRC_DIR, 'css')
						}
					},
					'css-loader',
					'sass-loader'
				]
			},
			{
				test: /\.svg$/,
				include: path.resolve('img'),
				loader: 'svg-sprite-loader?' + JSON.stringify({
					name: '[name]',
					prefixize: true
				})
			}	
		]
	}
};