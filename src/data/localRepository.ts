import { db } from './db';
import {
  IRepository,
  CreateParcelInput,
  CreatePackageItemInput,
  ParcelFilters,
} from './repository';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSubName,
  Parcel,
  ParcelItem,
  ParcelItemWithDetails,
  ParcelWithDetails,
  ParcelPhoto,
  Box,
  BoxWithDetails,
  BoxItemWithParcel,
  BoxPhotoWithUrl,
  Courier,
  CourierWithDetails,
  CourierLooseItemWithParcel,
  CourierPhotoWithUrl,
  StatusHistory,
  ParcelStatus,
  CourierStatus,
  StaffUser,
  CreateStaffUserInput,
  UpdateStaffUserInput,
  EnrichedStatusHistory,
  AdminKPIData,
  CustomerMergeResult,
  ParcelStatusBreakdown,
  ParcelStatusLocation,
} from '../types';
import {
  SEED_USERS,
  SEED_CUSTOMERS,
  SEED_SUB_NAMES,
  SEED_BOXES,
  SEED_COURIERS,
  SEED_PARCELS,
} from './seedData';
import { getTodayIsoDate } from '../utils/date';

// SSR / Node safe localStorage helper
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

export class LocalRepository implements IRepository {
  private currentUserId: string | null = null;

  constructor() {
    this.currentUserId = safeStorage.getItem('sk_cargo_user_id');
  }

  // ----------------------------------------------------
  // Auth
  // ----------------------------------------------------
  async getCurrentUser(): Promise<StaffUser | null> {
    if (!this.currentUserId) return null;
    const user = await db.staff_users.get(this.currentUserId);
    return user || null;
  }

  async login(username: string, password?: string): Promise<StaffUser> {
    const user = await db.staff_users.where('username').equals(username.trim()).first();
    if (!user) {
      throw new Error('User not found');
    }
    if (user.password && password && user.password !== password) {
      throw new Error('Invalid credentials');
    }
    if (user.is_active === false) {
      throw new Error('This account has been deactivated. Please contact an administrator.');
    }

    this.currentUserId = user.id;
    safeStorage.setItem('sk_cargo_user_id', user.id);
    return user;
  }

  async logout(): Promise<void> {
    this.currentUserId = null;
    safeStorage.removeItem('sk_cargo_user_id');
  }

  async getStaffUsers(): Promise<StaffUser[]> {
    return db.staff_users.toArray();
  }

  async createStaffUser(input: CreateStaffUserInput): Promise<StaffUser> {
    const existing = await db.staff_users.where('username').equals(input.username.trim().toLowerCase()).first();
    if (existing) {
      throw new Error(`Username "${input.username}" is already taken.`);
    }

    const newUser: StaffUser = {
      id: crypto.randomUUID(),
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      password: input.password || '123456',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await db.staff_users.add(newUser);
    return newUser;
  }

  async updateStaffUser(id: string, input: UpdateStaffUserInput): Promise<StaffUser> {
    const user = await db.staff_users.get(id);
    if (!user) throw new Error('Staff user not found');

    if (input.username && input.username.trim().toLowerCase() !== user.username) {
      const existing = await db.staff_users.where('username').equals(input.username.trim().toLowerCase()).first();
      if (existing && existing.id !== id) {
        throw new Error(`Username "${input.username}" is already taken.`);
      }
    }

    const updates: Partial<StaffUser> = {};
    if (input.username) updates.username = input.username.trim().toLowerCase();
    if (input.name) updates.name = input.name.trim();
    if (input.role) updates.role = input.role;
    if (input.password) updates.password = input.password;
    if (typeof input.is_active === 'boolean') updates.is_active = input.is_active;

    await db.staff_users.update(id, updates);
    return (await db.staff_users.get(id))!;
  }

  async deleteStaffUser(id: string): Promise<void> {
    if (id === this.currentUserId) {
      throw new Error('Cannot delete your own currently logged-in account.');
    }
    const user = await db.staff_users.get(id);
    if (!user) throw new Error('Staff user not found');
    await db.staff_users.delete(id);
  }

  // ----------------------------------------------------
  // Customers
  // ----------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    return db.customers.orderBy('created_at').reverse().toArray();
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const customer = await db.customers.get(id);
    return customer || null;
  }

  async findSimilarCustomers(query: string): Promise<Customer[]> {
    const cleaned = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleaned) return [];

    const all = await db.customers.toArray();
    return all.filter((c) => {
      const target = c.name.trim().toLowerCase().replace(/\s+/g, ' ');
      return target === cleaned;
    });
  }

  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    const code = await this.getNextCustomerCode();
    const customer: Customer = {
      id: crypto.randomUUID(),
      code,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      alt_name: data.alt_name?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
    };
    await db.customers.add(customer);
    return customer;
  }

  async updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
    const customer = await db.customers.get(id);
    if (!customer) throw new Error('Customer not found');

    const updated: Customer = {
      ...customer,
      name: data.name !== undefined ? data.name.trim() : customer.name,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : customer.phone,
      alt_name: data.alt_name !== undefined ? (data.alt_name?.trim() || null) : customer.alt_name,
      address: data.address !== undefined ? (data.address?.trim() || null) : customer.address,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : customer.notes,
    };
    await db.customers.put(updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    const parcels = await db.parcels.where('customer_id').equals(id).toArray();
    if (parcels.length > 0) {
      throw new Error('Cannot delete customer with active parcel shipments');
    }
    await db.transaction('rw', [db.customers, db.customer_sub_names], async () => {
      await db.customer_sub_names.where('customer_id').equals(id).delete();
      await db.customers.delete(id);
    });
  }

  async getNextCustomerCode(): Promise<string> {
    const customers = await db.customers.toArray();
    let max = 0;
    for (const c of customers) {
      const match = c.code.match(/SK-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `SK-${String(max + 1).padStart(4, '0')}`;
  }

  async mergeCustomers(
    sourceCustomerId: string,
    targetCustomerId: string,
    userId: string
  ): Promise<CustomerMergeResult> {
    if (sourceCustomerId === targetCustomerId) {
      throw new Error('Cannot merge a customer into itself.');
    }

    const source = await db.customers.get(sourceCustomerId);
    const target = await db.customers.get(targetCustomerId);
    if (!source || !target) {
      throw new Error('One or both customers not found.');
    }

    // 1. Move all parcels from source to target
    const sourceParcels = await db.parcels.where('customer_id').equals(sourceCustomerId).toArray();
    for (const p of sourceParcels) {
      await db.parcels.update(p.id, { customer_id: targetCustomerId });
    }

    // 2. Move sub-names from source to target
    const sourceSubNames = await db.customer_sub_names.where('customer_id').equals(sourceCustomerId).toArray();
    for (const sn of sourceSubNames) {
      const targetHas = await db.customer_sub_names
        .where('customer_id')
        .equals(targetCustomerId)
        .filter((t) => t.name.toLowerCase() === sn.name.toLowerCase())
        .first();
      if (!targetHas) {
        await db.customer_sub_names.update(sn.id, { customer_id: targetCustomerId });
      } else {
        const itemsWithOldSub = await db.parcel_items.where('sub_name_id').equals(sn.id).toArray();
        for (const item of itemsWithOldSub) {
          await db.parcel_items.update(item.id, { sub_name_id: targetHas.id });
        }
        await db.customer_sub_names.delete(sn.id);
      }
    }

    // 3. Append notes if source had notes
    if (source.notes && source.notes.trim()) {
      const mergedNotes = target.notes
        ? `${target.notes}\n[Merged from ${source.name} (${source.code})]: ${source.notes}`
        : `[Merged from ${source.name} (${source.code})]: ${source.notes}`;
      await db.customers.update(targetCustomerId, { notes: mergedNotes });
    }

    // 4. Log in status_history
    const now = new Date().toISOString();
    await db.status_history.add({
      id: crypto.randomUUID(),
      entity_type: 'customer',
      entity_id: targetCustomerId,
      from_status: source.code,
      to_status: target.code,
      note: `Merged duplicate customer "${source.name}" (${source.code}) into "${target.name}" (${target.code}). Moved ${sourceParcels.length} parcels.`,
      changed_by: userId,
      changed_at: now,
    });

    // 5. Delete source customer
    await db.customers.delete(sourceCustomerId);

    const updatedTarget = (await db.customers.get(targetCustomerId))!;
    return {
      targetCustomer: updatedTarget,
      parcelsMovedCount: sourceParcels.length,
      subNamesMovedCount: sourceSubNames.length,
    };
  }

  // ----------------------------------------------------
  // Sub Names
  // ----------------------------------------------------
  async getSubNamesByCustomerId(customerId: string): Promise<CustomerSubName[]> {
    return db.customer_sub_names.where('customer_id').equals(customerId).toArray();
  }

  async createSubName(customerId: string, name: string): Promise<CustomerSubName> {
    const trimmed = name.trim();
    const existing = await db.customer_sub_names
      .where('customer_id')
      .equals(customerId)
      .filter((s) => s.name.toLowerCase() === trimmed.toLowerCase())
      .first();

    if (existing) return existing;

    const subName: CustomerSubName = {
      id: crypto.randomUUID(),
      customer_id: customerId,
      name: trimmed,
    };
    await db.customer_sub_names.add(subName);
    return subName;
  }

  // ----------------------------------------------------
  // Parcels Enrichment Helper
  // ----------------------------------------------------
  private async enrichParcel(p: Parcel): Promise<ParcelWithDetails> {
    const customer = await db.customers.get(p.customer_id);
    let rawItems = await db.parcel_items.where('parcel_id').equals(p.id).sortBy('item_index');

    // Auto-migrate legacy parcel if it has no items in parcel_items table
    if (rawItems.length === 0) {
      const legacyQty = p.total_qty || (p as unknown as { qty?: number }).qty || 1;
      const legacyWeight = p.total_weight_kg ?? (p as unknown as { weight_kg?: number }).weight_kg ?? 0;
      const legacyPerPiece =
        (p as unknown as { weight_per_piece_kg?: number }).weight_per_piece_kg ||
        (legacyQty > 0 ? Number((legacyWeight / legacyQty).toFixed(2)) : legacyWeight);

      const synthItem: ParcelItem = {
        id: crypto.randomUUID(),
        parcel_id: p.id,
        item_index: 1,
        sub_name_id: (p as unknown as { sub_name_id?: string | null }).sub_name_id || null,
        name_on_parcel:
          (p as unknown as { name_on_parcel?: string }).name_on_parcel ||
          customer?.name ||
          p.parcel_code,
        qty: legacyQty,
        weight_per_piece_kg: legacyPerPiece,
        weight_kg: legacyWeight,
        length_cm: (p as unknown as { length_cm?: number }).length_cm || 0,
        width_cm: (p as unknown as { width_cm?: number }).width_cm || 0,
        height_cm: (p as unknown as { height_cm?: number }).height_cm || 0,
        created_at: p.created_at || new Date().toISOString(),
      };

      try {
        await db.parcel_items.add(synthItem);
        p.total_qty = legacyQty;
        p.total_weight_kg = legacyWeight;
        await db.parcels.update(p.id, {
          total_qty: legacyQty,
          total_weight_kg: legacyWeight,
        });
      } catch (err) {
        console.warn('Could not persist synthetic item migration:', err);
      }
      rawItems = [synthItem];
    }

    const photos = await db.parcel_photos.where('parcel_id').equals(p.id).toArray();

    const enrichedItems: ParcelItemWithDetails[] = [];
    const locations: ParcelStatusLocation[] = [];

    let totalStored = 0;
    let totalPacked = 0;
    let totalInTransit = 0;
    let totalDelivered = 0;

    for (const it of rawItems) {
      let subName: CustomerSubName | null = null;
      if (it.sub_name_id) {
        subName = (await db.customer_sub_names.get(it.sub_name_id)) || null;
      }

      const itemPhotos = photos.filter((ph) => ph.parcel_item_id === it.id);
      const photoObjects = itemPhotos.map((ph) => ({
        id: ph.id,
        url: URL.createObjectURL(ph.blob),
      }));
      const photoUrls = photoObjects.map((po) => po.url);

      // Calculate locations and pieces for this specific item
      const boxItems = await db.box_items
        .where('parcel_id')
        .equals(p.id)
        .filter((bi) => !bi.parcel_item_id || bi.parcel_item_id === it.id)
        .toArray();

      const courierLooseItems = await db.courier_loose_items
        .where('parcel_id')
        .equals(p.id)
        .filter((cli) => !cli.parcel_item_id || cli.parcel_item_id === it.id)
        .toArray();

      let itemPacked = 0;
      let itemInTransit = 0;
      let itemDelivered = 0;
      const itemLocations: ParcelStatusLocation[] = [];

      for (const bi of boxItems) {
        const box = await db.boxes.get(bi.box_id);
        if (!box) continue;

        let status: 'packed' | 'in_transit' | 'delivered' = 'packed';
        let courierLabel = '';

        if (box.courier_id) {
          const courier = await db.couriers.get(box.courier_id);
          if (courier) {
            courierLabel = ` • Truck: ${courier.truck_no}`;
            if (courier.status === 'in_transit') status = 'in_transit';
            else if (courier.status === 'delivered') status = 'delivered';
          }
        }

        if (status === 'packed') itemPacked += bi.qty;
        else if (status === 'in_transit') itemInTransit += bi.qty;
        else if (status === 'delivered') itemDelivered += bi.qty;

        const locEntry: ParcelStatusLocation = {
          type: 'box',
          id: box.id,
          code: box.box_code,
          label: `${box.box_code}${courierLabel}`,
          item_name: it.item_name || it.name_on_parcel,
          qty: bi.qty,
          status,
        };
        locations.push(locEntry);
        itemLocations.push(locEntry);
      }

      for (const cli of courierLooseItems) {
        const courier = await db.couriers.get(cli.courier_id);
        if (!courier) continue;

        let status: 'packed' | 'in_transit' | 'delivered' = 'packed';
        if (courier.status === 'in_transit') status = 'in_transit';
        else if (courier.status === 'delivered') status = 'delivered';

        if (status === 'packed') itemPacked += cli.qty;
        else if (status === 'in_transit') itemInTransit += cli.qty;
        else if (status === 'delivered') itemDelivered += cli.qty;

        const locEntry: ParcelStatusLocation = {
          type: 'courier',
          id: courier.id,
          code: courier.courier_code,
          label: `Truck: ${courier.truck_no}`,
          item_name: it.item_name || it.name_on_parcel,
          qty: cli.qty,
          status,
        };
        locations.push(locEntry);
        itemLocations.push(locEntry);
      }

      const isReturnedState = p.status === 'to_be_returned' || p.status === 'returned';
      const itemStored = isReturnedState
        ? 0
        : Math.max(0, (it.qty || 1) - (itemPacked + itemInTransit + itemDelivered));

      totalStored += itemStored;
      totalPacked += itemPacked;
      totalInTransit += itemInTransit;
      totalDelivered += itemDelivered;

      enrichedItems.push({
        ...it,
        item_name: it.item_name || '',
        sub_name: subName,
        photos_count: itemPhotos.length,
        photo_urls: photoUrls,
        photos: photoObjects,
        stored_qty: itemStored,
        packed_qty: itemPacked,
        in_transit_qty: itemInTransit,
        delivered_qty: itemDelivered,
        locations: itemLocations,
      });
    }

    const calculatedTotalQty = p.total_qty ?? rawItems.reduce((sum, it) => sum + (it.qty || 0), 0);
    const calculatedTotalWeight = p.total_weight_kg ?? rawItems.reduce((sum, it) => sum + (it.weight_kg || 0), 0);

    const breakdown: ParcelStatusBreakdown = {
      stored_qty: totalStored,
      packed_qty: totalPacked,
      in_transit_qty: totalInTransit,
      delivered_qty: totalDelivered,
      locations,
    };

    // Primary status representation
    let primaryStatus: ParcelStatus = p.status || 'stored';
    if (p.status === 'to_be_returned' || p.status === 'returned') {
      primaryStatus = p.status;
    } else if (breakdown.delivered_qty === calculatedTotalQty && calculatedTotalQty > 0) {
      primaryStatus = 'delivered';
    } else if (breakdown.in_transit_qty > 0) {
      primaryStatus = 'in_transit';
    } else if (breakdown.packed_qty > 0) {
      primaryStatus = 'packed';
    } else {
      primaryStatus = 'stored';
    }

    return {
      ...p,
      total_qty: calculatedTotalQty,
      total_weight_kg: Number(calculatedTotalWeight.toFixed(2)),
      status: primaryStatus,
      customer: customer || undefined,
      items: enrichedItems,
      photos_count: photos.length,
      breakdown,
    };
  }

  // ----------------------------------------------------
  // Parcels Methods
  // ----------------------------------------------------
  async getParcels(filters?: ParcelFilters): Promise<ParcelWithDetails[]> {
    let parcels = await db.parcels.orderBy('created_at').reverse().toArray();

    if (filters?.customerId) {
      parcels = parcels.filter((p) => p.customer_id === filters.customerId);
    }

    let enriched = await Promise.all(parcels.map((p) => this.enrichParcel(p)));

    if (filters?.status) {
      const s = filters.status;
      enriched = enriched.filter((p) => {
        if (s === 'to_be_returned') return p.status === 'to_be_returned';
        if (s === 'returned') return p.status === 'returned';
        if (s === 'stored') return p.status === 'stored' && p.breakdown.stored_qty > 0;
        if (s === 'packed') return p.status === 'packed' && p.breakdown.packed_qty > 0;
        if (s === 'in_transit') return p.status === 'in_transit' && p.breakdown.in_transit_qty > 0;
        if (s === 'delivered') return p.status === 'delivered';
        return p.status === s;
      });
    }

    if (filters?.query) {
      const q = filters.query.toLowerCase().trim();
      enriched = enriched.filter(
        (p) =>
          p.parcel_code.toLowerCase().includes(q) ||
          (p.customer && p.customer.name.toLowerCase().includes(q)) ||
          p.items.some((it) => it.name_on_parcel.toLowerCase().includes(q))
      );
    }

    return enriched;
  }

  async getParcelById(id: string): Promise<ParcelWithDetails | null> {
    const parcel = await db.parcels.get(id);
    if (!parcel) return null;
    return this.enrichParcel(parcel);
  }

  async getParcelByCode(code: string): Promise<ParcelWithDetails | null> {
    const parcel = await db.parcels.where('parcel_code').equals(code.trim().toUpperCase()).first();
    if (!parcel) return null;
    return this.enrichParcel(parcel);
  }

  async createParcel(input: CreateParcelInput, userId: string): Promise<ParcelWithDetails> {
    const parcelCode = await this.getNextParcelCode();
    const parcelId = crypto.randomUUID();
    const now = new Date().toISOString();

    let totalQty = 0;
    let totalWeight = 0;

    for (const item of input.items) {
      totalQty += Math.max(1, Number(item.qty) || 1);
      totalWeight += Number(item.weight_kg) || (Number(item.qty) * Number(item.weight_per_piece_kg));
    }

    const parcel: Parcel = {
      id: parcelId,
      parcel_code: parcelCode,
      customer_id: input.customer_id,
      received_at: input.received_at || getTodayIsoDate(),
      total_qty: totalQty,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      status: 'stored',
      created_by: userId,
      created_at: now,
    };

    await db.transaction('rw', [db.parcels, db.parcel_items, db.parcel_photos, db.status_history], async () => {
      await db.parcels.add(parcel);

      let itemIndex = 1;
      for (const itemInput of input.items) {
        const itemId = crypto.randomUUID();
        const qty = Math.max(1, Number(itemInput.qty) || 1);
        const weightPerPiece = Number(itemInput.weight_per_piece_kg) || 0;
        const weightKg = Number((qty * weightPerPiece).toFixed(2));

        const parcelItem: ParcelItem = {
          id: itemId,
          parcel_id: parcelId,
          item_index: itemIndex++,
          item_name: itemInput.item_name?.trim() || '',
          sub_name_id: itemInput.sub_name_id,
          name_on_parcel: itemInput.name_on_parcel.trim(),
          qty,
          weight_per_piece_kg: weightPerPiece,
          weight_kg: weightKg,
          length_cm: Number(itemInput.length_cm) || 0,
          width_cm: Number(itemInput.width_cm) || 0,
          height_cm: Number(itemInput.height_cm) || 0,
          created_at: now,
        };

        await db.parcel_items.add(parcelItem);

        if (itemInput.photos && itemInput.photos.length > 0) {
          for (const photoBlob of itemInput.photos) {
            await db.parcel_photos.add({
              id: crypto.randomUUID(),
              parcel_id: parcelId,
              parcel_item_id: itemId,
              blob: photoBlob,
              created_at: now,
            });
          }
        }
      }

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'parcel',
        entity_id: parcelId,
        from_status: null,
        to_status: 'stored',
        note: `Received ${input.items.length} package lot (${totalQty} pcs total)`,
        changed_by: userId,
        changed_at: now,
      });
    });

    return this.enrichParcel(parcel);
  }

  async createParcelBatch(inputs: CreateParcelInput[], userId: string): Promise<ParcelWithDetails[]> {
    const results: ParcelWithDetails[] = [];
    for (const input of inputs) {
      const p = await this.createParcel(input, userId);
      results.push(p);
    }
    return results;
  }

  async addPackageItemToParcel(
    parcelId: string,
    itemInput: CreatePackageItemInput,
    userId: string
  ): Promise<ParcelWithDetails> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const existingItems = await db.parcel_items.where('parcel_id').equals(parcelId).toArray();
    const nextItemIndex = existingItems.length > 0 ? Math.max(...existingItems.map((i) => i.item_index)) + 1 : 1;

    const itemId = crypto.randomUUID();
    const now = new Date().toISOString();
    const qty = Math.max(1, Number(itemInput.qty) || 1);
    const weightPerPiece = Number(itemInput.weight_per_piece_kg) || 0;
    const weightKg = Number((qty * weightPerPiece).toFixed(2));

    const parcelItem: ParcelItem = {
      id: itemId,
      parcel_id: parcelId,
      item_index: nextItemIndex,
      item_name: itemInput.item_name?.trim() || '',
      sub_name_id: itemInput.sub_name_id,
      name_on_parcel: itemInput.name_on_parcel.trim(),
      qty,
      weight_per_piece_kg: weightPerPiece,
      weight_kg: weightKg,
      length_cm: Number(itemInput.length_cm) || 0,
      width_cm: Number(itemInput.width_cm) || 0,
      height_cm: Number(itemInput.height_cm) || 0,
      created_at: now,
    };

    await db.transaction('rw', [db.parcels, db.parcel_items, db.parcel_photos, db.status_history], async () => {
      await db.parcel_items.add(parcelItem);

      if (itemInput.photos && itemInput.photos.length > 0) {
        for (const photoBlob of itemInput.photos) {
          await db.parcel_photos.add({
            id: crypto.randomUUID(),
            parcel_id: parcelId,
            parcel_item_id: itemId,
            blob: photoBlob,
            created_at: now,
          });
        }
      }

      // Recompute parcel totals
      const allItems = await db.parcel_items.where('parcel_id').equals(parcelId).toArray();
      let totalQty = 0;
      let totalWeight = 0;
      for (const it of allItems) {
        totalQty += it.qty;
        totalWeight += it.weight_kg;
      }

      await db.parcels.update(parcelId, {
        total_qty: totalQty,
        total_weight_kg: Number(totalWeight.toFixed(2)),
      });

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'parcel',
        entity_id: parcelId,
        from_status: null,
        to_status: 'updated',
        note: `Added package item #${nextItemIndex} by staff`,
        changed_by: userId,
        changed_at: now,
      });
    });

    const updated = await db.parcels.get(parcelId);
    return this.enrichParcel(updated!);
  }

  async updateParcelStatus(
    parcelId: string,
    toStatus: ParcelStatus,
    userId: string,
    note?: string
  ): Promise<ParcelWithDetails> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    if (toStatus === 'to_be_returned' || toStatus === 'returned') {
      const enriched = await this.enrichParcel(parcel);
      if (
        enriched.status !== 'stored' &&
        enriched.status !== 'to_be_returned' &&
        enriched.status !== 'returned'
      ) {
        throw new Error('Only parcels in stored warehouse status can be marked as returned.');
      }
      if (enriched.breakdown.packed_qty > 0 || enriched.breakdown.in_transit_qty > 0) {
        throw new Error('Cannot return parcel while items are packed in a Big Box or on a truck. Unpack them first.');
      }
    }

    const fromStatus = parcel.status;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.parcels, db.status_history], async () => {
      await db.parcels.update(parcelId, { status: toStatus });

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'parcel',
        entity_id: parcelId,
        from_status: fromStatus,
        to_status: toStatus,
        note: note || null,
        changed_by: userId,
        changed_at: now,
      });
    });

    const updated = await db.parcels.get(parcelId);
    return this.enrichParcel(updated!);
  }

  async markParcelAsReturned(
    parcelId: string,
    userId: string,
    note?: string
  ): Promise<ParcelWithDetails> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const enriched = await this.enrichParcel(parcel);
    if (enriched.breakdown.packed_qty > 0 || enriched.breakdown.in_transit_qty > 0) {
      throw new Error('Cannot return parcel while items are packed in a Big Box or on a truck. Unpack them first.');
    }

    const fromStatus = parcel.status;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.parcels, db.status_history], async () => {
      await db.parcels.update(parcelId, { status: 'returned' });

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'parcel',
        entity_id: parcelId,
        from_status: fromStatus,
        to_status: 'returned',
        note: note || 'Physically returned / handed back to sender or driver',
        changed_by: userId,
        changed_at: now,
      });
    });

    const updated = await db.parcels.get(parcelId);
    return this.enrichParcel(updated!);
  }

  async updateParcelDetails(
    parcelId: string,
    data: {
      customer_id?: string;
      received_at?: string;
      status?: ParcelStatus;
    },
    userId: string
  ): Promise<ParcelWithDetails> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const updates: Partial<Parcel> = {};
    if (data.customer_id !== undefined) updates.customer_id = data.customer_id;
    if (data.received_at !== undefined) updates.received_at = data.received_at;
    if (data.status !== undefined) updates.status = data.status;

    await db.transaction('rw', [db.parcels, db.status_history], async () => {
      await db.parcels.update(parcelId, updates);

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'parcel',
        entity_id: parcelId,
        from_status: parcel.status,
        to_status: updates.status || parcel.status,
        note: 'Parcel details updated by staff',
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });

    const updated = await db.parcels.get(parcelId);
    return this.enrichParcel(updated!);
  }

  async updateParcelItemDetails(
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
  ): Promise<ParcelWithDetails> {
    const item = await db.parcel_items.get(itemId);
    if (!item) throw new Error('Parcel item not found');

    const updates: Partial<ParcelItem> = {};
    if (data.item_name !== undefined) updates.item_name = data.item_name.trim();
    if (data.sub_name_id !== undefined) updates.sub_name_id = data.sub_name_id;
    if (data.name_on_parcel !== undefined) updates.name_on_parcel = data.name_on_parcel.trim();
    if (data.qty !== undefined) updates.qty = Number(data.qty);
    if (data.weight_per_piece_kg !== undefined) updates.weight_per_piece_kg = Number(data.weight_per_piece_kg);
    if (data.weight_kg !== undefined) {
      updates.weight_kg = Number(data.weight_kg);
    } else if (data.qty !== undefined || data.weight_per_piece_kg !== undefined) {
      const q = updates.qty ?? item.qty;
      const w = updates.weight_per_piece_kg ?? item.weight_per_piece_kg;
      updates.weight_kg = Number((q * w).toFixed(2));
    }
    if (data.length_cm !== undefined) updates.length_cm = Number(data.length_cm);
    if (data.width_cm !== undefined) updates.width_cm = Number(data.width_cm);
    if (data.height_cm !== undefined) updates.height_cm = Number(data.height_cm);

    const now = new Date().toISOString();

    await db.transaction(
      'rw',
      [db.parcel_items, db.parcels, db.parcel_photos, db.status_history],
      async () => {
        await db.parcel_items.update(itemId, updates);

        if (data.new_photos && data.new_photos.length > 0) {
          for (const photoBlob of data.new_photos) {
            await db.parcel_photos.add({
              id: crypto.randomUUID(),
              parcel_id: item.parcel_id,
              parcel_item_id: itemId,
              blob: photoBlob,
              created_at: now,
            });
          }
        }

        // Recompute parcel totals
        const allItems = await db.parcel_items.where('parcel_id').equals(item.parcel_id).toArray();
        let totalQty = 0;
        let totalWeight = 0;
        for (const it of allItems) {
          totalQty += it.qty;
          totalWeight += it.weight_kg;
        }

        await db.parcels.update(item.parcel_id, {
          total_qty: totalQty,
          total_weight_kg: Number(totalWeight.toFixed(2)),
        });

        await db.status_history.add({
          id: crypto.randomUUID(),
          entity_type: 'parcel',
          entity_id: item.parcel_id,
          from_status: null,
          to_status: 'updated',
          note: `Package item #${item.item_index} updated by staff`,
          changed_by: userId,
          changed_at: now,
        });
      }
    );

    const updatedParcel = await db.parcels.get(item.parcel_id);
    return this.enrichParcel(updatedParcel!);
  }

  async deleteParcel(
    parcelId: string,
    deleteCustomerIfUnused: boolean = false
  ): Promise<{ parcelDeleted: boolean; customerDeleted: boolean }> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const enriched = await this.enrichParcel(parcel);
    if (enriched.breakdown.packed_qty > 0 || enriched.breakdown.in_transit_qty > 0) {
      throw new Error('Cannot delete parcel while pieces are packed in big boxes or dispatched on trucks.');
    }

    const customerId = parcel.customer_id;
    let customerDeleted = false;

    await db.transaction(
      'rw',
      [
        db.parcels,
        db.parcel_items,
        db.parcel_photos,
        db.status_history,
        db.customers,
        db.customer_sub_names,
      ],
      async () => {
        // Delete all photos associated with this parcel
        await db.parcel_photos.where('parcel_id').equals(parcelId).delete();

        // Delete all package items
        await db.parcel_items.where('parcel_id').equals(parcelId).delete();

        // Delete status history entries
        await db.status_history
          .where('entity_type')
          .equals('parcel')
          .filter((sh) => sh.entity_id === parcelId)
          .delete();

        // Delete the parcel lot itself
        await db.parcels.delete(parcelId);

        // Optional: delete customer if unused
        if (deleteCustomerIfUnused && customerId) {
          const remainingParcels = await db.parcels
            .where('customer_id')
            .equals(customerId)
            .count();
          if (remainingParcels === 0) {
            await db.customer_sub_names.where('customer_id').equals(customerId).delete();
            await db.customers.delete(customerId);
            customerDeleted = true;
          }
        }
      }
    );

    return { parcelDeleted: true, customerDeleted };
  }

  async getNextParcelCode(): Promise<string> {
    const parcels = await db.parcels.toArray();
    let max = 0;
    for (const p of parcels) {
      const match = p.parcel_code.match(/P-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `P-${String(max + 1).padStart(4, '0')}`;
  }

  // ----------------------------------------------------
  // Photos
  // ----------------------------------------------------
  async getPhotosByParcelId(parcelId: string): Promise<ParcelPhoto[]> {
    return db.parcel_photos.where('parcel_id').equals(parcelId).toArray();
  }

  async addParcelPhoto(parcelId: string, parcelItemId: string | null, blob: Blob): Promise<ParcelPhoto> {
    const photo: ParcelPhoto = {
      id: crypto.randomUUID(),
      parcel_id: parcelId,
      parcel_item_id: parcelItemId,
      blob,
      created_at: new Date().toISOString(),
    };
    await db.parcel_photos.add(photo);
    return photo;
  }

  async deleteParcelPhoto(photoId: string): Promise<void> {
    await db.parcel_photos.delete(photoId);
  }

  // ----------------------------------------------------
  // Boxes (Repacking - Single Big Boxes, No Separate Open/Sealed)
  // ----------------------------------------------------
  async getBoxes(): Promise<BoxWithDetails[]> {
    const boxes = await db.boxes.orderBy('created_at').reverse().toArray();
    return Promise.all(boxes.map((b) => this.enrichBox(b)));
  }

  async getBoxById(id: string): Promise<BoxWithDetails | null> {
    const box = await db.boxes.get(id);
    if (!box) return null;
    return this.enrichBox(box);
  }

  async getBoxByCode(code: string): Promise<BoxWithDetails | null> {
    const box = await db.boxes.where('box_code').equals(code.trim().toUpperCase()).first();
    if (!box) return null;
    return this.enrichBox(box);
  }

  private async enrichBox(b: Box): Promise<BoxWithDetails> {
    const courier = b.courier_id ? await db.couriers.get(b.courier_id) : null;
    const boxItems = await db.box_items.where('box_id').equals(b.id).toArray();

    const items: BoxItemWithParcel[] = [];
    let totalPieces = 0;
    let totalWeight = 0;

    for (const bi of boxItems) {
      const p = await db.parcels.get(bi.parcel_id);
      if (!p) continue;
      const enrichedParcel = await this.enrichParcel(p);
      const specificItem =
        enrichedParcel.items.find((it) => it.id === bi.parcel_item_id) || enrichedParcel.items[0];
      if (!specificItem) continue;

      const itemWeight = Number((bi.qty * specificItem.weight_per_piece_kg).toFixed(2));
      totalPieces += bi.qty;
      totalWeight += itemWeight;

      items.push({
        id: bi.id,
        parcel_id: p.id,
        parcel_item_id: bi.parcel_item_id,
        parcel: enrichedParcel,
        item: specificItem,
        qty: bi.qty,
        weight_kg: itemWeight,
      });
    }

    const boxPhotos = await db.box_photos.where('box_id').equals(b.id).toArray();
    const photosWithUrls: BoxPhotoWithUrl[] = boxPhotos.map((p) => ({
      ...p,
      url: URL.createObjectURL(p.blob),
    }));
    const photo_urls = photosWithUrls.map((p) => p.url);

    return {
      ...b,
      parcels_count: items.length,
      total_pieces: totalPieces,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      courier: courier || null,
      items,
      photos: photosWithUrls,
      photo_urls,
    };
  }

  async createBox(userId: string): Promise<BoxWithDetails> {
    const code = await this.getNextBoxCode();
    const box: Box = {
      id: crypto.randomUUID(),
      box_code: code,
      status: 'active',
      courier_id: null,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    await db.boxes.add(box);
    return this.enrichBox(box);
  }

  async addParcelItemPiecesToBox(
    boxId: string,
    parcelId: string,
    parcelItemId: string,
    qty: number,
    userId: string
  ): Promise<void> {
    const box = await db.boxes.get(boxId);
    if (!box) throw new Error('Box not found');

    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const enrichedParcel = await this.enrichParcel(parcel);
    const item = enrichedParcel.items.find((it) => it.id === parcelItemId);
    if (!item) throw new Error('Parcel item not found');

    if (qty > item.stored_qty) {
      throw new Error(`Only ${item.stored_qty} pcs available in warehouse storage for ${item.name_on_parcel}`);
    }

    const now = new Date().toISOString();

    await db.transaction('rw', [db.box_items, db.status_history], async () => {
      // Check if this parcel item is already in this box: if so, increment qty
      const existingItem = await db.box_items
        .where('box_id')
        .equals(boxId)
        .filter((bi) => bi.parcel_item_id === parcelItemId)
        .first();

      if (existingItem) {
        await db.box_items.update(existingItem.id, {
          qty: existingItem.qty + qty,
        });
      } else {
        await db.box_items.add({
          id: crypto.randomUUID(),
          box_id: boxId,
          parcel_id: parcelId,
          parcel_item_id: parcelItemId,
          qty,
          created_at: now,
        });
      }

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'box',
        entity_id: boxId,
        from_status: null,
        to_status: 'packed',
        note: `Packed ${qty} pcs of ${parcel.parcel_code} (${item.name_on_parcel})`,
        changed_by: userId,
        changed_at: now,
      });
    });
  }

  async removeParcelItemPiecesFromBox(
    boxId: string,
    boxItemId: string,
    userId: string
  ): Promise<void> {
    const item = await db.box_items.get(boxItemId);
    if (!item) return;

    await db.transaction('rw', [db.box_items, db.status_history], async () => {
      await db.box_items.delete(boxItemId);

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'box',
        entity_id: boxId,
        from_status: 'packed',
        to_status: 'stored',
        note: `Removed ${item.qty} pcs from box`,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });
  }

  async deleteBox(boxId: string, userId: string): Promise<void> {
    const box = await db.boxes.get(boxId);
    if (!box) return;
    if (box.courier_id) {
      throw new Error('Cannot delete this big box while loaded on a courier truck. Please unload it first.');
    }

    await db.transaction('rw', [db.boxes, db.box_items, db.box_photos, db.status_history], async () => {
      await db.box_photos.where('box_id').equals(boxId).delete();
      await db.box_items.where('box_id').equals(boxId).delete();
      await db.boxes.delete(boxId);
      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'box',
        entity_id: boxId,
        from_status: null,
        to_status: 'deleted',
        note: 'Box deleted by staff',
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });
  }

  async getNextBoxCode(): Promise<string> {
    const boxes = await db.boxes.toArray();
    let max = 0;
    for (const b of boxes) {
      const match = b.box_code.match(/B-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `B-${String(max + 1).padStart(3, '0')}`;
  }

  async addBoxPhotos(boxId: string, photos: Blob[], _userId?: string): Promise<BoxWithDetails> {
    const box = await db.boxes.get(boxId);
    if (!box) throw new Error(`Box ${boxId} not found`);
    for (const blob of photos) {
      await db.box_photos.add({
        id: crypto.randomUUID(),
        box_id: boxId,
        blob,
        created_at: new Date().toISOString(),
      });
    }
    return this.enrichBox(box);
  }

  async deleteBoxPhoto(photoId: string): Promise<void> {
    await db.box_photos.delete(photoId);
  }

  // ----------------------------------------------------
  // Couriers
  // ----------------------------------------------------
  async getCouriers(): Promise<CourierWithDetails[]> {
    const couriers = await db.couriers.orderBy('created_at').reverse().toArray();
    return Promise.all(couriers.map((c) => this.enrichCourier(c)));
  }

  async getCourierById(id: string): Promise<CourierWithDetails | null> {
    const courier = await db.couriers.get(id);
    if (!courier) return null;
    return this.enrichCourier(courier);
  }

  private async enrichCourier(c: Courier): Promise<CourierWithDetails> {
    const loadedBoxes = await db.boxes.where('courier_id').equals(c.id).toArray();
    const enrichedBoxes = await Promise.all(loadedBoxes.map((b) => this.enrichBox(b)));

    const looseItems = await db.courier_loose_items.where('courier_id').equals(c.id).toArray();
    const enrichedLooseItems: CourierLooseItemWithParcel[] = [];

    let totalPieces = 0;
    let totalWeight = 0;

    for (const b of enrichedBoxes) {
      totalPieces += b.total_pieces;
      totalWeight += b.total_weight_kg;
    }

    for (const li of looseItems) {
      const p = await db.parcels.get(li.parcel_id);
      if (!p) continue;
      const enrichedParcel = await this.enrichParcel(p);
      const specificItem =
        enrichedParcel.items.find((it) => it.id === li.parcel_item_id) || enrichedParcel.items[0];
      if (!specificItem) continue;

      const itemWeight = Number((li.qty * specificItem.weight_per_piece_kg).toFixed(2));
      totalPieces += li.qty;
      totalWeight += itemWeight;

      enrichedLooseItems.push({
        id: li.id,
        parcel_id: p.id,
        parcel_item_id: li.parcel_item_id,
        parcel: enrichedParcel,
        item: specificItem,
        qty: li.qty,
        weight_kg: itemWeight,
      });
    }

    const courierPhotos = await db.courier_photos.where('courier_id').equals(c.id).toArray();
    const photosWithUrls: CourierPhotoWithUrl[] = courierPhotos.map((p) => ({
      ...p,
      url: URL.createObjectURL(p.blob),
    }));
    const photo_urls = photosWithUrls.map((p) => p.url);

    return {
      ...c,
      boxes: enrichedBoxes,
      loose_items: enrichedLooseItems,
      total_boxes_count: enrichedBoxes.length,
      total_pieces_count: totalPieces,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      photos: photosWithUrls,
      photo_urls,
    };
  }

  async createCourier(
    data: { truck_no: string; dispatch_date?: string },
    userId: string
  ): Promise<CourierWithDetails> {
    const code = await this.getNextCourierCode();
    const courier: Courier = {
      id: crypto.randomUUID(),
      courier_code: code,
      truck_no: data.truck_no.trim(),
      dispatch_date: data.dispatch_date || '',
      status: 'draft',
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    await db.couriers.add(courier);
    return this.enrichCourier(courier);
  }

  async updateCourierTruckNo(
    courierId: string,
    truckNo: string,
    userId: string
  ): Promise<CourierWithDetails> {
    const courier = await db.couriers.get(courierId);
    if (!courier) throw new Error(`Courier ${courierId} not found`);

    const trimmed = truckNo.trim();
    if (!trimmed) throw new Error('Truck number cannot be empty');

    await db.couriers.update(courierId, { truck_no: trimmed });
    await db.status_history.add({
      id: crypto.randomUUID(),
      entity_type: 'courier',
      entity_id: courierId,
      from_status: null,
      to_status: courier.status,
      note: `Updated truck number to "${trimmed}"`,
      changed_by: userId,
      changed_at: new Date().toISOString(),
    });

    const updated = await db.couriers.get(courierId);
    return this.enrichCourier(updated!);
  }

  async deleteCourier(courierId: string, userId: string): Promise<void> {
    const courier = await db.couriers.get(courierId);
    if (!courier) throw new Error(`Courier ${courierId} not found`);

    if (courier.status === 'in_transit' || courier.status === 'delivered') {
      throw new Error(
        `Cannot delete courier truck while ${courier.status === 'in_transit' ? 'in transit' : 'delivered'}. Only loading trucks can be deleted.`
      );
    }

    await db.transaction(
      'rw',
      [db.couriers, db.boxes, db.courier_loose_items, db.courier_photos, db.status_history],
      async () => {
        // 1. Unassign all loaded boxes back to warehouse active inventory
        const loadedBoxes = await db.boxes.where('courier_id').equals(courierId).toArray();
        for (const b of loadedBoxes) {
          await db.boxes.update(b.id, { courier_id: null, status: 'active' });
        }

        // 2. Remove all loose items assigned to this truck (returns pieces to stored status)
        await db.courier_loose_items.where('courier_id').equals(courierId).delete();

        // 3. Remove truck photos
        await db.courier_photos.where('courier_id').equals(courierId).delete();

        // 4. Delete the courier
        await db.couriers.delete(courierId);

        await db.status_history.add({
          id: crypto.randomUUID(),
          entity_type: 'courier',
          entity_id: courierId,
          from_status: courier.status,
          to_status: 'deleted',
          note: `Deleted courier truck ${courier.truck_no} (${courier.courier_code})`,
          changed_by: userId,
          changed_at: new Date().toISOString(),
        });
      }
    );
  }

  async addBoxToCourier(courierId: string, boxId: string, userId: string): Promise<void> {
    await db.transaction('rw', [db.boxes, db.status_history], async () => {
      await db.boxes.update(boxId, { courier_id: courierId });
      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'box',
        entity_id: boxId,
        from_status: null,
        to_status: 'loaded',
        note: `Loaded into courier run`,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });
  }

  async removeBoxFromCourier(_courierId: string, boxId: string, userId: string): Promise<void> {
    await db.transaction('rw', [db.boxes, db.status_history], async () => {
      await db.boxes.update(boxId, { courier_id: null });
      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'box',
        entity_id: boxId,
        from_status: 'loaded',
        to_status: 'active',
        note: `Unloaded from courier`,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });
  }

  async addLooseParcelItemPiecesToCourier(
    courierId: string,
    parcelId: string,
    parcelItemId: string,
    qty: number,
    userId: string
  ): Promise<void> {
    const parcel = await db.parcels.get(parcelId);
    if (!parcel) throw new Error('Parcel not found');

    const enrichedParcel = await this.enrichParcel(parcel);
    const item = enrichedParcel.items.find((it) => it.id === parcelItemId);
    if (!item) throw new Error('Parcel item not found');

    if (qty > item.stored_qty) {
      throw new Error(`Only ${item.stored_qty} pcs available in warehouse storage for ${item.name_on_parcel}`);
    }

    const now = new Date().toISOString();

    await db.transaction('rw', [db.courier_loose_items, db.status_history], async () => {
      const existing = await db.courier_loose_items
        .where('courier_id')
        .equals(courierId)
        .filter((cli) => cli.parcel_item_id === parcelItemId)
        .first();

      if (existing) {
        await db.courier_loose_items.update(existing.id, {
          qty: existing.qty + qty,
        });
      } else {
        await db.courier_loose_items.add({
          id: crypto.randomUUID(),
          courier_id: courierId,
          parcel_id: parcelId,
          parcel_item_id: parcelItemId,
          qty,
          created_at: now,
        });
      }

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'courier',
        entity_id: courierId,
        from_status: null,
        to_status: 'loading',
        note: `Loaded ${qty} loose pcs of ${parcel.parcel_code} (${item.name_on_parcel})`,
        changed_by: userId,
        changed_at: now,
      });
    });
  }

  async removeLooseParcelItemPiecesFromCourier(
    courierId: string,
    itemId: string,
    userId: string
  ): Promise<void> {
    await db.transaction('rw', [db.courier_loose_items, db.status_history], async () => {
      await db.courier_loose_items.delete(itemId);
      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'courier',
        entity_id: courierId,
        from_status: 'loading',
        to_status: 'updated',
        note: `Removed loose item from courier`,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      });
    });
  }

  async updateCourierStatus(
    courierId: string,
    toStatus: CourierStatus,
    userId: string,
    note?: string
  ): Promise<CourierWithDetails> {
    const courier = await db.couriers.get(courierId);
    if (!courier) throw new Error('Courier not found');

    const fromStatus = courier.status;
    const now = new Date().toISOString();

    await db.transaction('rw', [db.couriers, db.boxes, db.status_history], async () => {
      const updates: Partial<Courier> = { status: toStatus };
      if (toStatus === 'in_transit' && !courier.dispatch_date) {
        updates.dispatch_date = getTodayIsoDate();
      }

      await db.couriers.update(courierId, updates);

      // Cascade status to loaded boxes
      const loadedBoxes = await db.boxes.where('courier_id').equals(courierId).toArray();
      for (const b of loadedBoxes) {
        const boxStatus = toStatus === 'delivered' ? 'delivered' : toStatus === 'in_transit' ? 'in_transit' : 'active';
        await db.boxes.update(b.id, { status: boxStatus });
      }

      await db.status_history.add({
        id: crypto.randomUUID(),
        entity_type: 'courier',
        entity_id: courierId,
        from_status: fromStatus,
        to_status: toStatus,
        note: note || null,
        changed_by: userId,
        changed_at: now,
      });
    });

    const updated = await db.couriers.get(courierId);
    return this.enrichCourier(updated!);
  }

  async getNextCourierCode(): Promise<string> {
    const couriers = await db.couriers.toArray();
    let max = 0;
    for (const c of couriers) {
      const match = c.courier_code.match(/CR-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `CR-${String(max + 1).padStart(3, '0')}`;
  }

  async addCourierPhotos(courierId: string, photos: Blob[], _userId?: string): Promise<CourierWithDetails> {
    const courier = await db.couriers.get(courierId);
    if (!courier) throw new Error(`Courier ${courierId} not found`);
    for (const blob of photos) {
      await db.courier_photos.add({
        id: crypto.randomUUID(),
        courier_id: courierId,
        blob,
        created_at: new Date().toISOString(),
      });
    }
    return this.enrichCourier(courier);
  }

  async deleteCourierPhoto(photoId: string): Promise<void> {
    await db.courier_photos.delete(photoId);
  }

  // ----------------------------------------------------
  // Status History & Audit Logs
  // ----------------------------------------------------
  async getStatusHistory(
    entityType: 'parcel' | 'box' | 'courier' | 'customer',
    entityId: string
  ): Promise<StatusHistory[]> {
    return db.status_history
      .where('[entity_type+entity_id]')
      .equals([entityType, entityId])
      .sortBy('changed_at');
  }

  async getAllStatusHistory(filters?: {
    entityType?: string;
    staffId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<EnrichedStatusHistory[]> {
    const history = await db.status_history.orderBy('changed_at').reverse().toArray();

    let filtered = history;

    if (filters?.entityType && filters.entityType !== 'all') {
      filtered = filtered.filter((h) => h.entity_type === filters.entityType);
    }

    if (filters?.staffId && filters.staffId !== 'all') {
      filtered = filtered.filter((h) => h.changed_by === filters.staffId);
    }

    if (filters?.dateFrom) {
      const fromIso = `${filters.dateFrom}T00:00:00`;
      filtered = filtered.filter((h) => h.changed_at >= fromIso);
    }

    if (filters?.dateTo) {
      const toIso = `${filters.dateTo}T23:59:59.999`;
      filtered = filtered.filter((h) => h.changed_at <= toIso);
    }

    const limit = filters?.limit || 200;
    const sliced = filtered.slice(0, limit);

    const users = await db.staff_users.toArray();
    const userMap = new Map<string, string>(users.map((u) => [u.id, u.name]));

    const enriched: EnrichedStatusHistory[] = [];
    for (const h of sliced) {
      let entityLabel = h.entity_id;
      if (h.entity_type === 'parcel') {
        const p = await db.parcels.get(h.entity_id);
        if (p) entityLabel = p.parcel_code;
      } else if (h.entity_type === 'box') {
        const b = await db.boxes.get(h.entity_id);
        if (b) entityLabel = b.box_code;
      } else if (h.entity_type === 'courier') {
        const c = await db.couriers.get(h.entity_id);
        if (c) entityLabel = `Truck ${c.truck_no} (${c.courier_code})`;
      } else if (h.entity_type === 'customer') {
        const cust = await db.customers.get(h.entity_id);
        if (cust) entityLabel = `${cust.name} (${cust.code})`;
      }

      enriched.push({
        ...h,
        changed_by_name: userMap.get(h.changed_by) || 'Supervisor / Staff',
        entity_label: entityLabel,
      });
    }

    return enriched;
  }

  async logStatusChange(entry: Omit<StatusHistory, 'id' | 'changed_at'>): Promise<StatusHistory> {
    const record: StatusHistory = {
      ...entry,
      id: crypto.randomUUID(),
      changed_at: new Date().toISOString(),
    };
    await db.status_history.add(record);
    return record;
  }

  // ----------------------------------------------------
  // Admin Dashboard KPIs
  // ----------------------------------------------------
  async getAdminKPIs(dateRange?: { from?: string; to?: string }): Promise<AdminKPIData> {
    const allParcels = await this.getParcels();
    const allBoxes = await this.getBoxes();
    const allCouriers = await this.getCouriers();
    const allCustomers = await this.getCustomers();

    let intakeParcels = allParcels;
    if (dateRange?.from) {
      intakeParcels = intakeParcels.filter((p) => p.received_at >= dateRange.from!);
    }
    if (dateRange?.to) {
      intakeParcels = intakeParcels.filter((p) => p.received_at <= dateRange.to!);
    }

    let intakePieces = 0;
    let intakeWeightKg = 0;
    for (const p of intakeParcels) {
      intakePieces += p.total_qty;
      intakeWeightKg += p.total_weight_kg;
    }

    let storedParcelsCount = 0;
    let storedPieces = 0;
    let storedWeightKg = 0;

    let inTransitParcelsCount = 0;
    let inTransitWeightKg = 0;

    let deliveredParcelsCount = 0;
    let deliveredPieces = 0;
    let deliveredWeightKg = 0;

    let toBeReturnedCount = 0;
    let toBeReturnedPieces = 0;
    let toBeReturnedWeightKg = 0;
    let returnedCount = 0;
    let returnedPieces = 0;
    let returnedWeightKg = 0;

    const customerStats = new Map<string, { parcels: number; pieces: number; weight: number }>();

    for (const p of allParcels) {
      if (p.status === 'to_be_returned') {
        toBeReturnedCount++;
        toBeReturnedPieces += p.total_qty;
        toBeReturnedWeightKg += p.total_weight_kg;
      } else if (p.status === 'returned') {
        returnedCount++;
        returnedPieces += p.total_qty;
        returnedWeightKg += p.total_weight_kg;
      } else if (p.status === 'delivered') {
        deliveredParcelsCount++;
        deliveredPieces += p.total_qty;
        deliveredWeightKg += p.total_weight_kg;
      } else if (p.status === 'in_transit') {
        inTransitParcelsCount++;
        inTransitWeightKg += p.total_weight_kg;
      } else if (p.breakdown.stored_qty > 0) {
        storedParcelsCount++;
        storedPieces += p.breakdown.stored_qty;
        const storedRatio = p.total_qty > 0 ? p.breakdown.stored_qty / p.total_qty : 1;
        storedWeightKg += Number((p.total_weight_kg * storedRatio).toFixed(1));
      }

      if (p.customer_id) {
        const existing = customerStats.get(p.customer_id) || { parcels: 0, pieces: 0, weight: 0 };
        existing.parcels += 1;
        existing.pieces += p.total_qty;
        existing.weight += p.total_weight_kg;
        customerStats.set(p.customer_id, existing);
      }
    }

    const inTransitBoxesCount = allBoxes.filter((b) => b.status === 'in_transit').length;
    const activeCouriers = allCouriers.filter((c) => c.status === 'in_transit' || c.status === 'draft');
    const activeTrucksCount = allCouriers.filter((c) => c.status === 'in_transit').length;

    const topCustomers = Array.from(customerStats.entries())
      .map(([custId, stat]) => {
        const cust = allCustomers.find((c) => c.id === custId);
        return {
          id: custId,
          name: cust?.name || 'Unknown',
          code: cust?.code || '',
          parcelsCount: stat.parcels,
          piecesCount: stat.pieces,
          totalWeightKg: Number(stat.weight.toFixed(1)),
        };
      })
      .sort((a, b) => b.totalWeightKg - a.totalWeightKg)
      .slice(0, 20);

    // Build daily intake & volume trends for the graph
    const dailyMap = new Map<string, { pieces: number; weight: number; count: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const p of intakeParcels) {
      const d = p.received_at ? p.received_at.split('T')[0] : '2026-11-11';
      const prev = dailyMap.get(d) || { pieces: 0, weight: 0, count: 0 };
      prev.pieces += p.total_qty || 0;
      prev.weight += p.total_weight_kg || 0;
      prev.count += 1;
      dailyMap.set(d, prev);
    }

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, data]) => {
        const parts = date.split('-');
        const m = parseInt(parts[1], 10) - 1;
        const displayDate = `${parts[2]} ${monthNames[m] || ''}`;
        return {
          date,
          displayDate,
          pieces: data.pieces,
          weightKg: Number(data.weight.toFixed(1)),
          lotsCount: data.count,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      intakeCount: intakeParcels.length,
      intakePieces,
      intakeWeightKg: Number(intakeWeightKg.toFixed(1)),
      storedParcelsCount,
      storedPieces,
      storedWeightKg: Number(storedWeightKg.toFixed(1)),
      inTransitParcelsCount,
      inTransitBoxesCount,
      inTransitWeightKg: Number(inTransitWeightKg.toFixed(1)),
      activeTrucksCount,
      deliveredParcelsCount,
      deliveredPieces,
      deliveredWeightKg: Number(deliveredWeightKg.toFixed(1)),
      toBeReturnedCount,
      toBeReturnedPieces,
      toBeReturnedWeightKg: Number(toBeReturnedWeightKg.toFixed(1)),
      returnedCount,
      returnedPieces,
      returnedWeightKg: Number(returnedWeightKg.toFixed(1)),
      dailyTrends,
      topCustomers,
      activeCouriers,
    };
  }

  // ----------------------------------------------------
  // Database Seeding & Reset
  // ----------------------------------------------------
  async seedInitialData(force = false): Promise<void> {
    const userCount = await db.staff_users.count();
    if (userCount > 0 && !force) {
      return;
    }

    await db.transaction(
      'rw',
      [
        db.customers,
        db.customer_sub_names,
        db.parcels,
        db.parcel_items,
        db.parcel_photos,
        db.boxes,
        db.box_items,
        db.couriers,
        db.courier_loose_items,
        db.status_history,
        db.staff_users,
      ],
      async () => {
        if (force) {
          await db.customers.clear();
          await db.customer_sub_names.clear();
          await db.parcels.clear();
          await db.parcel_items.clear();
          await db.parcel_photos.clear();
          await db.boxes.clear();
          await db.box_items.clear();
          await db.couriers.clear();
          await db.courier_loose_items.clear();
          await db.status_history.clear();
          await db.staff_users.clear();
        }

        // Only seed necessary staff users for auth
        await db.staff_users.bulkAdd(SEED_USERS);

        // Seed other items (clean empty arrays)
        if (SEED_CUSTOMERS.length > 0) await db.customers.bulkAdd(SEED_CUSTOMERS);
        if (SEED_SUB_NAMES.length > 0) await db.customer_sub_names.bulkAdd(SEED_SUB_NAMES);
        if (SEED_BOXES.length > 0) await db.boxes.bulkAdd(SEED_BOXES);
        if (SEED_COURIERS.length > 0) await db.couriers.bulkAdd(SEED_COURIERS);
        if (SEED_PARCELS.length > 0) await db.parcels.bulkAdd(SEED_PARCELS);
      }
    );
  }

  async resetDatabase(): Promise<void> {
    await this.seedInitialData(true);
  }

  async resetToSampleData(): Promise<void> {
    // Generate dates: today, -1d, -2d, -3d
    const now = new Date();
    const toIsoDate = (offsetDays: number) => {
      const d = new Date(now.getTime() - offsetDays * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const dateToday = toIsoDate(0);
    const dateMinus1 = toIsoDate(1);
    const dateMinus2 = toIsoDate(2);
    const dateMinus3 = toIsoDate(3);

    const makeSvgBlob = (title: string, sub: string, bg: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" rx="28" fill="${bg}"/>
        <circle cx="200" cy="140" r="38" fill="white" opacity="0.15"/>
        <path d="M185 138 l14 14 l28 -28" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="50%" y="235" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">${title}</text>
        <text x="50%" y="270" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" opacity="0.85">${sub}</text>
        <text x="50%" y="345" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1" opacity="0.5">SK CARGO • WAREHOUSE PWA</text>
      </svg>`;
      return new Blob([svg], { type: 'image/svg+xml' });
    };

    // 1. Clear all tables
    await db.customers.clear();
    await db.customer_sub_names.clear();
    await db.parcels.clear();
    await db.parcel_items.clear();
    await db.parcel_photos.clear();
    await db.boxes.clear();
    await db.box_items.clear();
    await db.box_photos.clear();
    await db.couriers.clear();
    await db.courier_loose_items.clear();
    await db.courier_photos.clear();
    await db.status_history.clear();
    await db.staff_users.clear();

    // 2. Add Users
    await db.staff_users.bulkAdd(SEED_USERS);

    // 3. Add Customers (5 realistic Myanmar customer accounts)
    const cust1: Customer = {
      id: 'c1111111-1111-4111-8111-111111111111',
      code: 'SK-0001',
      name: 'Kyaw Swar',
      phone: '092-500-1122',
      address: 'No. 45, Bogyoke Road, Yangon',
      notes: 'VIP customer - handle with care',
      created_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
    };
    const cust2: Customer = {
      id: 'c2222222-2222-4222-8222-222222222222',
      code: 'SK-0002',
      name: 'Ma Thida Oo',
      phone: '089-876-5432',
      address: 'Room 3B, Pearl Condo, Bahan, Yangon',
      notes: 'Call recipient 30 mins before dispatch',
      created_at: new Date(now.getTime() - 9 * 86400000).toISOString(),
    };
    const cust3: Customer = {
      id: 'c3333333-3333-4333-8333-333333333333',
      code: 'SK-0003',
      name: 'Aung Myo Htet',
      phone: '094-201-9988',
      address: 'No. 12, Merchant Street, Kyauktada, Yangon',
      notes: 'Deliver to warehouse gate #2',
      created_at: new Date(now.getTime() - 8 * 86400000).toISOString(),
    };
    const cust4: Customer = {
      id: 'c4444444-4444-4444-8444-444444444444',
      code: 'SK-0004',
      name: 'Daw San San',
      phone: '085-555-7788',
      address: 'No. 88, Upper Pazundaung Road, Yangon',
      notes: 'Cash on delivery collection',
      created_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
    };
    const cust5: Customer = {
      id: 'c5555555-5555-4555-8555-555555555555',
      code: 'SK-0005',
      name: 'Zayar Lin',
      phone: '097-900-3344',
      address: 'Industrial Zone 1, Hlaing Tharyar, Yangon',
      notes: 'Heavy machinery spare parts',
      created_at: new Date(now.getTime() - 6 * 86400000).toISOString(),
    };
    await db.customers.bulkAdd([cust1, cust2, cust3, cust4, cust5]);

    // 4. Add Couriers (across dates: Today, -1d, -3d)
    const cr1: Courier = {
      id: 'cr111111-1111-4111-8111-111111111111',
      courier_code: 'CR-001',
      truck_no: '7D-4521 (Yangon Line)',
      dispatch_date: dateMinus1,
      status: 'in_transit',
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    };
    const cr2: Courier = {
      id: 'cr222222-2222-4222-8222-222222222222',
      courier_code: 'CR-002',
      truck_no: '3B-1189 (Mandalay Line)',
      dispatch_date: dateMinus3,
      status: 'delivered',
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    };
    const cr3: Courier = {
      id: 'cr333333-3333-4333-8333-333333333333',
      courier_code: 'CR-003',
      truck_no: '1A-8899 (Express Daily)',
      dispatch_date: '',
      status: 'draft',
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: now.toISOString(),
    };
    await db.couriers.bulkAdd([cr1, cr2, cr3]);

    // Courier Photos
    await db.courier_photos.bulkAdd([
      {
        id: crypto.randomUUID(),
        courier_id: cr1.id,
        blob: makeSvgBlob('TRUCK 7D-4521', 'CR-001 In Transit Cargo', '#2563EB'),
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        courier_id: cr2.id,
        blob: makeSvgBlob('TRUCK 3B-1189', 'CR-002 Delivered Cargo', '#059669'),
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ]);

    // 5. Add Big Boxes (across dates)
    const b1: Box = {
      id: 'b1111111-1111-4111-8111-111111111111',
      box_code: 'B-001',
      status: 'active',
      courier_id: null, // stored in warehouse, ready to load
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    };
    const b2: Box = {
      id: 'b2222222-2222-4222-8222-222222222222',
      box_code: 'B-002',
      status: 'in_transit',
      courier_id: cr1.id, // loaded on CR-001
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    };
    const b3: Box = {
      id: 'b3333333-3333-4333-8333-333333333333',
      box_code: 'B-003',
      status: 'delivered',
      courier_id: cr2.id, // loaded on CR-002
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    };
    await db.boxes.bulkAdd([b1, b2, b3]);

    // Box Photos (Repacked Box Photos!)
    await db.box_photos.bulkAdd([
      {
        id: crypto.randomUUID(),
        box_id: b1.id,
        blob: makeSvgBlob('BIG BOX B-001', 'Master Carton • Repacked', '#D9822B'),
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        box_id: b2.id,
        blob: makeSvgBlob('BIG BOX B-002', 'Master Carton • On Truck', '#4F46E5'),
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        box_id: b3.id,
        blob: makeSvgBlob('BIG BOX B-003', 'Master Carton • Delivered', '#059669'),
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ]);

    // 6. Add Parcels & Items across 4 dates
    // Parcel 1: Today (Ma Thida Oo - 2 package items)
    const p1Id = 'p1111111-1111-4111-8111-111111111111';
    const p1Item1Id = crypto.randomUUID();
    const p1Item2Id = crypto.randomUUID();
    const p1: Parcel = {
      id: p1Id,
      parcel_code: 'P-0001',
      customer_id: cust2.id,
      received_at: dateToday,
      status: 'stored',
      total_qty: 150,
      total_weight_kg: 55.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: now.toISOString(),
    };
    const p1Items: ParcelItem[] = [
      {
        id: p1Item1Id,
        parcel_id: p1Id,
        item_index: 1,
        item_name: 'Silk Shirts',
        sub_name_id: null,
        name_on_parcel: 'Ma Thida Oo',
        qty: 100,
        weight_per_piece_kg: 0.25,
        weight_kg: 25.0,
        length_cm: 30,
        width_cm: 20,
        height_cm: 15,
        created_at: now.toISOString(),
      },
      {
        id: p1Item2Id,
        parcel_id: p1Id,
        item_index: 2,
        item_name: 'Denim Pants',
        sub_name_id: null,
        name_on_parcel: 'Ma Thida Oo',
        qty: 50,
        weight_per_piece_kg: 0.6,
        weight_kg: 30.0,
        length_cm: 40,
        width_cm: 30,
        height_cm: 20,
        created_at: now.toISOString(),
      },
    ];

    // Parcel 2: Today (Kyaw Swar)
    const p2Id = 'p2222222-2222-4222-8222-222222222222';
    const p2Item1Id = crypto.randomUUID();
    const p2: Parcel = {
      id: p2Id,
      parcel_code: 'P-0002',
      customer_id: cust1.id,
      received_at: dateToday,
      status: 'stored',
      total_qty: 200,
      total_weight_kg: 20.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: now.toISOString(),
    };
    const p2Items: ParcelItem[] = [
      {
        id: p2Item1Id,
        parcel_id: p2Id,
        item_index: 1,
        item_name: 'Phone Accessories',
        sub_name_id: null,
        name_on_parcel: 'Kyaw Swar',
        qty: 200,
        weight_per_piece_kg: 0.1,
        weight_kg: 20.0,
        length_cm: 25,
        width_cm: 25,
        height_cm: 20,
        created_at: now.toISOString(),
      },
    ];

    // Parcel 3: Yesterday (Aung Myo Htet - packed in B-001)
    const p3Id = 'p3333333-3333-4333-8333-333333333333';
    const p3Item1Id = crypto.randomUUID();
    const p3: Parcel = {
      id: p3Id,
      parcel_code: 'P-0003',
      customer_id: cust3.id,
      received_at: dateMinus1,
      status: 'packed',
      total_qty: 80,
      total_weight_kg: 64.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    };
    const p3Items: ParcelItem[] = [
      {
        id: p3Item1Id,
        parcel_id: p3Id,
        item_index: 1,
        item_name: 'Cotton Bedsheets',
        sub_name_id: null,
        name_on_parcel: 'Aung Myo Htet',
        qty: 80,
        weight_per_piece_kg: 0.8,
        weight_kg: 64.0,
        length_cm: 50,
        width_cm: 40,
        height_cm: 30,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
    ];

    // Parcel 4: Yesterday (Daw San San - packed in B-001)
    const p4Id = 'p4444444-4444-4444-8444-444444444444';
    const p4Item1Id = crypto.randomUUID();
    const p4: Parcel = {
      id: p4Id,
      parcel_code: 'P-0004',
      customer_id: cust4.id,
      received_at: dateMinus1,
      status: 'packed',
      total_qty: 150,
      total_weight_kg: 30.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    };
    const p4Items: ParcelItem[] = [
      {
        id: p4Item1Id,
        parcel_id: p4Id,
        item_index: 1,
        item_name: 'Cosmetics & Skincare',
        sub_name_id: null,
        name_on_parcel: 'Daw San San',
        qty: 150,
        weight_per_piece_kg: 0.2,
        weight_kg: 30.0,
        length_cm: 35,
        width_cm: 25,
        height_cm: 20,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
    ];

    // Parcel 5: 2 Days Ago (Zayar Lin - packed in B-002, on CR-001)
    const p5Id = 'p5555555-5555-4555-8555-555555555555';
    const p5Item1Id = crypto.randomUUID();
    const p5: Parcel = {
      id: p5Id,
      parcel_code: 'P-0005',
      customer_id: cust5.id,
      received_at: dateMinus2,
      status: 'in_transit',
      total_qty: 20,
      total_weight_kg: 100.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    };
    const p5Items: ParcelItem[] = [
      {
        id: p5Item1Id,
        parcel_id: p5Id,
        item_index: 1,
        item_name: 'Electric Motors',
        sub_name_id: null,
        name_on_parcel: 'Zayar Lin',
        qty: 20,
        weight_per_piece_kg: 5.0,
        weight_kg: 100.0,
        length_cm: 40,
        width_cm: 35,
        height_cm: 30,
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
    ];

    // Parcel 6: 2 Days Ago (Kyaw Swar - loose on CR-001)
    const p6Id = 'p6666666-6666-4666-8666-666666666666';
    const p6Item1Id = crypto.randomUUID();
    const p6: Parcel = {
      id: p6Id,
      parcel_code: 'P-0006',
      customer_id: cust1.id,
      received_at: dateMinus2,
      status: 'in_transit',
      total_qty: 120,
      total_weight_kg: 36.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    };
    const p6Items: ParcelItem[] = [
      {
        id: p6Item1Id,
        parcel_id: p6Id,
        item_index: 1,
        item_name: 'Wireless Headphones',
        sub_name_id: null,
        name_on_parcel: 'Kyaw Swar',
        qty: 120,
        weight_per_piece_kg: 0.3,
        weight_kg: 36.0,
        length_cm: 30,
        width_cm: 30,
        height_cm: 20,
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
    ];

    // Parcel 7: 3 Days Ago (Ma Thida Oo - delivered via CR-002)
    const p7Id = 'p7777777-7777-4777-8777-777777777777';
    const p7Item1Id = crypto.randomUUID();
    const p7: Parcel = {
      id: p7Id,
      parcel_code: 'P-0007',
      customer_id: cust2.id,
      received_at: dateMinus3,
      status: 'delivered',
      total_qty: 60,
      total_weight_kg: 72.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    };
    const p7Items: ParcelItem[] = [
      {
        id: p7Item1Id,
        parcel_id: p7Id,
        item_index: 1,
        item_name: 'Winter Jackets',
        sub_name_id: null,
        name_on_parcel: 'Ma Thida Oo',
        qty: 60,
        weight_per_piece_kg: 1.2,
        weight_kg: 72.0,
        length_cm: 60,
        width_cm: 40,
        height_cm: 40,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ];

    // Parcel 8: 3 Days Ago (Daw San San - delivered via CR-002)
    const p8Id = 'p8888888-8888-4888-8888-888888888888';
    const p8Item1Id = crypto.randomUUID();
    const p8: Parcel = {
      id: p8Id,
      parcel_code: 'P-0008',
      customer_id: cust4.id,
      received_at: dateMinus3,
      status: 'delivered',
      total_qty: 40,
      total_weight_kg: 100.0,
      created_by: '11111111-1111-4111-8111-111111111111',
      created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    };
    const p8Items: ParcelItem[] = [
      {
        id: p8Item1Id,
        parcel_id: p8Id,
        item_index: 1,
        item_name: 'Kitchenware Sets',
        sub_name_id: null,
        name_on_parcel: 'Daw San San',
        qty: 40,
        weight_per_piece_kg: 2.5,
        weight_kg: 100.0,
        length_cm: 50,
        width_cm: 50,
        height_cm: 40,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ];

    await db.parcels.bulkAdd([p1, p2, p3, p4, p5, p6, p7, p8]);
    await db.parcel_items.bulkAdd([
      ...p1Items,
      ...p2Items,
      ...p3Items,
      ...p4Items,
      ...p5Items,
      ...p6Items,
      ...p7Items,
      ...p8Items,
    ]);

    // Parcel Item Photos
    await db.parcel_photos.bulkAdd([
      {
        id: crypto.randomUUID(),
        parcel_id: p1Id,
        parcel_item_id: p1Item1Id,
        blob: makeSvgBlob('Silk Shirts', '100 pcs • Ma Thida Oo', '#0284C7'),
        created_at: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p1Id,
        parcel_item_id: p1Item2Id,
        blob: makeSvgBlob('Denim Pants', '50 pcs • Ma Thida Oo', '#1D4ED8'),
        created_at: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p2Id,
        parcel_item_id: p2Item1Id,
        blob: makeSvgBlob('Phone Accessories', '200 pcs • Kyaw Swar', '#7C3AED'),
        created_at: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p3Id,
        parcel_item_id: p3Item1Id,
        blob: makeSvgBlob('Cotton Bedsheets', '80 pcs • Aung Myo Htet', '#0D9488'),
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p4Id,
        parcel_item_id: p4Item1Id,
        blob: makeSvgBlob('Cosmetics & Skincare', '150 pcs • Daw San San', '#DB2777'),
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p5Id,
        parcel_item_id: p5Item1Id,
        blob: makeSvgBlob('Electric Motors', '20 pcs • Zayar Lin', '#EA580C'),
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p6Id,
        parcel_item_id: p6Item1Id,
        blob: makeSvgBlob('Wireless Headphones', '120 pcs • Kyaw Swar', '#4F46E5'),
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p7Id,
        parcel_item_id: p7Item1Id,
        blob: makeSvgBlob('Winter Jackets', '60 pcs • Ma Thida Oo', '#059669'),
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        parcel_id: p8Id,
        parcel_item_id: p8Item1Id,
        blob: makeSvgBlob('Kitchenware Sets', '40 pcs • Daw San San', '#0891B2'),
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ]);

    // 7. Add Box Items (Packing contents)
    await db.box_items.bulkAdd([
      {
        id: crypto.randomUUID(),
        box_id: b1.id,
        parcel_id: p3Id,
        parcel_item_id: p3Item1Id,
        qty: 80,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        box_id: b1.id,
        parcel_id: p4Id,
        parcel_item_id: p4Item1Id,
        qty: 150,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        box_id: b2.id,
        parcel_id: p5Id,
        parcel_item_id: p5Item1Id,
        qty: 20,
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        box_id: b3.id,
        parcel_id: p7Id,
        parcel_item_id: p7Item1Id,
        qty: 60,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ]);

    // 8. Add Loose Items on Couriers
    await db.courier_loose_items.bulkAdd([
      {
        id: crypto.randomUUID(),
        courier_id: cr1.id,
        parcel_id: p6Id,
        parcel_item_id: p6Item1Id,
        qty: 120,
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        courier_id: cr2.id,
        parcel_id: p8Id,
        parcel_item_id: p8Item1Id,
        qty: 40,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
    ]);
  }
}

export const localRepository = new LocalRepository();
