import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });


const saveFile = async (buffer: Buffer, fileName: string) => {
  try {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const options = {
      pinataMetadata: {
        name: fileName,
      },
    };
    const response = await pinata.pinFileToIPFS(readable, options);

    return response;
  } catch (error) {
    // console.log(error);
    throw error;
  }
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type");

  if (contentType === "application/json") {
    const data = await req.json();
    try {
      const response = await pinata.pinJSONToIPFS(data);
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { message: "Error uploading json to IPFS" },
        { status: 500 },
      );
    }
  } else if (contentType?.startsWith("multipart/form-data")) {
    try {
      const data = await req.formData();
      const file: File | null = data.get("file") as File;

      if (!file) {
        return NextResponse.json({ success: false });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const response = await saveFile(buffer, file.name);

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { message: "Error uploading file to IPFS" },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
