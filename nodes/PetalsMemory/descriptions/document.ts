import type { INodeProperties } from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['document'] } },
    options: [
      {
        name: 'Ingest',
        value: 'ingest',
        action: 'Ingest a document',
        description: 'Add or update a document in memory',
      },
    ],
    default: 'ingest',
  },
];

const showDocument = { show: { resource: ['document'], operation: ['ingest'] } };

export const documentFields: INodeProperties[] = [
  {
    displayName: 'Content',
    name: 'content',
    type: 'string',
    typeOptions: { rows: 4 },
    required: true,
    default: '',
    displayOptions: showDocument,
    description: 'Raw document text to ingest',
  },
  {
    displayName: 'Document ID',
    name: 'documentId',
    type: 'string',
    default: '',
    displayOptions: showDocument,
    description:
      'Stable ID in your own namespace (e.g. a Drive file ID). Leave blank to derive a content hash, so re-runs of unchanged content deduplicate.',
  },
  {
    displayName: 'Content Type',
    name: 'contentType',
    type: 'options',
    default: 'markdown',
    displayOptions: showDocument,
    options: [
      { name: 'HTML', value: 'html' },
      { name: 'Markdown', value: 'markdown' },
      { name: 'Text', value: 'text' },
    ],
    description: 'Format of the content. HTML is converted to Markdown server-side.',
  },
  {
    displayName: 'Update Existing',
    name: 'updateExisting',
    type: 'boolean',
    default: false,
    displayOptions: showDocument,
    description: 'Whether to replace any existing document with the same ID',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: showDocument,
    options: [
      {
        displayName: 'Author',
        name: 'author',
        type: 'string',
        default: '',
        description: 'Author or byline, primarily for reference material',
      },
      {
        displayName: 'Scope',
        name: 'scope',
        type: 'options',
        default: 'personal',
        options: [
          { name: 'Personal', value: 'personal' },
          { name: 'Reference', value: 'reference' },
        ],
        description: 'Use Reference for curated material surfaced separately from personal queries',
      },
      {
        displayName: 'Timestamp',
        name: 'timestamp',
        type: 'dateTime',
        default: '',
        description: 'ISO 8601 timestamp; defaults to ingestion time',
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        description: 'Title surfaced in source listings and reference cards',
      },
    ],
  },
];
