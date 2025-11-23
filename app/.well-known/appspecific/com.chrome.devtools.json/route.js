// app/.well-known/appspecific/com.chrome.devtools.json/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install the 'uuid' package

export function GET() {
  const workspaceUuid = uuidv4(); // Generate a new UUID
  const responseBody = {
    workspace: {
      root: process.cwd(), // Absolute path to your project folder
      uuid: workspaceUuid,
    },
  };
  return NextResponse.json(responseBody);
}