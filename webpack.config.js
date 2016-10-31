const webpack = require('webpack');
const path = require('path');
const ejsBuilder = require('ejs-webpack-builder');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const SRC_DIR = path.resolve(__dirname, './src');
const DIST_DIR = path.resolve(__dirname, './docs');

module.exports = {
	entry: path.resolve(__dirname, 'index.js'),
	output: {
		path: DIST_DIR,
		filename: 'app.js',
		publicPath: '/'
	},
	plugins: [
		new ExtractTextPlugin('[name].css'),
		new ejsBuilder({
			root: path.resolve(__dirname, './src/templates/'),
			files: [
				{
					source: {
						name: 'index.ejs',
					},
					parameters: { filename: 'index.ejs', title: 'Portfolio' }
				},
				{
					source: {
						name: 'about.ejs',
					},
					parameters: { filename: 'about.ejs', title: 'About' }
				},
				{
					source: {
						name: 'contact.ejs',
					},
					parameters: { filename: 'contact.ejs', title: 'Contact' }
				},
				{
					source: {
						name: 'construction.ejs',
					},
					parameters: { filename: 'construction.ejs', title: 'Under Construction' }
				}
			]
		})
	],
	module: {
		loaders: [
			{
				test: /\.scss$/,
				include: path.resolve(SRC_DIR, 'css'),
				loader: ExtractTextPlugin.extract(
					'style',
					'css!sass'
				) 
			},
			{
				test: /\.js$/,
				include: path.resolve(SRC_DIR, 'js')
			}
		]
	}
};