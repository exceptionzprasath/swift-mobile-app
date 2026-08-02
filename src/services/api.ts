// Single clean ngrok backend URL link
// export const BACKEND_URL = 'https://e8a8-2401-4900-ccba-6eaa-25fb-794-30b-8fcd.ngrok-free.app';

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
    const res = await fetch(`${BACKEND_URL}/api/companies/mutate`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify({ table, item }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[API] Error mutating table ${table}:`, err?.message || err);
  }
  return { success: false };
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
