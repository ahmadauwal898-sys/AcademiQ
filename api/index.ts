import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/app';

// Vercel Serverless Function entry point
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as any)(req, res);
}

export { app };
