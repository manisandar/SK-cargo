import {
  Customer,
  CustomerSubName,
  Parcel,
  Box,
  Courier,
  StaffUser,
} from '../types';

export const SEED_USERS: StaffUser[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'staff1',
    password: 'staff123',
    name: 'Aung Ko (Warehouse Floor)',
    role: 'staff',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'staff2',
    password: 'staff123',
    name: 'May Zin (Receiving Dock)',
    role: 'staff',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    username: 'admin',
    password: 'admin123',
    name: 'Supervisor Dave',
    role: 'admin',
  },
];

// Start with clean empty database (no sample parcels, boxes, or couriers)
export const SEED_CUSTOMERS: Customer[] = [];
export const SEED_SUB_NAMES: CustomerSubName[] = [];
export const SEED_BOXES: Box[] = [];
export const SEED_COURIERS: Courier[] = [];
export const SEED_PARCELS: Parcel[] = [];
