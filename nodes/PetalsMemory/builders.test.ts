import {
  buildBulkMetricRequest,
  buildDocumentRequest,
  buildFileParts,
  buildFileRequest,
  buildMetricRequest,
  buildMultipartBody,
  buildTranscriptRequest,
  documentIdFrom,
  toUtcIso,
} from "./builders";
import { describe, expect, it } from "vitest";

describe("documentIdFrom", () => {
  it("is a 64-char hex digest", () => {
    expect(documentIdFrom("hello")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("is deterministic and content-sensitive", () => {
    expect(documentIdFrom("a")).toBe(documentIdFrom("a"));
    expect(documentIdFrom("a")).not.toBe(documentIdFrom("b"));
  });
});

describe("buildDocumentRequest", () => {
  it("targets the document endpoint as JSON", () => {
    const req = buildDocumentRequest({
      content: "Body",
      documentId: "doc-1",
      contentType: "markdown",
      updateExisting: true,
    });
    expect(req).toEqual({
      endpoint: "/api/memory/ingest/document",
      json: true,
      body: {
        updateExisting: true,
        document: { id: "doc-1", content: "Body", contentType: "markdown" },
      },
    });
  });

  it("hashes the content for the id when none is given", () => {
    const req = buildDocumentRequest({
      content: "Body",
      documentId: "",
      contentType: "text",
      updateExisting: false,
    });
    const body = req.body as { document: { id: string } };
    expect(body.document.id).toBe(documentIdFrom("Body"));
  });

  it("includes optional metadata only when present", () => {
    const req = buildDocumentRequest({
      content: "Body",
      contentType: "html",
      updateExisting: false,
      title: "T",
      author: "A",
      scope: "reference",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(req.body.document).toMatchObject({
      title: "T",
      author: "A",
      scope: "reference",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("buildTranscriptRequest", () => {
  it("builds raw content", () => {
    const req = buildTranscriptRequest({
      transcriptId: "t1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      mode: "raw",
      text: "hello there",
    });
    expect(req).toEqual({
      endpoint: "/api/memory/ingest/transcript",
      json: true,
      body: {
        transcriptId: "t1",
        occurredAt: "2026-01-01T00:00:00.000Z",
        content: { kind: "raw", text: "hello there" },
      },
    });
  });

  it("builds segmented content and includes scope", () => {
    const req = buildTranscriptRequest({
      transcriptId: "t1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      scope: "personal",
      mode: "segmented",
      utterances: [
        { speakerLabel: "Ann", content: "Hi" },
        { speakerLabel: "Bob", content: "Yo", timestamp: "00:05" },
      ],
    });
    expect(req.body).toEqual({
      transcriptId: "t1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      scope: "personal",
      content: {
        kind: "segmented",
        utterances: [
          { speakerLabel: "Ann", content: "Hi" },
          { speakerLabel: "Bob", content: "Yo", timestamp: "00:05" },
        ],
      },
    });
  });
});

describe("buildMetricRequest", () => {
  it("nests the definition and includes the range only when set", () => {
    const req = buildMetricRequest({
      slug: "body_weight",
      label: "Body Weight",
      description: "Morning weight",
      unit: "kg",
      aggregationHint: "avg",
      value: 72.5,
      occurredAt: "2026-01-01T00:00:00.000Z",
      validRangeMin: 40,
    });
    expect(req).toEqual({
      endpoint: "/api/memory/metrics/observations",
      json: true,
      body: {
        metric: {
          slug: "body_weight",
          label: "Body Weight",
          description: "Morning weight",
          unit: "kg",
          aggregationHint: "avg",
          validRangeMin: 40,
        },
        value: 72.5,
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    });
  });
});

describe("buildBulkMetricRequest", () => {
  it("targets the bulk endpoint and drops empty notes", () => {
    const req = buildBulkMetricRequest({
      sourceExternalId: "import-1",
      observations: [
        { metricSlug: "steps", value: 8000, occurredAt: "2026-01-01T00:00:00.000Z" },
        { metricSlug: "steps", value: 9000, occurredAt: "2026-01-02T00:00:00.000Z", note: "walk" },
      ],
    });
    expect(req).toEqual({
      endpoint: "/api/memory/metrics/observations/bulk",
      json: true,
      body: {
        sourceExternalId: "import-1",
        observations: [
          { metricSlug: "steps", value: 8000, occurredAt: "2026-01-01T00:00:00.000Z" },
          { metricSlug: "steps", value: 9000, occurredAt: "2026-01-02T00:00:00.000Z", note: "walk" },
        ],
      },
    });
  });
});

describe("buildMultipartBody", () => {
  it("encodes a file part and field parts with CRLF and a closing boundary", () => {
    const body = buildMultipartBody(
      [
        {
          kind: "file",
          name: "file",
          filename: "report.pdf",
          contentType: "application/pdf",
          data: Buffer.from("PDFDATA"),
        },
        { kind: "field", name: "title", value: "Q3" },
      ],
      "BOUND",
    );
    expect(body.toString()).toBe(
      '--BOUND\r\n' +
        'Content-Disposition: form-data; name="file"; filename="report.pdf"\r\n' +
        "Content-Type: application/pdf\r\n" +
        "\r\n" +
        "PDFDATA\r\n" +
        "--BOUND\r\n" +
        'Content-Disposition: form-data; name="title"\r\n' +
        "\r\n" +
        "Q3\r\n" +
        "--BOUND--\r\n",
    );
  });

  it("omits Content-Type for a file part without a content type", () => {
    const body = buildMultipartBody(
      [{ kind: "file", name: "file", filename: "a.bin", data: Buffer.from("x") }],
      "B",
    );
    expect(body.toString()).not.toContain("Content-Type:");
  });

  it("preserves binary file bytes exactly", () => {
    const bytes = Buffer.from([0x00, 0xff, 0x0d, 0x0a, 0x42]);
    const body = buildMultipartBody(
      [
        {
          kind: "file",
          name: "file",
          filename: "b.bin",
          contentType: "application/octet-stream",
          data: bytes,
        },
      ],
      "B",
    );
    expect(body.includes(bytes)).toBe(true);
  });

  it("sanitizes quotes and CRLF in the filename to avoid header injection", () => {
    const body = buildMultipartBody(
      [{ kind: "file", name: "file", filename: 'a"b\r\nc.pdf', data: Buffer.from("x") }],
      "B",
    );
    expect(body.toString()).toContain('filename="a_b__c.pdf"');
  });
});

describe("buildFileParts", () => {
  it("includes the file part plus only supplied fields, normalizing timestamp to UTC", () => {
    const parts = buildFileParts(
      Buffer.from("x"),
      { fileName: "a.pdf", mimeType: "application/pdf" },
      { title: "Q3", scope: "reference", timestamp: "2026-01-01T00:00:00+02:00" },
    );
    expect(parts[0]).toMatchObject({
      kind: "file",
      name: "file",
      filename: "a.pdf",
      contentType: "application/pdf",
    });
    expect(parts.filter((p) => p.kind === "field")).toEqual([
      { kind: "field", name: "title", value: "Q3" },
      { kind: "field", name: "scope", value: "reference" },
      { kind: "field", name: "timestamp", value: "2025-12-31T22:00:00.000Z" },
    ]);
  });

  it("falls back filename to meta then 'upload', and omits unsupplied fields", () => {
    expect(buildFileParts(Buffer.from("x"), {}, {})).toEqual([
      { kind: "file", name: "file", filename: "upload", contentType: undefined, data: Buffer.from("x") },
    ]);
  });
});

describe("buildFileRequest", () => {
  it("targets the file endpoint as multipart with the boundary in the content type", () => {
    const req = buildFileRequest(
      Buffer.from("x"),
      { fileName: "a.pdf", mimeType: "application/pdf" },
      {},
      "BOUND",
    );
    expect(req.endpoint).toBe("/api/memory/ingest/file");
    expect(req.json).toBe(false);
    expect(req.contentType).toBe("multipart/form-data; boundary=BOUND");
    expect(req.body.toString()).toContain('filename="a.pdf"');
  });
});

describe("toUtcIso", () => {
  it("converts a timezone offset to UTC", () => {
    expect(toUtcIso("2026-01-01T00:00:00+02:00")).toBe("2025-12-31T22:00:00.000Z");
  });
  it("is idempotent on UTC input", () => {
    expect(toUtcIso("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
  });
  it("passes through unparseable input unchanged", () => {
    expect(toUtcIso("not-a-date")).toBe("not-a-date");
  });
});

describe("datetime normalization in builders", () => {
  it("normalizes metric occurredAt offsets to UTC", () => {
    const req = buildMetricRequest({
      slug: "s",
      label: "L",
      description: "d",
      unit: "u",
      aggregationHint: "avg",
      value: 1,
      occurredAt: "2026-01-01T00:00:00+02:00",
    });
    expect(req.body.occurredAt).toBe("2025-12-31T22:00:00.000Z");
  });

  it("normalizes transcript occurredAt offsets to UTC", () => {
    const req = buildTranscriptRequest({
      transcriptId: "t",
      occurredAt: "2026-01-01T00:00:00+02:00",
      mode: "raw",
      text: "hi",
    });
    expect(req.body.occurredAt).toBe("2025-12-31T22:00:00.000Z");
  });
});
