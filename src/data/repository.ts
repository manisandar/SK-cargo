import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSubName,
  ParcelWithDetails,
  ParcelPhoto,
  BoxWithDetails,
  CourierWithDetails,
  StatusHistory,
  ParcelStatus,
  CourierStatus,
  StaffUser,
  CreateStaffUserInput,
  UpdateStaffUserInput,
  EnrichedStatusHistory,
  AdminKPIData,
  CustomerMergeResult,
} from '../types';

export interface CreatePackageItemInput {
  item_name?: string;
  sub_name_id: string | null;
  name_on_parcel: string;
  qty: number;
  weight_per_piece_kg: number;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  photos?: Blob[];
}

export interface CreateParcelInput {
  customer_id: string;
  received_at: string;
  status?: ParcelStatus;
  items: CreatePackageItemInput[];
}

export interface ParcelFilters {
  status?: ParcelStatus;
  query?: string;
  customerId?: string;
}

export interface IRepository {
  // Auth & Staff Management
  getCurrentUser(): Promise<StaffUser | null>;
  login(username: string, password?: string): Promise<StaffUser>;
  logout(): Promise<void>;
  getStaffUsers(): Promise<StaffUser[]>;
  createStaffUser(input: CreateStaffUserInput): Promise<StaffUser>;
  updateStaffUser(id: string, input: UpdateStaffUserInput): Promise<StaffUser>;
  deleteStaffUser(id: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  findSimilarCustomers(query: string): Promise<Customer[]>;
  createCustomer(data: CreateCustomerInput): Promise<Customer>;
  updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  getNextCustomerCode(): Promise<string>;
  mergeCustomers(sourceCustomerId: string, targetCustomerId: string, userId: string): Promise<CustomerMergeResult>;

  // Sub Names
  getSubNamesByCustomerId(customerId: string): Promise<CustomerSubName[]>;
  createSubName(customerId: string, name: string): Promise<CustomerSubName>;

  // Parcels
  getParcels(filters?: ParcelFilters): Promise<ParcelWithDetails[]>;
  getParcelById(id: string): Promise<ParcelWithDetails | null>;
  getParcelByCode(code: string): Promise<ParcelWithDetails | null>;
  createParcel(input: CreateParcelInput, userId: string): Promise<ParcelWithDetails>;
  createParcelBatch(inputs: CreateParcelInput[], userId: string): Promise<ParcelWithDetails[]>;
  addPackageItemToParcel(parcelId: string, item: CreatePackageItemInput, userId: string): Promise<ParcelWithDetails>;
  updateParcelStatus(parcelId: string, toStatus: ParcelStatus, userId: string, note?: string): Promise<ParcelWithDetails>;
  markParcelAsReturned(parcelId: string, userId: string, note?: string): Promise<ParcelWithDetails>;
  deleteParcel(parcelId: string, deleteCustomerIfUnused?: boolean): Promise<{ parcelDeleted: boolean; customerDeleted: boolean }>;
  updateParcelDetails(
    parcelId: string,
    data: {
      customer_id?: string;
      received_at?: string;
      status?: ParcelStatus;
    },
    userId: string
  ): Promise<ParcelWithDetails>;
  updateParcelItemDetails(
    itemId: string,
    data: {
      item_name?: string;
      sub_name_id?: string | null;
      name_on_parcel?: string;
      qty?: number;
      weight_per_piece_kg?: number;
      weight_kg?: number;
      length_cm?: number;
      width_cm?: number;
      height_cm?: number;
      new_photos?: Blob[];
    },
    userId: string
  ): Promise<ParcelWithDetails>;
  getNextParcelCode(): Promise<string>;

  // Photos
  getPhotosByParcelId(parcelId: string): Promise<ParcelPhoto[]>;
  addParcelPhoto(parcelId: string, parcelItemId: string | null, blob: Blob): Promise<ParcelPhoto>;
  deleteParcelPhoto(photoId: string): Promise<void>;

  // Boxes (Repacking)
  getBoxes(): Promise<BoxWithDetails[]>;
  getBoxById(id: string): Promise<BoxWithDetails | null>;
  getBoxByCode(code: string): Promise<BoxWithDetails | null>;
  createBox(userId: string): Promise<BoxWithDetails>;
  addParcelItemPiecesToBox(boxId: string, parcelId: string, parcelItemId: string, qty: number, userId: string): Promise<void>;
  removeParcelItemPiecesFromBox(boxId: string, boxItemId: string, userId: string): Promise<void>;
  deleteBox(boxId: string, userId: string): Promise<void>;
  getNextBoxCode(): Promise<string>;
  addBoxPhotos(boxId: string, photos: Blob[], userId?: string): Promise<BoxWithDetails>;
  deleteBoxPhoto(photoId: string): Promise<void>;

  // Couriers
  getCouriers(): Promise<CourierWithDetails[]>;
  getCourierById(id: string): Promise<CourierWithDetails | null>;
  createCourier(data: { truck_no: string; dispatch_date?: string }, userId: string): Promise<CourierWithDetails>;
  updateCourierTruckNo(courierId: string, truckNo: string, userId: string): Promise<CourierWithDetails>;
  deleteCourier(courierId: string, userId: string): Promise<void>;
  addBoxToCourier(courierId: string, boxId: string, userId: string): Promise<void>;
  removeBoxFromCourier(courierId: string, boxId: string, userId: string): Promise<void>;
  addLooseParcelItemPiecesToCourier(courierId: string, parcelId: string, parcelItemId: string, qty: number, userId: string): Promise<void>;
  removeLooseParcelItemPiecesFromCourier(courierId: string, itemId: string, userId: string): Promise<void>;
  updateCourierStatus(courierId: string, toStatus: CourierStatus, userId: string, note?: string): Promise<CourierWithDetails>;
  getNextCourierCode(): Promise<string>;
  addCourierPhotos(courierId: string, photos: Blob[], userId?: string): Promise<CourierWithDetails>;
  deleteCourierPhoto(photoId: string): Promise<void>;

  // Status History & Audit Logs
  getStatusHistory(entityType: 'parcel' | 'box' | 'courier' | 'customer', entityId: string): Promise<StatusHistory[]>;
  getAllStatusHistory(filters?: { entityType?: string; staffId?: string; dateFrom?: string; dateTo?: string; limit?: number }): Promise<EnrichedStatusHistory[]>;
  logStatusChange(entry: Omit<StatusHistory, 'id' | 'changed_at'>): Promise<StatusHistory>;

  // Admin Dashboard KPIs
  getAdminKPIs(dateRange?: { from?: string; to?: string }): Promise<AdminKPIData>;

  // Maintenance & Seed
  seedInitialData(force?: boolean): Promise<void>;
  resetDatabase(): Promise<void>;
  resetToSampleData(): Promise<void>;
}
