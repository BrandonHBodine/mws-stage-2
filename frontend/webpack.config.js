const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
	mode: 'production',
	entry: {
		main: './src/js/main.js',
		restaurant: './src/js/restaurant_info.js'
	},
	devServer: {
		contentBase: './dist'
	},
	plugins: [
		new CleanWebpackPlugin(['dist']),
		new HtmlWebpackPlugin({
			title: 'Restaurant Reviews',
			filename: 'index.html',
			template: './src/index.html',
			chunks: ['main'],
			minify: true
		}),
		new HtmlWebpackPlugin({
			title: 'Restaurant Info',
			filename: 'restaurant.html',
			template: './src/restaurant.html',
			chunks: ['restaurant'],
			minify: true
		})
	],
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist')
	}
};
