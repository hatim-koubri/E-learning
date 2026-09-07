export type MeetingAccess = {
  roomName: string;
  baseUrl: string;
  displayName: string;
  moderator: boolean;
};

const STORAGE_KEY = "nexalearn_meeting_access";

export function openMeeting(access: MeetingAccess, returnTo: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({...access, returnTo}));
  window.location.assign("/meeting");
}

export function consumeMeeting(): (MeetingAccess & {returnTo: string}) | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    sessionStorage.removeItem(STORAGE_KEY);
    return value;
  } catch {
    return null;
  }
}
