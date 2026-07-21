export interface IHttpClient {
  /**
   * Abstract port for making HTTP POST requests to external systems.
   * Completely decouples the Application layer from libraries like Axios or native Fetch.
   */
  post(url: string, payload: any, headers?: Record<string, string>): Promise<void>;
}
