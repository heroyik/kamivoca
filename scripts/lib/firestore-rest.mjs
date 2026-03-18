import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { getFirebaseWebConfig } from "./firebase-env.mjs";

function getCliAuthPath() {
  return resolve(homedir(), ".config/configstore/firebase-tools.json");
}

export function getFirebaseCliAccessToken() {
  const authPath = getCliAuthPath();
  if (!existsSync(authPath)) {
    throw new Error(`Firebase CLI auth not found: ${authPath}. Run "firebase login" first.`);
  }

  const authState = JSON.parse(readFileSync(authPath, "utf8"));
  const accessToken = authState?.tokens?.access_token;
  if (!accessToken) {
    throw new Error(`Missing Firebase CLI access token in ${authPath}. Run "firebase login" first.`);
  }
  return accessToken;
}

function getProjectId() {
  return getFirebaseWebConfig().config.projectId;
}

function getDocumentsBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function getIdentityToolkitBaseUrl() {
  return `https://identitytoolkit.googleapis.com/v1/projects/${getProjectId()}`;
}

async function googleJson(url, options = {}) {
  const accessToken = getFirebaseCliAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 404) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return data;
}

export function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "boolean":
      return { booleanValue: value };
    case "number":
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case "object": {
      const fields = {};
      for (const [key, item] of Object.entries(value)) {
        fields[key] = toFirestoreValue(item);
      }
      return { mapValue: { fields } };
    }
    default:
      throw new Error(`Unsupported Firestore value type: ${typeof value}`);
  }
}

export function fromFirestoreValue(field) {
  if (!field) return undefined;
  if ("nullValue" in field) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("booleanValue" in field) return field.booleanValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("timestampValue" in field) return field.timestampValue;
  if ("arrayValue" in field) return (field.arrayValue.values || []).map((value) => fromFirestoreValue(value));
  if ("mapValue" in field) {
    const result = {};
    for (const [key, value] of Object.entries(field.mapValue.fields || {})) {
      result[key] = fromFirestoreValue(value);
    }
    return result;
  }
  return field;
}

export function documentToObject(document) {
  const result = {};
  for (const [key, value] of Object.entries(document.fields || {})) {
    result[key] = fromFirestoreValue(value);
  }
  return result;
}

export async function getDocument(path) {
  const document = await googleJson(`${getDocumentsBaseUrl()}/${path}`);
  return document ? { ...documentToObject(document), id: path.split("/").at(-1), _name: document.name } : null;
}

export async function listDocuments(path, { pageSize = 1000 } = {}) {
  const documents = [];
  let pageToken = "";

  while (true) {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await googleJson(`${getDocumentsBaseUrl()}/${path}?${params.toString()}`);
    const batch = payload?.documents || [];
    documents.push(...batch.map((document) => ({
      ...documentToObject(document),
      id: document.name.split("/").at(-1),
      _name: document.name,
    })));
    if (!payload?.nextPageToken) break;
    pageToken = payload.nextPageToken;
  }

  return documents;
}

export async function runCollectionQuery(collectionId, fieldPath, op, value) {
  const payload = await googleJson(`${getDocumentsBaseUrl()}:runQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op,
            value: toFirestoreValue(value),
          },
        },
      },
    }),
  });

  return (payload || [])
    .map((item) => item.document)
    .filter(Boolean)
    .map((document) => ({
      ...documentToObject(document),
      id: document.name.split("/").at(-1),
      _name: document.name,
    }));
}

export async function commitWrites(writes) {
  return googleJson(`${getDocumentsBaseUrl()}:commit`, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });
}

export async function batchDelete(documentPaths) {
  if (documentPaths.length === 0) return 0;
  let deleted = 0;
  for (let index = 0; index < documentPaths.length; index += 400) {
    const part = documentPaths.slice(index, index + 400);
    await commitWrites(part.map((path) => ({
      delete: `projects/${getProjectId()}/databases/(default)/documents/${path}`,
    })));
    deleted += part.length;
  }
  return deleted;
}

export async function batchSet(collectionName, entries, { merge = false, serverTimestampFields = [] } = {}) {
  if (entries.length === 0) return 0;
  let written = 0;
  for (let index = 0; index < entries.length; index += 400) {
    const part = entries.slice(index, index + 400);
    const writes = part.map(({ id, data }) => {
      const fieldTransforms = serverTimestampFields.map((fieldPath) => ({
        fieldPath,
        setToServerValue: "REQUEST_TIME",
      }));
      return {
        update: {
          name: `projects/${getProjectId()}/databases/(default)/documents/${collectionName}/${id}`,
          fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])),
        },
        ...(merge ? { updateMask: { fieldPaths: Object.keys(data) } } : {}),
        ...(fieldTransforms.length > 0 ? { updateTransforms: fieldTransforms } : {}),
      };
    });
    await commitWrites(writes);
    written += part.length;
  }
  return written;
}

export async function lookupAuthUserByEmail(email) {
  const payload = await googleJson(`${getIdentityToolkitBaseUrl()}/accounts:lookup`, {
    method: "POST",
    body: JSON.stringify({ email: [email] }),
  });
  return payload?.users?.[0] || null;
}
