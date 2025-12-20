import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// --- POLYFILLS START ---
global.Buffer = require('buffer').Buffer;
global.process = require('process');
// --- POLYFILLS END ---

AppRegistry.registerComponent(appName, () => App);