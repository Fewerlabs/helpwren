import { describe, expect, it } from "vitest";

import { detectAttachmentType } from "./file-type";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) => (typeof part === "string" ? [...Buffer.from(part, "latin1")] : part)),
  );

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "rest");

describe("detectAttachmentType", () => {
  it("knows each accepted kind of file by its bytes", () => {
    expect(detectAttachmentType(PNG, "image/png")).toBe("image/png");
    expect(detectAttachmentType(bytes([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe("image/jpeg");
    expect(detectAttachmentType(bytes("GIF89a..."), "image/gif")).toBe("image/gif");
    expect(detectAttachmentType(bytes("RIFF\0\0\0\0WEBPVP8"), "image/webp")).toBe("image/webp");
    expect(detectAttachmentType(bytes("%PDF-1.7"), "application/pdf")).toBe("application/pdf");
    expect(detectAttachmentType(bytes("Order,Total\n1,2\n"), "text/csv")).toBe("text/csv");
    expect(detectAttachmentType(bytes("Hello there"), "text/plain")).toBe("text/plain");
  });

  it("tells a Word document from a workbook inside the ZIP both are", () => {
    const zip = (inside: string) => bytes([0x50, 0x4b, 0x03, 0x04], `[Content_Types].xml${inside}`);
    expect(detectAttachmentType(zip("word/document.xml"), "application/msword")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(detectAttachmentType(zip("xl/workbook.xml"), "application/vnd.ms-excel")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(detectAttachmentType(zip("payload.exe"), "application/zip")).toBeNull();
  });

  it("keeps a file as what it is when only its name got the kind wrong", () => {
    expect(detectAttachmentType(PNG, "image/jpeg")).toBe("image/png");
  });

  it("refuses markup, whatever it is called", () => {
    expect(detectAttachmentType(bytes("<html><script>alert(1)</script>"), "image/png")).toBeNull();
    expect(detectAttachmentType(bytes("  <svg onload=alert(1)>"), "text/plain")).toBeNull();
    expect(detectAttachmentType(bytes("<?xml version='1.0'?>"), "text/plain")).toBeNull();
    expect(detectAttachmentType(bytes("<!DOCTYPE html>"), "text/csv")).toBeNull();
  });

  it("refuses programs and anything that is not text", () => {
    expect(detectAttachmentType(bytes("MZ", [0x90, 0x00, 0x03]), "application/pdf")).toBeNull();
    expect(detectAttachmentType(bytes([0xc3, 0x28]), "text/plain")).toBeNull();
    // Two bytes that read as text are still a program when that is what was sent.
    expect(detectAttachmentType(bytes("MZ"), "application/x-msdownload")).toBeNull();
  });
});
