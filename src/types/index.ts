export type UserRole = 'staff' | 'admin';

export interface StaffUser {
  id: string; // UUID
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface CreateStaffUserInput {
  username: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface UpdateStaffUserInput {
  username?: string;
  name?: string;
  role?: UserRole;
  password?: string;
  is_active?: boolean;
}

export interface Customer {
  id: string; // UUID
  code: string; // e.g. SK-0001
  name: string;
  phone?: string | null;
  alt_name?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string; // ISO
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  alt_name?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string | null;
  alt_name?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerSubName {
  id: string; // UUID
  customer_id: string; // UUID
  name: string;
}

export type ParcelStatus =
  | 'stored'
  | 'packed'
  | 'in_transit'
  | 'delivered'
  | 'to_be_returned'
  | 'returned';

/**
 * An individual package item within a received parcel lot.
 * One receive input creates ONE parcel (e.g. P-0001) containing 1 or more parcel items.
 */
export interface ParcelItem {
  id: string; // UUID
  parcel_id: string; // UUID of parent parcel
  item_index: number; // 1, 2, ...
  item_name?: string; // Description of item e.g. Book, Shirt, Clothes
  sub_name_id: string | null; // null = same as customer
  name_on_parcel: string;
  qty: number; // pieces in this package
  weight_per_piece_kg: number;
  weight_kg: number; // qty * weight_per_piece_kg
  length_cm: number;
  width_cm: number;
  height_cm: number;
  created_at: string;
}

export interface ParcelItemPhoto {
  id: string;
  url: string;
}

export interface ParcelItemWithDetails extends ParcelItem {
  sub_name?: CustomerSubName | null;
  photos_count: number;
  photo_urls?: string[];
  photos?: ParcelItemPhoto[];
  stored_qty: number;
  packed_qty: number;
  in_transit_qty: number;
  delivered_qty: number;
  locations?: ParcelStatusLocation[];
}

/**
 * A Parcel represents ONE received group/lot per input.
 * If 1 package was entered, it contains 1 item.
 * If multiple packages were entered under one name, they are logged in this ONE parcel.
 */
export interface Parcel {
  id: string; // UUID
  parcel_code: string; // e.g. P-0001
  customer_id: string; // UUID
  received_at: string; // date editable, time auto
  total_qty: number; // sum of all item quantities
  total_weight_kg: number; // sum of all item weights
  status: ParcelStatus; // primary calculated status: stored | packed | in_transit | delivered
  created_by: string; // UUID of user
  created_at?: string; // ISO
}

export interface ParcelPhoto {
  id: string; // UUID
  parcel_id: string; // UUID
  parcel_item_id?: string | null; // UUID of specific package item
  blob: Blob;
  created_at: string; // ISO
}

export interface Box {
  id: string; // UUID
  box_code: string; // e.g. B-001
  status: 'active' | 'in_transit' | 'delivered';
  courier_id?: string | null; // null until loaded on courier run
  created_by: string; // UUID
  created_at: string; // ISO
}

export interface BoxItem {
  id: string; // UUID
  box_id: string; // UUID
  parcel_id: string; // UUID
  parcel_item_id: string; // UUID of specific parcel item
  qty: number; // number of pieces from this parcel item in this box
  created_at: string; // ISO
}

export type CourierStatus = 'draft' | 'in_transit' | 'delivered';

export interface Courier {
  id: string; // UUID
  courier_code: string; // e.g. CR-001
  truck_no: string; // e.g. 7D-4521
  dispatch_date: string; // YYYY-MM-DD
  status: CourierStatus;
  created_by: string; // UUID
  created_at: string; // ISO
}

export interface CourierLooseItem {
  id: string; // UUID
  courier_id: string; // UUID
  parcel_id: string; // UUID
  parcel_item_id: string; // UUID
  qty: number; // number of loose pieces from this parcel item on this truck
  created_at: string; // ISO
}

export interface StatusHistory {
  id: string; // UUID
  entity_type: 'parcel' | 'box' | 'courier' | 'customer';
  entity_id: string; // UUID
  from_status: string | null;
  to_status: string;
  note?: string | null;
  changed_by: string; // UUID
  changed_at: string; // ISO
}

export interface EnrichedStatusHistory extends StatusHistory {
  changed_by_name: string;
  entity_label?: string;
}

export interface DailyVolumeTrend {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Nov 11"
  pieces: number;
  weightKg: number;
  lotsCount: number;
}

export interface AdminKPIData {
  intakeCount: number; // lots received
  intakePieces: number; // total pcs received in period
  intakeWeightKg: number; // total weight kg received in period
  storedParcelsCount: number;
  storedPieces: number;
  storedWeightKg: number;
  inTransitParcelsCount: number;
  inTransitBoxesCount: number;
  inTransitWeightKg: number;
  activeTrucksCount: number;
  deliveredParcelsCount: number;
  deliveredPieces: number;
  deliveredWeightKg: number;
  toBeReturnedCount: number;
  toBeReturnedPieces: number;
  toBeReturnedWeightKg: number;
  returnedCount: number;
  returnedPieces: number;
  returnedWeightKg: number;
  dailyTrends: DailyVolumeTrend[];
  topCustomers: {
    id: string;
    name: string;
    code: string;
    parcelsCount: number;
    piecesCount: number;
    totalWeightKg: number;
  }[];
  activeCouriers: CourierWithDetails[];
}

export interface CustomerMergeResult {
  targetCustomer: Customer;
  parcelsMovedCount: number;
  subNamesMovedCount: number;
}

/**
 * Rich join types for UI display
 */
export interface ParcelStatusLocation {
  type: 'box' | 'courier';
  id: string;
  code: string; // e.g. B-001 or CR-001
  label: string; // e.g. "B-001" or "Truck: 7D-4521"
  item_name: string; // package name on parcel
  qty: number;
  status: 'packed' | 'in_transit' | 'delivered';
}

export interface ParcelStatusBreakdown {
  stored_qty: number;
  packed_qty: number;
  in_transit_qty: number;
  delivered_qty: number;
  locations: ParcelStatusLocation[];
}

export interface ParcelWithDetails extends Parcel {
  customer?: Customer;
  items: ParcelItemWithDetails[];
  photos_count: number;
  breakdown: ParcelStatusBreakdown;
}

export interface BoxItemWithParcel {
  id: string; // box_item id
  parcel_id: string;
  parcel_item_id: string;
  parcel: ParcelWithDetails;
  item: ParcelItemWithDetails;
  qty: number;
  weight_kg: number;
}

export interface BoxPhoto {
  id: string; // UUID
  box_id: string; // UUID
  blob: Blob;
  created_at: string; // ISO
}

export interface BoxPhotoWithUrl extends BoxPhoto {
  url: string; // Object URL
}

export interface BoxWithDetails extends Box {
  parcels_count: number; // number of distinct packages in box
  total_pieces: number; // sum of qty
  total_weight_kg: number;
  courier?: Courier | null;
  items: BoxItemWithParcel[];
  photos?: BoxPhotoWithUrl[];
  photo_urls?: string[];
}

export interface CourierPhoto {
  id: string; // UUID
  courier_id: string; // UUID
  blob: Blob;
  created_at: string; // ISO
}

export interface CourierPhotoWithUrl extends CourierPhoto {
  url: string; // Object URL
}

export interface CourierLooseItemWithParcel {
  id: string; // courier_loose_item id
  parcel_id: string;
  parcel_item_id: string;
  parcel: ParcelWithDetails;
  item: ParcelItemWithDetails;
  qty: number;
  weight_kg: number;
}

export interface CourierWithDetails extends Courier {
  boxes: BoxWithDetails[];
  loose_items: CourierLooseItemWithParcel[];
  total_boxes_count: number;
  total_pieces_count: number;
  total_weight_kg: number;
  photos?: CourierPhotoWithUrl[];
  photo_urls?: string[];
}
