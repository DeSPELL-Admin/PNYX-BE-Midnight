import { runDelete } from './delete-core';

runDelete({
  label: 'image',
  uploadManifestPath: 'asset/log/upload-image.jsonl',
  deleteManifestPath: 'asset/log/delete-image.jsonl',
  includeStatuses: ['DONE','SKIPPED'],
  dryRun: false,
  dbDeleteMode: 'hard',
});