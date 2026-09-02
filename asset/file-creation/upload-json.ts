import { runUpload } from './upload-core';

runUpload({
  label: 'json',
  sourceDir: 'asset/json',
  glob: '**/*.json',
  isJson: true,
  expectCount: 3,
  manifestPath: 'asset/log/upload-json.jsonl'
}).catch(err => {
  console.error('FATAL(json):', err);
  process.exit(1);
});
