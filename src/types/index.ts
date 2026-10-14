export type Role = 'admin' | 'officer';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Filter values understood by the search_cases / get_case_stats RPCs. */
export type CaseStatus = 'complete' | 'incomplete' | 'skipped';

export interface CaseRow {
  id: string;
  sequence_number: number;
  accused_name: string;
  court_id: string;
  court_name: string;
  black_case_number: string | null;
  red_case_number: string | null;
  is_complete: boolean;
  is_skipped: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CaseStats {
  total: number;
  complete: number;
  incomplete: number;
  skipped: number;
}

export interface CourtStats extends CaseStats {
  court_id: string;
  court_name: string;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: 'case' | 'court' | 'user';
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

export interface CaseSearchParams {
  query?: string;
  courtId?: string | null;
  status?: CaseStatus | null;
  deletedOnly?: boolean;
}
