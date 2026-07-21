import { IHttpClient } from '../../application/ports/IHttpClient';

export class NodeFetchHttpClient implements IHttpClient {
  public async post(url: string, payload: any, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with HTTP ${response.status}: ${response.statusText}`);
    }
  }
}
