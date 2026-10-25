// Wspólne dla testów: ładuje pliki js/ w kolejności z index.html do jednego kontekstu (jak przeglądarka)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const order = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(js\/[^"?]+)/g)].map(m => m[1]);
exports.order = order;
exports.load = (files, ctx = {}) => {
  const c = vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, {filename: f}));
  return c;
};
