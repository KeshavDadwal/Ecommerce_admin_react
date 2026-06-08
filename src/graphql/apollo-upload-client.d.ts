declare module 'apollo-upload-client' {
  import { ApolloLink } from '@apollo/client';
  export function createUploadLink(options: {
    uri?: string;
    headers?: Record<string, string>;
    credentials?: string;
    fetch?: typeof globalThis.fetch;
    fetchOptions?: RequestInit;
    includeExtensions?: boolean;
    useGETForQueries?: boolean;
  }): ApolloLink;
}