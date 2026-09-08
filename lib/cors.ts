import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS for mobile / Expo Go. Prefer Bearer JWT so we can use Access-Control-Allow-Origin: *.
 */
export function corsHeaders(_req?: Request | NextRequest): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function withCors(res: NextResponse, req?: Request | NextRequest): NextResponse {
  const h = corsHeaders(req);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

export function jsonCors(data: unknown, init?: ResponseInit, req?: Request | NextRequest) {
  const res = NextResponse.json(data, init);
  return withCors(res, req);
}

export function optionsCors(req?: Request | NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}
