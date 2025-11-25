import { NextRequest, NextResponse } from "next/server";
import { Client, Storage, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export const runtime = "nodejs";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;
const bucketId = process.env.APPWRITE_SELLER_DOCS_BUCKET_ID!;

function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(project);
  client.setKey(apiKey);
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const sellerId = formData.get("sellerId");
    const transactionId = formData.get("transactionId");
    const docType = formData.get("docType");
    const fileField = formData.get("file");

    if (!sellerId || typeof sellerId !== "string") {
      return NextResponse.json({ error: "Missing sellerId" }, { status: 400 });
    }

    if (!docType || typeof docType !== "string") {
      return NextResponse.json({ error: "Missing docType" }, { status: 400 });
    }

    if (!fileField || typeof fileField === "string") {
      return NextResponse.json(
        { error: "File not provided or invalid" },
        { status: 400 }
      );
    }

    // Treat it as a Blob-like object (the Request API gives us this)
    const blob = fileField as Blob & {
      name?: string;
      size?: number;
      type?: string;
    };

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const client = getAppwriteClient();
    const storage = new Storage(client);

    const inputFile = InputFile.fromBuffer(
      buffer,
      blob.name || "document-upload"
    );

    const createdFile = await storage.createFile(bucketId, ID.unique(), inputFile);

    console.log("Uploaded seller doc:", {
      sellerId,
      transactionId,
      docType,
      fileId: createdFile.$id,
    });

    return NextResponse.json(
      {
        ok: true,
        fileId: createdFile.$id,
        sellerId,
        transactionId: transactionId || null,
        docType,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload seller doc error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
