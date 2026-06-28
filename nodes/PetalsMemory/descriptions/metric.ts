import type { INodeProperties } from 'n8n-workflow';

export const metricOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['metric'] } },
    options: [
      {
        name: 'Record Observation',
        value: 'recordObservation',
        action: 'Record a metric observation',
        description: 'Record one numeric reading; creates the definition on first use',
      },
      {
        name: 'Record Observations (Bulk)',
        value: 'recordObservationsBulk',
        action: 'Record many metric observations',
        description: 'Bulk-record readings against existing metric slugs',
      },
    ],
    default: 'recordObservation',
  },
];

const showSingle = {
  show: { resource: ['metric'], operation: ['recordObservation'] },
};
const showBulk = {
  show: { resource: ['metric'], operation: ['recordObservationsBulk'] },
};

export const metricFields: INodeProperties[] = [
  {
    displayName: 'Slug',
    name: 'slug',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showSingle,
    description: 'Stable lowercase snake_case slug (e.g. body_weight)',
  },
  {
    displayName: 'Label',
    name: 'label',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showSingle,
    description: 'Human-readable label for the metric',
  },
  {
    displayName: 'Description',
    name: 'description',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showSingle,
    description: 'What the metric captures',
  },
  {
    displayName: 'Unit',
    name: 'unit',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showSingle,
    description: 'Unit of measurement (e.g. kg, bpm)',
  },
  {
    displayName: 'Aggregation Hint',
    name: 'aggregationHint',
    type: 'options',
    default: 'avg',
    displayOptions: showSingle,
    options: [
      { name: 'Average', value: 'avg' },
      { name: 'Maximum', value: 'max' },
      { name: 'Minimum', value: 'min' },
      { name: 'Sum', value: 'sum' },
    ],
    description: 'How values aggregate over a window',
  },
  {
    displayName: 'Value',
    name: 'value',
    type: 'number',
    required: true,
    default: 0,
    displayOptions: showSingle,
    description: 'The numeric reading',
  },
  {
    displayName: 'Occurred At',
    name: 'occurredAt',
    type: 'dateTime',
    required: true,
    default: '',
    displayOptions: showSingle,
    description: 'ISO 8601 timestamp of the reading',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: showSingle,
    options: [
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        default: '',
        description: 'Optional short note (e.g. post-run)',
      },
      {
        displayName: 'Valid Range Max',
        name: 'validRangeMax',
        type: 'number',
        default: 0,
        description: 'Optional upper bound for sanity validation',
      },
      {
        displayName: 'Valid Range Min',
        name: 'validRangeMin',
        type: 'number',
        default: 0,
        description: 'Optional lower bound for sanity validation',
      },
    ],
  },
  {
    displayName: 'Source External ID',
    name: 'sourceExternalId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: showBulk,
    description: 'Idempotency key for the import batch',
  },
  {
    displayName: 'Observations',
    name: 'observations',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    placeholder: 'Add Observation',
    default: {},
    displayOptions: showBulk,
    options: [
      {
        name: 'observation',
        displayName: 'Observation',
        values: [
          {
            displayName: 'Metric Slug',
            name: 'metricSlug',
            type: 'string',
            default: '',
            description: 'Slug of an existing metric definition',
          },
          {
            displayName: 'Value',
            name: 'value',
            type: 'number',
            default: 0,
            description: 'The numeric reading',
          },
          {
            displayName: 'Occurred At',
            name: 'occurredAt',
            type: 'dateTime',
            default: '',
            description: 'ISO 8601 timestamp of the reading',
          },
          {
            displayName: 'Note',
            name: 'note',
            type: 'string',
            default: '',
            description: 'Optional short note',
          },
        ],
      },
    ],
  },
];
