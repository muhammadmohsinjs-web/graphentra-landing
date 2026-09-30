'use strict';

// Loads the typed data modules in src/data/*.ts for the tests. Node cannot import extensionless TypeScript,
// so each module is transpiled in memory with the TypeScript compiler (a devDependency, pure JavaScript, so it
// works on every platform) and evaluated with a tiny CommonJS loader that resolves './name' to './name.ts'.

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const dataDirectory = path.join(root, 'src/data');
const cache = new Map();

function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file
  });
  const module = { exports: {} };
  cache.set(file, module);
  const localRequire = request => {
    if (!request.startsWith('.')) return require(request);
    const resolved = path.resolve(path.dirname(file), request);
    return load(fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : resolved);
  };
  new Function('exports', 'require', 'module', outputText)(module.exports, localRequire, module);
  return module.exports;
}

const loadData = name => load(path.join(dataDirectory, `${name}.ts`));

/** Every string inside a value, however deeply nested. */
function strings(value, sink = []) {
  if (typeof value === 'string') sink.push(value);
  else if (Array.isArray(value)) value.forEach(item => strings(item, sink));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => strings(item, sink));
  return sink;
}

module.exports = { loadData, strings, root };
