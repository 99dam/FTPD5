/**
 * In-memory drafts of case numbers typed on the record page.
 * Survives re-renders, refetches and in-app navigation so that a failed save
 * (e.g. network error) never loses what the officer typed. Deliberately not
 * persisted to browser storage; cleared on sign-out.
 */
export interface CaseNumberDraft {
  black: string;
  red: string;
}

const drafts = new Map<string, CaseNumberDraft>();

export function getDraft(caseId: string): CaseNumberDraft | undefined {
  return drafts.get(caseId);
}

export function setDraft(caseId: string, draft: CaseNumberDraft) {
  drafts.set(caseId, draft);
}

export function clearDraft(caseId: string) {
  drafts.delete(caseId);
}

export function clearAllDrafts() {
  drafts.clear();
}
