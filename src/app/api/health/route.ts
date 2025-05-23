import { NextResponse } from 'next/server';

export async function GET() {
  // You can add additional health checks here if needed,
  // such as database connectivity tests or other service checks
  
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString() 
    },
    { status: 200 }
  );
} 