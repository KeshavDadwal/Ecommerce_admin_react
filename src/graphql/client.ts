import { ApolloClient, InMemoryCache, ApolloLink, Observable } from '@apollo/client';
import type { FetchResult, Operation } from '@apollo/client';
import { print } from 'graphql';

// ── Inline multipart-upload link (replaces apollo-upload-client) ─────────────
// Implements the GraphQL multipart request spec:
// https://github.com/jaydenseric/graphql-multipart-request-spec
//
// When a mutation variable contains a File or Blob the request is
// automatically sent as multipart/form-data; otherwise it falls back
// to a normal JSON POST — no external package required.

function isFileOrBlob(v: unknown): v is File | Blob {
  return (typeof File !== 'undefined' && v instanceof File) ||
         (typeof Blob !== 'undefined' && v instanceof Blob);
}

/** Recursively extract File/Blob leaves from variables. */
function extractFiles(
  variables: Record<string, unknown>,
): { clone: Record<string, unknown>; map: Map<string, File | Blob> } {
  const fileMap = new Map<string, File | Blob>();

  function walk(node: unknown, path: string): unknown {
    if (isFileOrBlob(node)) {
      fileMap.set(path, node);
      return null;                        // placeholder in the clone
    }
    if (Array.isArray(node))
      return node.map((v, i) => walk(v, `${path}.${i}`));
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node))
        out[k] = walk(v, `${path}.${k}`);
      return out;
    }
    return node;
  }

  const clone = walk(variables, 'variables') as Record<string, unknown>;
  return { clone, map: fileMap };
}

function createUploadLink(uri: string): ApolloLink {
  return new ApolloLink((operation: Operation) =>
    new Observable<FetchResult>((observer) => {
      const { headers } = operation.getContext() as { headers?: Record<string, string> };
      const { clone, map } = extractFiles(operation.variables as Record<string, unknown>);
      const hasFiles = map.size > 0;

      let body: string | FormData;
      const fetchHeaders: Record<string, string> = { ...headers };

      if (hasFiles) {
        // multipart/form-data — let the browser set Content-Type + boundary
        const form = new FormData();
        form.append(
          'operations',
          JSON.stringify({ query: print(operation.query), variables: clone }),
        );
        // map: { "0": ["variables.variants.0.images.0"], … }
        const mapObj: Record<string, string[]> = {};
        let i = 0;
        for (const path of map.keys()) mapObj[String(i++)] = [path];
        form.append('map', JSON.stringify(mapObj));
        i = 0;
        for (const file of map.values()) form.append(String(i++), file);
        body = form;
      } else {
        fetchHeaders['Content-Type'] = 'application/json';
        body = JSON.stringify({ query: print(operation.query), variables: clone });
      }

      const token = localStorage.getItem('access_token');
      if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

      fetch(uri, { method: 'POST', headers: fetchHeaders, body })
        .then((res) => res.json())
        .then((json) => {
          observer.next(json);
          observer.complete();
        })
        .catch(observer.error.bind(observer));
    }),
  );
}

// ── Apollo Client ─────────────────────────────────────────────────────────────
export const apolloClient = new ApolloClient({
  link: createUploadLink(`${import.meta.env.VITE_API_URL}/graphql`),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'network-only' },
    query: { fetchPolicy: 'network-only' },
  },
});