import { runUpload } from './upload-core';

runUpload({
  label: 'image',
  sourceDir: 'asset/image',
  glob: '**/*.{png,jpg,jpeg,gif,webp}',
  isJson: false,
  expectCount: 3,
  manifestPath: 'asset/log/upload-image.jsonl'
}).catch(err => {
  console.error('FATAL(images):', err);
  process.exit(1);
});
