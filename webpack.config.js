const webpack = require('webpack');
const path = require('path');
const ejsBuilder = require('ejs-webpack-builder');

const SRC_DIR = path.resolve(__dirname, './src');
const DIST_DIR = path.resolve(__dirname);

module.exports = {
	output: {
		path: DIST_DIR,
		filename: 'app.js',
		publicPath: '/'
	},
	plugins: [
		new ejsBuilder({
			root: __dirname,
			files: [
				{
					source: {
						name: 'index.ejs',
						dir: './src/templates/',
					},
					parameters: {filename: 'index.ejs', title: 'Portfolio', js: null}
				},
				{
					source: {
						name: 'about.ejs',
						dir: './src/templates/',
					},
					parameters: {filename: 'about.ejs', title: 'About', js: null}					
				},
				{
					source: {
						name: 'contact.ejs',
						dir: './src/templates/',
					},
					parameters: {filename: 'contact.ejs', title: 'Contact', js: './src/js/script.js'}
				},
				{
					source: {
						name: 'construction.ejs',
						dir: './src/templates/',
					},
					parameters: {filename: 'construction.ejs', title: 'Under Construction', js: null}
				}
			]
		})
	],
	module: {
		loaders: [
			{
				test: /\.scss$/,
				include: path.resolve(SRC_DIR, 'css'),
				loaders: ['style', 'css', 'sass']
			}
		]
	}
};