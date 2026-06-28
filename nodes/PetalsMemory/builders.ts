/**
 * Pure request builders that map node parameters to Petals proxy requests.
 * No n8n runtime needed — unit-tested directly. The node's execute() reads
 * parameters/binary (impure) and calls these.
 *
 * Common aliases: petals request builders, ingest payload mappers.
 */
import { createHash } from 'node:crypto';
import type { IDataObject } from 'n8n-workflow';

export type Resource = 'document' | 'file' | 'transcript' | 'metric';

export interface JsonRequest {
  endpoint: string;
  body: IDataObject;
  json: true;
}
export interface MultipartRequest {
  endpoint: string;
  body: Buffer;
  contentType: string;
  json: false;
}
export type PetalsRequest = JsonRequest | MultipartRequest;

export interface DocumentParams {
  content: string;
  documentId?: string;
  contentType: 'markdown' | 'text' | 'html';
  title?: string;
  author?: string;
  scope?: 'personal' | 'reference';
  timestamp?: string;
  updateExisting: boolean;
}

/** Deterministic content hash, used as the document id when none is provided. */
export function documentIdFrom(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Normalizes an ISO-8601 datetime to UTC (`…Z`). n8n dateTime fields can emit
 * timezone offsets (e.g. `+02:00`), but the Petals proxy and the memory SDK
 * schemas accept only UTC, so we convert before sending. Invalid input is
 * passed through unchanged so the server returns a clear validation error
 * rather than the node throwing.
 */
export function toUtcIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function buildDocumentRequest(params: DocumentParams): JsonRequest {
  const trimmedId = params.documentId?.trim();
  const document: IDataObject = {
    id: trimmedId ? trimmedId : documentIdFrom(params.content),
    content: params.content,
    contentType: params.contentType,
  };
  if (params.title) document.title = params.title;
  if (params.author) document.author = params.author;
  if (params.scope) document.scope = params.scope;
  if (params.timestamp) document.timestamp = toUtcIso(params.timestamp);
  return {
    endpoint: '/api/memory/ingest/document',
    json: true,
    body: { updateExisting: params.updateExisting, document },
  };
}

export interface TranscriptUtterance {
  speakerLabel: string;
  content: string;
  timestamp?: string;
}
export interface TranscriptParams {
  transcriptId: string;
  occurredAt: string;
  scope?: 'personal' | 'reference';
  mode: 'raw' | 'segmented';
  text?: string;
  utterances?: TranscriptUtterance[];
}

export function buildTranscriptRequest(params: TranscriptParams): JsonRequest {
  const content: IDataObject =
    params.mode === 'raw'
      ? { kind: 'raw', text: params.text ?? '' }
      : {
          kind: 'segmented',
          utterances: (params.utterances ?? []).map((u) => {
            const utterance: IDataObject = {
              speakerLabel: u.speakerLabel,
              content: u.content,
            };
            if (u.timestamp) utterance.timestamp = u.timestamp;
            return utterance;
          }),
        };
  const body: IDataObject = {
    transcriptId: params.transcriptId,
    occurredAt: toUtcIso(params.occurredAt),
    content,
  };
  if (params.scope) body.scope = params.scope;
  return { endpoint: '/api/memory/ingest/transcript', json: true, body };
}

export interface MetricObservationParams {
  slug: string;
  label: string;
  description: string;
  unit: string;
  aggregationHint: 'avg' | 'sum' | 'min' | 'max';
  value: number;
  occurredAt: string;
  note?: string;
  validRangeMin?: number;
  validRangeMax?: number;
}

export function buildMetricRequest(params: MetricObservationParams): JsonRequest {
  const metric: IDataObject = {
    slug: params.slug,
    label: params.label,
    description: params.description,
    unit: params.unit,
    aggregationHint: params.aggregationHint,
  };
  if (params.validRangeMin !== undefined) metric.validRangeMin = params.validRangeMin;
  if (params.validRangeMax !== undefined) metric.validRangeMax = params.validRangeMax;
  const body: IDataObject = { metric, value: params.value, occurredAt: toUtcIso(params.occurredAt) };
  if (params.note) body.note = params.note;
  return { endpoint: '/api/memory/metrics/observations', json: true, body };
}

export interface BulkObservation {
  metricSlug: string;
  value: number;
  occurredAt: string;
  note?: string;
}
export interface BulkMetricParams {
  sourceExternalId: string;
  observations: BulkObservation[];
}

export function buildBulkMetricRequest(params: BulkMetricParams): JsonRequest {
  const observations = params.observations.map((o) => {
    const obs: IDataObject = {
      metricSlug: o.metricSlug,
      value: o.value,
      occurredAt: toUtcIso(o.occurredAt),
    };
    if (o.note) obs.note = o.note;
    return obs;
  });
  return {
    endpoint: '/api/memory/metrics/observations/bulk',
    json: true,
    body: { sourceExternalId: params.sourceExternalId, observations },
  };
}

export interface BinaryMeta {
  fileName?: string;
  mimeType?: string;
}
export interface FileFields {
  filename?: string;
  mimeType?: string;
  title?: string;
  author?: string;
  scope?: 'personal' | 'reference';
  timestamp?: string;
}

export type MultipartPart =
  | { kind: 'file'; name: string; filename: string; contentType?: string; data: Buffer }
  | { kind: 'field'; name: string; value: string };

/**
 * Encodes multipart/form-data as a Buffer with the given boundary. Pure and
 * deterministic (the boundary is injected), so it's unit-testable; the node
 * generates a random boundary at call time. Hand-rolled to avoid a runtime
 * dependency on `form-data` (n8n verified nodes must ship zero runtime deps).
 */
export function buildMultipartBody(parts: MultipartPart[], boundary: string): Buffer {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if (part.kind === 'file') {
      const filename = part.filename.replace(/[\r\n"]/g, '_');
      let headers = `Content-Disposition: form-data; name="${part.name}"; filename="${filename}"\r\n`;
      if (part.contentType) headers += `Content-Type: ${part.contentType}\r\n`;
      chunks.push(Buffer.from(`${headers}\r\n`));
      chunks.push(part.data);
      chunks.push(Buffer.from('\r\n'));
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n`));
      chunks.push(Buffer.from(part.value));
      chunks.push(Buffer.from('\r\n'));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

export function buildFileParts(
  buffer: Buffer,
  meta: BinaryMeta,
  fields: FileFields,
): MultipartPart[] {
  const parts: MultipartPart[] = [
    {
      kind: 'file',
      name: 'file',
      filename: fields.filename ?? meta.fileName ?? 'upload',
      contentType: fields.mimeType ?? meta.mimeType,
      data: buffer,
    },
  ];
  if (fields.filename) parts.push({ kind: 'field', name: 'filename', value: fields.filename });
  if (fields.mimeType) parts.push({ kind: 'field', name: 'mimeType', value: fields.mimeType });
  if (fields.title) parts.push({ kind: 'field', name: 'title', value: fields.title });
  if (fields.author) parts.push({ kind: 'field', name: 'author', value: fields.author });
  if (fields.scope) parts.push({ kind: 'field', name: 'scope', value: fields.scope });
  if (fields.timestamp) {
    parts.push({ kind: 'field', name: 'timestamp', value: toUtcIso(fields.timestamp) });
  }
  return parts;
}

export function buildFileRequest(
  buffer: Buffer,
  meta: BinaryMeta,
  fields: FileFields,
  boundary: string,
): MultipartRequest {
  return {
    endpoint: '/api/memory/ingest/file',
    body: buildMultipartBody(buildFileParts(buffer, meta, fields), boundary),
    contentType: `multipart/form-data; boundary=${boundary}`,
    json: false,
  };
}
