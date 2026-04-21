import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  try {
    const rows = await sql`
      SELECT id, deal_id, doc_type, title, blob_url, preview_text, format, word_count, created_at
      FROM agents.documents
      WHERE deal_id = ${dealId}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ documents: rows });
  } catch (e) {
    console.error("documents GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const { dealId, title, content, docType, format = "markdown" } = await req.json();
  if (!dealId || !title || !content || !docType) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const filename = `${dealId}/${docType}-${Date.now()}.${format === "csv" ? "csv" : "md"}`;
    const contentType = format === "csv" ? "text/csv" : "text/markdown";
    const previewText = content.slice(0, 500);
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    let blobUrl: string;

    if (blobToken) {
      const blob = await put(filename, content, {
        access: "public",
        contentType,
        token: blobToken,
      });
      blobUrl = blob.url;
    } else {
      // Fallback: store content as a data URL when Vercel Blob not configured
      const encoded = Buffer.from(content).toString("base64");
      blobUrl = `data:${contentType};base64,${encoded}`;
    }

    const [row] = await sql`
      INSERT INTO agents.documents (deal_id, doc_type, title, blob_url, preview_text, format, word_count)
      VALUES (${dealId}, ${docType}, ${title}, ${blobUrl}, ${previewText}, ${format}, ${wordCount})
      RETURNING id, created_at
    `;
    return NextResponse.json({ id: row.id, blobUrl, createdAt: row.created_at });
  } catch (e) {
    console.error("documents POST error:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const [row] = await sql`SELECT blob_url FROM agents.documents WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Delete from Vercel Blob if it's a real URL (not a data URL fallback)
    if (process.env.BLOB_READ_WRITE_TOKEN && row.blob_url && !row.blob_url.startsWith("data:")) {
      await del(row.blob_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    await sql`DELETE FROM agents.documents WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("documents DELETE error:", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
