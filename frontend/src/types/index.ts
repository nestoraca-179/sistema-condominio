export type Role = 'superadmin' | 'admin' | 'accountant' | 'resident';
export type Currency = 'VES' | 'USD';
export type FeeType = 'ordinary' | 'extraordinary';
export type DebtStatus = 'pending' | 'partial' | 'paid' | 'waived';
export type BuildingType = 'sector' | 'building' | 'tower';
export type NoticeTargetType = 'all' | 'sector' | 'building' | 'unit';

export interface User {
  id: string;
  username?: string;
  email: string;
  full_name: string;
  phone?: string;
  role: Role;
  condominium_id?: string;
  condominium?: Condominium;
  unit_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Condominium {
  id: string;
  name: string;
  rif: string;
  address: string;
  admin_user_id?: string;
  admin_user?: User;
  is_active: boolean;
  created_at: string;
}

export interface Building {
  id: string;
  condominium_id: string;
  name: string;
  type: BuildingType;
  parent_id?: string;
  parent?: Building;
  order_index: number;
}

export interface Unit {
  id: string;
  building_id: string;
  building?: Building;
  unit_number: string;
  floor?: string;
  owner_id?: string;
  owner?: User;
  is_occupied: boolean;
  created_at: string;
}

export interface Fee {
  id: string;
  condominium_id: string;
  name: string;
  type: FeeType;
  currency: Currency;
  amount_ves: number;
  amount_original: number;
  exchange_rate: number;
  due_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  unit_id: string;
  unit?: Unit;
  fee_id?: string;
  fee?: Fee;
  amount_ves: number;
  amount_original: number;
  currency: Currency;
  exchange_rate: number;
  payment_date: string;
  reference?: string;
  registered_by?: string;
  registeredByUser?: User;
  notes?: string;
  created_at: string;
}

export interface Debt {
  id: string;
  unit_id: string;
  unit?: Unit;
  fee_id: string;
  fee?: Fee;
  original_amount_ves: number;
  late_fee_ves: number;
  paid_amount_ves: number;
  status: DebtStatus;
  due_date: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  rate: number;
  effective_date: string;
  registered_by?: string;
  registeredByUser?: User;
  created_at: string;
}

export interface Notice {
  id: string;
  condominium_id: string;
  title: string;
  content: string;
  target_type: NoticeTargetType;
  target_id?: string;
  sent_by_email: boolean;
  sentByUser?: User;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
