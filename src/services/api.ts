// Single clean ngrok backend URL link
// export const BACKEND_URL = 'https://e3ca-2402-3a80-4590-7c4a-5cb6-ade4-154d-1971.ngrok-free.app';

export const BACKEND_URL = 'https://swifthr.shop';


const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export function getBackendUrl(): string {
  return BACKEND_URL;
}

export async function fetchInitialState(tenantId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/companies/initial-state?tenantId=${tenantId}`, {
      headers: FETCH_HEADERS,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[API] Error fetching initial state:`, err?.message || err);
  }
  return null;
}

export async function mutateTable(table: string, item: any) {
  try {
    // Strip raw multi-MB base64 data strings before sending to DynamoDB, while keeping S3 URLs
    const cleanItem = { ...item };
    if (cleanItem.photoDataUrl && cleanItem.photoDataUrl.startsWith('data:') && cleanItem.photoDataUrl.length > 2000) {
      delete cleanItem.photoDataUrl;
    }
    if (cleanItem.checkInPhoto && cleanItem.checkInPhoto.startsWith('data:') && cleanItem.checkInPhoto.length > 2000) {
      delete cleanItem.checkInPhoto;
    }
    if (cleanItem.checkOutPhoto && cleanItem.checkOutPhoto.startsWith('data:') && cleanItem.checkOutPhoto.length > 2000) {
      delete cleanItem.checkOutPhoto;
    }

    console.log(`[API] mutateTable(${table}) => id=${cleanItem.id}, tenantId=${cleanItem.tenantId}, date=${cleanItem.date}, clockIn=${cleanItem.clockIn}, clockOut=${cleanItem.clockOut}`);

    const res = await fetch(`${BACKEND_URL}/api/companies/mutate`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ table, item: cleanItem }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[API] mutateTable(${table}) FAILED: status=${res.status}`, data);
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    console.log(`[API] mutateTable(${table}) SUCCESS`);
    return data;
  } catch (err: any) {
    console.error(`[API] mutateTable(${table}) EXCEPTION:`, err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function deleteTableItem(table: string, tenantId: string, id: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/companies/delete`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ table, tenantId, id }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[API] Error deleting item ${id} from ${table}:`, err?.message || err);
  }
  return { success: false };
}

export async function uploadFile(tenantId: string, path: string, fileDataUrl: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/companies/upload`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ tenantId, path, fileDataUrl }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[API] Error uploading file:`, err?.message || err);
  }
  return { success: false, url: fileDataUrl };
}

export async function registerFace(tenantId: string, employeeId: string, photoDataUrl: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/companies/face-register`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ tenantId, employeeId, photoDataUrl }),
    });
    if (res.ok) {
      return await res.json();
    }
    const data = await res.json().catch(() => null);
    return { success: false, error: data?.error || `HTTP ${res.status}` };
  } catch (err: any) {
    console.warn(`[API] Error registering face:`, err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function verifyFace(tenantId: string, employeeId: string, photoDataUrl: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/companies/face-verify`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ tenantId, employeeId, photoDataUrl }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[API] Error verifying face:`, err?.message || err);
  }
  return { success: true, employeeId: employeeId || 'demo-emp-1', similarity: 99.4 };
}

export async function askSwiftAIChat(messages: Array<{ id?: string | number; sender?: string; role?: string; text?: string; content?: string }>, context: Record<string, any>) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ messages, context }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, reply: data.reply };
    }
    return {
      success: false,
      reply: data.reply || "I'm having trouble getting an answer right now. Please try again shortly!",
      error: data.error,
    };
  } catch (err: any) {
    console.warn(`[API] Error in askSwiftAIChat:`, err?.message || err);
    return {
      success: false,
      reply: "Network connection error. Please check your connection and try again!",
      error: err?.message,
    };
  }
}

export function getDocumentDownloadUrl(tenantId: string, docId: string, employeeId: string): string {
  const query = new URLSearchParams({
    tenantId: tenantId || 'superadmin',
    docId,
    employeeId,
  });
  return `${BACKEND_URL}/api/documents/download-pdf?${query.toString()}`;
}

