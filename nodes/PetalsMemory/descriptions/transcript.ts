import type { INodeProperties } from 'n8n-workflow';

export const transcriptOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['transcript'] } },
    options: [
      {
        name: 'Ingest',
        value: 'ingest',
        action: 'Ingest a transcript',
        description: 'Ingest a multi-party transcript with speaker provenance',
      },
    ],
    default: 'ingest',
  },
];

const showTranscript = { show: { resource: ['transcript'], operation: ['ingest'] } };

export const transcriptFields: INodeProperties[] = [
  {
    displayName: 'Transcript ID',
    name: 'transcriptId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showTranscript,
    description: 'Stable transcript ID in your own namespace',
  },
  {
    displayName: 'Occurred At',
    name: 'occurredAt',
    type: 'dateTime',
    required: true,
    default: '',
    displayOptions: showTranscript,
    description: 'ISO 8601 timestamp the transcript covers',
  },
  {
    displayName: 'Mode',
    name: 'mode',
    type: 'options',
    default: 'raw',
    displayOptions: showTranscript,
    options: [
      { name: 'Raw', value: 'raw' },
      { name: 'Segmented', value: 'segmented' },
    ],
    description: 'Send raw text (segmented server-side) or pre-segmented utterances',
  },
  {
    displayName: 'Text',
    name: 'text',
    type: 'string',
    typeOptions: { rows: 4 },
    required: true,
    default: '',
    displayOptions: {
      show: { resource: ['transcript'], operation: ['ingest'], mode: ['raw'] },
    },
    description: 'Full transcript text; segmented server-side',
  },
  {
    displayName: 'Utterances',
    name: 'utterances',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    placeholder: 'Add Utterance',
    default: {},
    displayOptions: {
      show: { resource: ['transcript'], operation: ['ingest'], mode: ['segmented'] },
    },
    options: [
      {
        name: 'utterance',
        displayName: 'Utterance',
        values: [
          {
            displayName: 'Speaker Label',
            name: 'speakerLabel',
            type: 'string',
            default: '',
            description: 'Label for the speaker in the transcript',
          },
          {
            displayName: 'Content',
            name: 'content',
            type: 'string',
            default: '',
            description: 'What the speaker said',
          },
          {
            displayName: 'Timestamp',
            name: 'timestamp',
            type: 'string',
            default: '',
            description: 'Optional relative time within the transcript',
          },
        ],
      },
    ],
  },
  {
    displayName: 'Scope',
    name: 'scope',
    type: 'options',
    default: 'personal',
    displayOptions: showTranscript,
    options: [
      { name: 'Personal', value: 'personal' },
      { name: 'Reference', value: 'reference' },
    ],
    description: 'Use Reference for curated material surfaced separately from personal queries',
  },
];
