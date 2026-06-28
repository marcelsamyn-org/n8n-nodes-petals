import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['file'] } },
    options: [
      {
        name: 'Ingest',
        value: 'ingest',
        action: 'Ingest a file',
        description: 'Ingest a binary file (PDF, DOCX, text, and more)',
      },
    ],
    default: 'ingest',
  },
];

const showFile = { show: { resource: ['file'], operation: ['ingest'] } };

export const fileFields: INodeProperties[] = [
  {
    displayName: 'Input Binary Field',
    name: 'binaryProperty',
    type: 'string',
    required: true,
    default: 'data',
    displayOptions: showFile,
    description:
      'Name of the binary property on the input item that holds the file to ingest',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: showFile,
    options: [
      {
        displayName: 'Author',
        name: 'author',
        type: 'string',
        default: '',
        description: 'Author or byline, primarily for reference material',
      },
      {
        displayName: 'File Name',
        name: 'filename',
        type: 'string',
        default: '',
        description: "Override the filename; defaults to the binary's file name",
      },
      {
        displayName: 'MIME Type',
        name: 'mimeType',
        type: 'string',
        default: '',
        description: "Override the MIME type; defaults to the binary's MIME type",
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
        description: 'ISO 8601 timestamp; defaults to upload time',
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
