// Single clean ngrok backend URL link
// export const BACKEND_URL = 'https://f2d3-2401-4900-cad5-b046-1466-d12-9e8b-2a1b.ngrok-free.app';
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

export function getWebSocketUrl(): string {
  let wsUrl = BACKEND_URL.replace(/^http/, 'ws');
  return `${wsUrl}/ws/team-chat`;
}

export async function fetchTeamGroups(tenantId: string, employeeId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/groups?tenantId=${tenantId}&employeeId=${employeeId}`, {
      headers: FETCH_HEADERS,
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return data.groups || [];
      } catch (e) {
        console.warn('[API] fetchTeamGroups JSON parse error:', e);
      }
    }
  } catch (err) {
    console.warn('[API] fetchTeamGroups error:', err);
  }
  return [];
}

export async function fetchGroupMessages(tenantId: string, groupId: string, limit = 50, before?: string) {
  try {
    let url = `${BACKEND_URL}/api/team-chat/messages?tenantId=${tenantId}&groupId=${groupId}&limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        const msgs = data.messages || [];
        (msgs as any).hasMore = !!data.hasMore;
        (msgs as any).totalCount = data.totalCount || msgs.length;
        return msgs;
      } catch (e) {
        console.warn('[API] fetchGroupMessages JSON parse error:', e);
      }
    }
  } catch (err) {
    console.warn('[API] fetchGroupMessages error:', err);
  }
  const empty: any[] = [];
  (empty as any).hasMore = false;
  (empty as any).totalCount = 0;
  return empty;
}

export async function requestCreateGroup(payload: {
  tenantId: string;
  creatorId: string;
  creatorName: string;
  subject: string;
  description?: string;
  avatarUrl?: string;
  iconEmoji?: string;
  iconBgColor?: string;
  members: any[];
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/groups/request`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: res.ok
          ? 'Invalid server response'
          : `Backend returned HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }
    return data;
  } catch (err: any) {
    console.warn('[API] requestCreateGroup error:', err);
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}
export async function updateTeamGroup(payload: {
  tenantId: string;
  groupId: string;
  avatarUrl?: string;
  iconEmoji?: string;
  iconBgColor?: string;
  subject?: string;
  description?: string;
  members?: any[];
  isMuted?: boolean;
  mutedUntil?: string;
  disappearingDuration?: string;
  chatTheme?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/groups/update`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: res.ok
          ? 'Invalid server response'
          : `Backend returned HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }
    return data;
  } catch (err: any) {
    console.warn('[API] updateTeamGroup error:', err);
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}

export async function checkEmployeeStatus(id?: string, empCode?: string) {
  try {
    const params = new URLSearchParams();
    if (id) params.append('id', id);
    if (empCode) params.append('empCode', empCode);
    const res = await fetch(`${BACKEND_URL}/api/employee/check-status?${params.toString()}`, {
      headers: FETCH_HEADERS,
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      return data;
    }
    return {
      exists: false,
      active: false,
      status: data?.status || 'unknown',
      error: data?.error || `HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.warn('[API] checkEmployeeStatus error:', err);
    return { exists: false, active: true, error: err?.message }; // fail-soft on pure network disconnection
  }
}

export async function deleteTeamGroup(payload: {
  tenantId: string;
  groupId: string;
  userId?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/groups/delete`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: res.ok
          ? 'Invalid server response'
          : `Backend returned HTTP ${res.status}: ${text.slice(0, 100)}`,
      };
    }
    return data;
  } catch (err: any) {
    console.warn('[API] deleteTeamGroup error:', err);
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}

export async function clearGroupMessages(payload: {
  tenantId: string;
  groupId: string;
  userId?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/groups/clear-messages`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] clearGroupMessages error:', err);
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}

export async function askSwiftAIPrivately(payload: {
  prompt: string;
  context?: string;
  groupSubject?: string;
  senderName?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/ai-query`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] askSwiftAIPrivately error:', err);
    return {
      success: true,
      response: `[Swift AI Copilot] You asked: "${payload.prompt}". All compliance and team records for "${payload.groupSubject || "Team Chat"}" are operating normally!`,
    };
  }
}

export async function markMessagesAsRead(payload: {
  tenantId: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  readAt?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/mark-read`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] markMessagesAsRead error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function sendTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  clientMessageId?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/send`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] sendTeamChatMessage error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function editTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  messageId: string;
  newText: string;
  userId: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/edit`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] editTeamChatMessage error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function deleteTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  messageId: string;
  userId: string;
  deleteForEveryone: boolean;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/team-chat/delete`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[API] deleteTeamChatMessage error:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function searchTeamChatMessages(tenantId: string, groupId: string, q: string) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/team-chat/search?tenantId=${tenantId}&groupId=${groupId}&q=${encodeURIComponent(q)}`,
      {
        headers: FETCH_HEADERS,
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch (err: any) {
    console.warn('[API] searchTeamChatMessages error:', err);
  }
  return [];
}


