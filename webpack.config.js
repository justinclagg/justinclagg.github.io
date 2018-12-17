const webpack = require('webpack');
const path = require('path');
const ejsBuilder = require('ejs-webpack-builder');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const SRC_DIR = path.resolve(__dirname, './src');

module.exports = {
	entry: path.resolve(__dirname, './src/js/index.js'),
	output: {
		path: path.resolve(__dirname),
		filename: './js/app.js',
		publicPath: '/'
	},
	plugins: [
		new ExtractTextPlugin('./css/[name].css'),
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
		loaders: [
			{
				test: /\.js$/,
				include: path.resolve(SRC_DIR),
				exclude: /node_modules/,
				loader: 'babel-loader'
			},
			{
				test: /\.scss$/,
				include: path.resolve(SRC_DIR, 'css'),
				loader: ExtractTextPlugin.extract(
					'style',
					'css!sass'
				)
			},
			{
				test: /\.svg$/,
				include: path.resolve('img'),
				loader: 'svg-sprite?' + JSON.stringify({
					name: '[name]',
					prefixize: true,
					// spriteModule: 'utils/my-custom-sprite'
				})
			}	
		]
	}
};