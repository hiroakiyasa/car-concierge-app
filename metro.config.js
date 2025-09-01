const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 動画ファイルをアセットとして追加
config.resolver.assetExts.push('MOV', 'mov', 'mp4', 'MP4');

// Webプラットフォーム用の設定
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;