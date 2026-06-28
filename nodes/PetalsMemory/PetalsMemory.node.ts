import { randomBytes } from 'node:crypto';
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from 'n8n-workflow';
import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import {
  buildBulkMetricRequest,
  buildDocumentRequest,
  buildFileRequest,
  buildMetricRequest,
  buildTranscriptRequest,
  type BulkObservation,
  type PetalsRequest,
  type Resource,
  type TranscriptUtterance,
} from './builders';
import { documentFields, documentOperations } from './descriptions/document';
import { fileFields, fileOperations } from './descriptions/file';
import { metricFields, metricOperations } from './descriptions/metric';
import { transcriptFields, transcriptOperations } from './descriptions/transcript';

async function buildRequest(
  ctx: IExecuteFunctions,
  resource: Resource,
  operation: string,
  i: number,
): Promise<PetalsRequest> {
  if (resource === 'document' && operation === 'ingest') {
    const extra = ctx.getNodeParameter('additionalFields', i, {}) as {
      title?: string;
      author?: string;
      scope?: 'personal' | 'reference';
      timestamp?: string;
    };
    return buildDocumentRequest({
      content: ctx.getNodeParameter('content', i) as string,
      documentId: ctx.getNodeParameter('documentId', i, '') as string,
      contentType: ctx.getNodeParameter('contentType', i) as
        | 'markdown'
        | 'text'
        | 'html',
      updateExisting: ctx.getNodeParameter('updateExisting', i) as boolean,
      title: extra.title,
      author: extra.author,
      scope: extra.scope,
      timestamp: extra.timestamp,
    });
  }

  if (resource === 'file' && operation === 'ingest') {
    const binaryProperty = ctx.getNodeParameter('binaryProperty', i) as string;
    const meta = ctx.helpers.assertBinaryData(i, binaryProperty);
    const buffer = await ctx.helpers.getBinaryDataBuffer(i, binaryProperty);
    const extra = ctx.getNodeParameter('additionalFields', i, {}) as {
      filename?: string;
      mimeType?: string;
      title?: string;
      author?: string;
      scope?: 'personal' | 'reference';
      timestamp?: string;
    };
    const boundary = `----petalsFormBoundary${randomBytes(16).toString('hex')}`;
    return buildFileRequest(
      buffer,
      { fileName: meta.fileName, mimeType: meta.mimeType },
      extra,
      boundary,
    );
  }

  if (resource === 'transcript' && operation === 'ingest') {
    const mode = ctx.getNodeParameter('mode', i) as 'raw' | 'segmented';
    const utterancesColl = ctx.getNodeParameter('utterances', i, {}) as {
      utterance?: TranscriptUtterance[];
    };
    return buildTranscriptRequest({
      transcriptId: ctx.getNodeParameter('transcriptId', i) as string,
      occurredAt: ctx.getNodeParameter('occurredAt', i) as string,
      scope: ctx.getNodeParameter('scope', i, 'personal') as
        | 'personal'
        | 'reference',
      mode,
      text: mode === 'raw' ? (ctx.getNodeParameter('text', i) as string) : undefined,
      utterances:
        mode === 'segmented' ? (utterancesColl.utterance ?? []) : undefined,
    });
  }

  if (resource === 'metric' && operation === 'recordObservation') {
    const extra = ctx.getNodeParameter('additionalFields', i, {}) as {
      note?: string;
      validRangeMin?: number;
      validRangeMax?: number;
    };
    return buildMetricRequest({
      slug: ctx.getNodeParameter('slug', i) as string,
      label: ctx.getNodeParameter('label', i) as string,
      description: ctx.getNodeParameter('description', i) as string,
      unit: ctx.getNodeParameter('unit', i) as string,
      aggregationHint: ctx.getNodeParameter('aggregationHint', i) as
        | 'avg'
        | 'sum'
        | 'min'
        | 'max',
      value: ctx.getNodeParameter('value', i) as number,
      occurredAt: ctx.getNodeParameter('occurredAt', i) as string,
      note: extra.note,
      validRangeMin: extra.validRangeMin,
      validRangeMax: extra.validRangeMax,
    });
  }

  if (resource === 'metric' && operation === 'recordObservationsBulk') {
    const coll = ctx.getNodeParameter('observations', i, {}) as {
      observation?: BulkObservation[];
    };
    return buildBulkMetricRequest({
      sourceExternalId: ctx.getNodeParameter('sourceExternalId', i) as string,
      observations: coll.observation ?? [],
    });
  }

  throw new NodeOperationError(
    ctx.getNode(),
    `Unsupported operation "${operation}" for resource "${resource}"`,
    { itemIndex: i },
  );
}

export class PetalsMemory implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Petals Memory',
    name: 'petalsMemory',
    icon: 'file:petals.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Ingest content into your Petals assistant memory',
    defaults: { name: 'Petals Memory' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    usableAsTool: true,
    credentials: [{ name: 'petalsApi', required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Document', value: 'document' },
          { name: 'File', value: 'file' },
          { name: 'Metric', value: 'metric' },
          { name: 'Transcript', value: 'transcript' },
        ],
        default: 'document',
      },
      ...documentOperations,
      ...documentFields,
      ...fileOperations,
      ...fileFields,
      ...transcriptOperations,
      ...transcriptFields,
      ...metricOperations,
      ...metricFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('petalsApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as Resource;
        const operation = this.getNodeParameter('operation', i) as string;
        const req = await buildRequest(this, resource, operation, i);

        const requestOptions: IHttpRequestOptions = {
          method: 'POST',
          url: `${baseUrl}${req.endpoint}`,
          body: req.body,
        };
        if (req.json) {
          // JSON ops: n8n serializes the object and parses the JSON response.
          requestOptions.json = true;
        } else {
          // Multipart: send the raw Buffer with our boundary header; omitting
          // `json` keeps the boundary intact while the JSON response is still parsed.
          requestOptions.headers = { 'content-type': req.contentType };
        }

        const responseData = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'petalsApi',
          requestOptions,
        );

        returnData.push({
          json: responseData as IDataObject,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, {
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}
