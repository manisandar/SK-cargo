import Dexie, { type EntityTable } from 'dexie';
import {
  Customer,
  CustomerSubName,
  Parcel,
  ParcelItem,
  ParcelPhoto,
  Box,
  BoxItem,
  BoxPhoto,
  Courier,
  CourierLooseItem,
  CourierPhoto,
  StatusHistory,
  StaffUser,
} from '../types';

export class SKCargoDatabase extends Dexie {
  customers!: EntityTable<Customer, 'id'>;
  customer_sub_names!: EntityTable<CustomerSubName, 'id'>;
  parcels!: EntityTable<Parcel, 'id'>;
  parcel_items!: EntityTable<ParcelItem, 'id'>;
  parcel_photos!: EntityTable<ParcelPhoto, 'id'>;
  boxes!: EntityTable<Box, 'id'>;
  box_items!: EntityTable<BoxItem, 'id'>;
  box_photos!: EntityTable<BoxPhoto, 'id'>;
  couriers!: EntityTable<Courier, 'id'>;
  courier_loose_items!: EntityTable<CourierLooseItem, 'id'>;
  courier_photos!: EntityTable<CourierPhoto, 'id'>;
  status_history!: EntityTable<StatusHistory, 'id'>;
  staff_users!: EntityTable<StaffUser, 'id'>;

  constructor() {
    super('SKCargoDB');

    this.version(4).stores({
      customers: 'id, code, name, phone, created_at',
      customer_sub_names: 'id, customer_id, name',
      parcels: 'id, parcel_code, customer_id, status, received_at, created_at',
      parcel_items: 'id, parcel_id, item_index, sub_name_id, created_at',
      parcel_photos: 'id, parcel_id, parcel_item_id, created_at',
      boxes: 'id, box_code, status, courier_id, created_at',
      box_items: 'id, box_id, parcel_id, parcel_item_id, created_at',
      couriers: 'id, courier_code, truck_no, status, dispatch_date, created_at',
      courier_loose_items: 'id, courier_id, parcel_id, parcel_item_id, created_at',
      status_history: 'id, [entity_type+entity_id], entity_id, changed_at',
      staff_users: 'id, username, role',
    });

    this.version(5).stores({
      box_photos: 'id, box_id, created_at',
      courier_photos: 'id, courier_id, created_at',
    });
  }
}

export const db = new SKCargoDatabase();
