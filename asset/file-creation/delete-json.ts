import { runDelete } from './delete-core';

runDelete({
  label: 'json',
  uploadManifestPath: 'asset/log/upload-json.jsonl',
  deleteManifestPath: 'asset/log/delete-json.jsonl',
  includeStatuses: ['DONE','SKIPPED'],
  dryRun: false,
  dbDeleteMode: 'hard',
});