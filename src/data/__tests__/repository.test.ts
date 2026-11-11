import 'fake-indexeddb/auto';
import { LocalRepository } from '../localRepository';

async function runTests() {
  console.log('🧪 Starting Repository Tests...');
  const repo = new LocalRepository();

  // Test 1: Clean Initial Data
  console.log('Test 1: Seeding initial data (staff users only, no sample parcels)...');
  await repo.resetDatabase();
  const parcels = await repo.getParcels();
  console.assert(parcels.length === 0, `Expected 0 sample parcels, got ${parcels.length}`);
  const boxes = await repo.getBoxes();
  console.assert(boxes.length === 0, `Expected 0 sample boxes, got ${boxes.length}`);
  const couriers = await repo.getCouriers();
  console.assert(couriers.length === 0, `Expected 0 sample couriers, got ${couriers.length}`);
  console.log('✅ Test 1 Passed: Database starts completely clean with 0 sample records.');

  // Test 2: Auth & Staff Users
  console.log('Test 2: Testing Staff Users and Login...');
  const users = await repo.getStaffUsers();
  console.assert(users.length >= 3, `Expected >= 3 staff users, got ${users.length}`);
  const logged = await repo.login('staff1', 'staff123');
  console.assert(logged.username === 'staff1', 'Username should match staff1');
  console.log('✅ Test 2 Passed: Staff auth functional.');

  // Test 3: Customer Creation & Exact Case-Insensitive Match (Allows similar names like Johnny & John)
  console.log('Test 3: Testing Customer Creation and Exact Case-Insensitive Match...');
  const nextCustCode = await repo.getNextCustomerCode();
  console.assert(nextCustCode.startsWith('SK-'), `Code should start with SK-, got ${nextCustCode}`);

  const newCust = await repo.createCustomer({
    name: 'Aung Kyaw Thu',
    phone: '099-888-7766',
    alt_name: 'AKT Cargo Yangon',
  });
  console.assert(newCust.code === nextCustCode, `Expected code ${nextCustCode}, got ${newCust.code}`);

  const partialMatch = await repo.findSimilarCustomers('aung kyaw');
  console.assert(partialMatch.length === 0, 'Partial/similar name (like Johnny vs John) should NOT block or match');

  const exactCaseInsensitive = await repo.findSimilarCustomers('aung kyaw thu');
  console.assert(exactCaseInsensitive.length === 1, 'Exact case-insensitive name should match existing customer');
  console.log('✅ Test 3 Passed: Customer creation allows similar names and detects exact case-insensitive matches.');

  // Test 4: Sub-names
  console.log('Test 4: Customer Sub-names...');
  const sub1 = await repo.createSubName(newCust.id, 'Sub Branch North');
  const subs = await repo.getSubNamesByCustomerId(newCust.id);
  console.assert(subs.some((s) => s.name === 'Sub Branch North'), 'Sub name should be listed');
  console.log('✅ Test 4 Passed: Sub-names functional.');

  // Test 5: Parcel Lot Creation with Multiple Package Items (Starts as Stored)
  console.log('Test 5: Parcel Lot Creation with Multiple Package Items...');
  const createdParcel = await repo.createParcel(
    {
      customer_id: newCust.id,
      received_at: new Date().toISOString(),
      status: 'stored',
      items: [
        {
          item_name: 'Books',
          sub_name_id: sub1.id,
          name_on_parcel: 'Sub Branch North',
          qty: 100,
          weight_per_piece_kg: 2.0,
          weight_kg: 200.0,
          length_cm: 25,
          width_cm: 20,
          height_cm: 15,
          photos: [new Blob(['dummy-image-content'], { type: 'image/jpeg' })],
        },
        {
          item_name: 'Shirts',
          sub_name_id: null,
          name_on_parcel: newCust.name,
          qty: 1,
          weight_per_piece_kg: 5.2,
          weight_kg: 5.2,
          length_cm: 35,
          width_cm: 25,
          height_cm: 20,
          photos: [],
        },
      ],
    },
    logged.id
  );

  console.assert(createdParcel.total_qty === 101, `Parcel should have 101 total pieces, got ${createdParcel.total_qty}`);
  console.assert(createdParcel.items.length === 2, `Parcel should have 2 package items, got ${createdParcel.items.length}`);
  console.assert(createdParcel.status === 'stored', 'New parcel should start as stored');
  console.assert(createdParcel.items[0].item_name === 'Books', 'First item should have item_name Books');
  console.assert(createdParcel.items[0].qty === 100, 'First item should have qty 100');
  console.assert(createdParcel.items[0].stored_qty === 100, 'All 100 pieces of item 0 should be stored');

  // Test updating item details and adding a new photo
  await repo.updateParcelItemDetails(
    createdParcel.items[0].id,
    {
      item_name: 'Textbooks',
      new_photos: [new Blob(['second-image-content'], { type: 'image/jpeg' })],
    },
    logged.id
  );
  const updatedParcel = await repo.getParcelById(createdParcel.id);
  console.assert(updatedParcel?.items[0].item_name === 'Textbooks', 'Updated item_name should be Textbooks');
  console.assert(updatedParcel?.items[0].photos_count === 2, `Expected 2 photos on item[0], got ${updatedParcel?.items[0].photos_count}`);
  const allPhotos = await repo.getPhotosByParcelId(createdParcel.id);
  console.assert(allPhotos.length === 2, `Expected 2 total photos on parcel, got ${allPhotos.length}`);

  // Test deleting a photo
  await repo.deleteParcelPhoto(allPhotos[0].id);
  const photosAfterDelete = await repo.getPhotosByParcelId(createdParcel.id);
  console.assert(photosAfterDelete.length === 1, `Expected 1 photo after deletion, got ${photosAfterDelete.length}`);
  const parcelAfterPhotoDelete = await repo.getParcelById(createdParcel.id);
  console.assert(parcelAfterPhotoDelete?.items[0].photos_count === 1, `Expected item[0] to have 1 photo, got ${parcelAfterPhotoDelete?.items[0].photos_count}`);
  console.assert(parcelAfterPhotoDelete?.items[0].photos?.length === 1, `Expected item[0].photos to have length 1, got ${parcelAfterPhotoDelete?.items[0].photos?.length}`);

  console.log('✅ Test 5 Passed: Parcel lot creation with multiple items, item_name, adding and deleting photos functional.');

  // Test 6: Repacking Pieces into Big Box WITHOUT Parcel Splitting
  console.log('Test 6: Repacking Pieces into Big Box (Single Parcel, No Split)...');
  const newBox = await repo.createBox(logged.id);
  console.assert(newBox.box_code.startsWith('B-'), 'Box code should start with B-');

  // Pack 40 out of 100 pcs of createdParcel.items[0] into newBox
  await repo.addParcelItemPiecesToBox(newBox.id, createdParcel.id, createdParcel.items[0].id, 40, logged.id);

  // Parcel count in DB should STILL BE EXACTLY 1 (NO SPLIT ROW CREATED!)
  const allParcelsAfterPack = await repo.getParcels();
  console.assert(allParcelsAfterPack.length === 1, `Expected 1 parcel in DB, got ${allParcelsAfterPack.length}`);

  // Inspect the parcel: should remain ONE single parcel with 101 pcs total, 61 stored, 40 packed
  const packedParcel = await repo.getParcelById(createdParcel.id);
  console.assert(packedParcel?.total_qty === 101, `Expected total qty 101, got ${packedParcel?.total_qty}`);
  console.assert(packedParcel?.breakdown.stored_qty === 61, `Expected 61 stored pcs, got ${packedParcel?.breakdown.stored_qty}`);
  console.assert(packedParcel?.breakdown.packed_qty === 40, `Expected 40 packed pcs, got ${packedParcel?.breakdown.packed_qty}`);
  console.assert(packedParcel?.breakdown.locations.length === 1, 'Should have 1 box location');
  console.assert(packedParcel?.breakdown.locations[0].code === newBox.box_code, 'Location code should match box');

  // The box should hold 40 pcs
  const boxWithParcels = await repo.getBoxById(newBox.id);
  console.assert(boxWithParcels?.total_pieces === 40, `Expected 40 pieces in box, got ${boxWithParcels?.total_pieces}`);
  console.assert(boxWithParcels?.total_weight_kg === 80, `Expected 80 kg in box, got ${boxWithParcels?.total_weight_kg}`);
  console.log('✅ Test 6 Passed: Repacking pieces into big box without parcel splitting functional.');

  // Test 7: Couriers (Truck No, Dispatch Date, Big Boxes + Loose Pieces, Status Cascade)
  console.log('Test 7: Courier Dispatch with Truck No, Date & Status Cascade...');
  const courier = await repo.createCourier(
    {
      truck_no: '7D-9999 (Express Line)',
      dispatch_date: '2026-11-06',
    },
    logged.id
  );

  console.assert(courier.courier_code.startsWith('CR-'), 'Courier code should start with CR-');
  console.assert(courier.truck_no === '7D-9999 (Express Line)', 'Truck no should match');

  // Add the big box to courier
  await repo.addBoxToCourier(courier.id, newBox.id, logged.id);

  // Add 20 loose pieces from the 60 remaining stored pieces of item[0] directly to courier
  await repo.addLooseParcelItemPiecesToCourier(courier.id, createdParcel.id, createdParcel.items[0].id, 20, logged.id);

  const courierAfterLoad = await repo.getCourierById(courier.id);
  console.assert(courierAfterLoad?.total_boxes_count === 1, 'Should have 1 box loaded');
  console.assert(courierAfterLoad?.loose_items.length === 1, 'Should have 1 loose parcel item loaded');
  console.assert(
    courierAfterLoad?.total_pieces_count === 60,
    `Expected 60 total pieces (40 box + 20 loose), got ${courierAfterLoad?.total_pieces_count}`
  );

  // Dispatch courier to in_transit
  await repo.updateCourierStatus(courier.id, 'in_transit', logged.id, 'Truck departed');
  const boxAfterDispatch = await repo.getBoxById(newBox.id);
  console.assert(boxAfterDispatch?.status === 'in_transit', 'Box should cascade to in_transit');

  // Check parcel status breakdown during in_transit:
  // Total: 101 pcs. Stored: 41 pcs, In Transit: 60 pcs (40 in box + 20 loose)!
  const parcelInTransit = await repo.getParcelById(createdParcel.id);
  console.assert(parcelInTransit?.breakdown.stored_qty === 41, `Expected 41 stored, got ${parcelInTransit?.breakdown.stored_qty}`);
  console.assert(parcelInTransit?.breakdown.in_transit_qty === 60, `Expected 60 in transit, got ${parcelInTransit?.breakdown.in_transit_qty}`);
  console.assert(parcelInTransit?.status === 'in_transit', 'Primary status should be in_transit');

  // Deliver courier
  await repo.updateCourierStatus(courier.id, 'delivered', logged.id, 'Truck arrived');
  const boxAfterDeliver = await repo.getBoxById(newBox.id);
  console.assert(boxAfterDeliver?.status === 'delivered', 'Box should cascade to delivered');

  const parcelDelivered = await repo.getParcelById(createdParcel.id);
  console.assert(parcelDelivered?.breakdown.delivered_qty === 60, `Expected 60 delivered, got ${parcelDelivered?.breakdown.delivered_qty}`);
  console.assert(parcelDelivered?.breakdown.stored_qty === 41, `Expected 41 stored, got ${parcelDelivered?.breakdown.stored_qty}`);

  console.log('✅ Test 7 Passed: Courier dispatch run with boxes, loose pieces, and status cascades functional.');

  // Test 8: Customer Management (Address, Notes, Update, Deletion) & Parcel Lot Deletion
  console.log('Test 8: Customer Profile Management & Safe Deletion...');
  const testCust = await repo.createCustomer({
    name: 'Temporary Typo Customer',
    phone: '091-234-5678',
    address: 'No. 5, Inya Road, Yangon',
    notes: 'Fragile shipments only',
  });
  console.assert(testCust.address === 'No. 5, Inya Road, Yangon', 'Address should be saved');
  console.assert(testCust.notes === 'Fragile shipments only', 'Notes should be saved');

  // Update customer
  const updatedCust = await repo.updateCustomer(testCust.id, {
    name: 'Corrected Customer Name',
    phone: '091-999-0000',
    address: 'No. 10, Hledan Road, Yangon',
    notes: 'Updated customer notes',
  });
  console.assert(updatedCust.name === 'Corrected Customer Name', 'Name should be updated');
  console.assert(updatedCust.phone === '091-999-0000', 'Phone should be updated');

  // Create a mistaken parcel lot for this customer
  const wrongParcel = await repo.createParcel(
    {
      customer_id: testCust.id,
      received_at: new Date().toISOString(),
      status: 'stored',
      items: [
        {
          item_name: 'Mistaken Item',
          sub_name_id: null,
          name_on_parcel: 'Wrong Recipient',
          qty: 5,
          weight_per_piece_kg: 1.0,
          weight_kg: 5.0,
          length_cm: 10,
          width_cm: 10,
          height_cm: 10,
          photos: [],
        },
      ],
    },
    logged.id
  );
  console.assert(wrongParcel.status === 'stored', 'Wrong parcel created in stored status');

  // Delete wrong parcel with deleteCustomerIfUnused = true
  const deleteResult = await repo.deleteParcel(wrongParcel.id, true);
  console.assert(deleteResult.parcelDeleted === true, 'Parcel should be deleted');
  console.assert(deleteResult.customerDeleted === true, 'Unused typo customer should also be deleted');

  const checkParcel = await repo.getParcelById(wrongParcel.id);
  console.assert(checkParcel === null, 'Deleted parcel should not exist');
  const checkCustomer = await repo.getCustomerById(testCust.id);
  console.assert(checkCustomer === null, 'Deleted customer should not exist');

  console.log('✅ Test 8 Passed: Customer profile update, parcel lot deletion, and cleanup of unused customer functional.');

  // Test 9: Add Package Item to Existing Parcel Lot & Date Update
  console.log('Test 9: Adding Package Item to Existing Parcel Lot and Updating Received Date...');
  const newDate = '2026-11-12';
  const updatedDateParcel = await repo.updateParcelDetails(
    createdParcel.id,
    { received_at: newDate },
    logged.id
  );
  console.assert(updatedDateParcel.received_at === newDate, 'Received date should be updated');

  const beforeItemCount = createdParcel.items.length;
  const beforeTotalQty = createdParcel.total_qty;
  const parcelWithNewItem = await repo.addPackageItemToParcel(
    createdParcel.id,
    {
      item_name: 'Bonus Jacket',
      sub_name_id: null,
      name_on_parcel: 'Ma Thida Oo',
      qty: 15,
      weight_per_piece_kg: 2.0,
      weight_kg: 30.0,
      length_cm: 20,
      width_cm: 20,
      height_cm: 20,
      photos: [],
    },
    logged.id
  );

  console.assert(
    parcelWithNewItem.items.length === beforeItemCount + 1,
    `Expected items length ${beforeItemCount + 1}, got ${parcelWithNewItem.items.length}`
  );
  console.assert(
    parcelWithNewItem.total_qty === beforeTotalQty + 15,
    `Expected total qty ${beforeTotalQty + 15}, got ${parcelWithNewItem.total_qty}`
  );
  const newlyAdded = parcelWithNewItem.items.find((it) => it.item_name === 'Bonus Jacket');
  console.assert(newlyAdded !== undefined, 'Newly added item should be present');
  console.assert(newlyAdded?.item_index === 3, 'Newly added item index should be 3');
  console.log('✅ Test 9 Passed: Adding package item and updating date functional.');

  // Test 10: Box Photos and Courier Photos Management
  console.log('Test 10: Box and Courier Photos Upload and Deletion...');
  const testBox = await repo.createBox(logged.id);
  const dummyBlob1 = new Blob(['box-photo-content'], { type: 'image/jpeg' });
  const boxWithPhoto = await repo.addBoxPhotos(testBox.id, [dummyBlob1]);
  console.assert(boxWithPhoto.photos && boxWithPhoto.photos.length === 1, 'Box should have 1 photo');
  const boxPhotoId = boxWithPhoto.photos![0].id;
  await repo.deleteBoxPhoto(boxPhotoId);
  const boxAfterDelete = await repo.getBoxById(testBox.id);
  console.assert(!boxAfterDelete?.photos || boxAfterDelete.photos.length === 0, 'Box photo should be deleted');

  const testCourier = await repo.createCourier({ truck_no: '9A-9999', dispatch_date: '2026-11-09' }, logged.id);
  const dummyBlob2 = new Blob(['courier-truck-photo'], { type: 'image/jpeg' });
  const courierWithPhoto = await repo.addCourierPhotos(testCourier.id, [dummyBlob2]);
  console.assert(courierWithPhoto.photos && courierWithPhoto.photos.length === 1, 'Courier should have 1 photo');
  const courierPhotoId = courierWithPhoto.photos![0].id;
  await repo.deleteCourierPhoto(courierPhotoId);
  const courierAfterDelete = await repo.getCourierById(testCourier.id);
  console.assert(!courierAfterDelete?.photos || courierAfterDelete.photos.length === 0, 'Courier photo should be deleted');
  console.log('✅ Test 10 Passed: Box and Courier photo upload and deletion functional.');

  // Test 11: Guard preventing deletion of Big Box loaded on Courier
  console.log('Test 11: Guard against deleting Big Box loaded on Courier...');
  const loadedBox = await repo.createBox(logged.id);
  await repo.addBoxToCourier(testCourier.id, loadedBox.id, logged.id);
  let caughtError = false;
  try {
    await repo.deleteBox(loadedBox.id, logged.id);
  } catch (err: unknown) {
    caughtError = true;
    console.assert(
      err instanceof Error && err.message.includes('Cannot delete this big box while loaded'),
      `Expected loaded box error message, got: ${(err as Error).message}`
    );
  }
  console.assert(caughtError, 'Deleting a big box loaded on a courier must throw an error');
  // Unload box and now delete should succeed
  await repo.removeBoxFromCourier(testCourier.id, loadedBox.id, logged.id);
  await repo.deleteBox(loadedBox.id, logged.id);
  const deletedBoxCheck = await repo.getBoxById(loadedBox.id);
  console.assert(deletedBoxCheck === null, 'Unloaded box should be successfully deleted');
  console.log('✅ Test 11 Passed: Loaded big box deletion guard functional.');

  // Test 12: resetToSampleData across at least 3 dates from today
  console.log('Test 12: Reset to sample data across multiple dates from today...');
  await repo.resetToSampleData();
  const sampleCusts = await repo.getCustomers();
  console.assert(sampleCusts.length === 5, `Expected 5 sample customers, got ${sampleCusts.length}`);
  console.assert(!sampleCusts.some((c) => c.alt_name), 'No legacy alt_name tags should exist');

  const sampleBoxes = await repo.getBoxes();
  console.assert(sampleBoxes.length === 3, `Expected 3 sample boxes, got ${sampleBoxes.length}`);
  console.assert(sampleBoxes.some((b) => b.photos && b.photos.length > 0), 'Sample boxes should include repacked box photos');

  const sampleCouriers = await repo.getCouriers();
  console.assert(sampleCouriers.length === 3, `Expected 3 sample couriers, got ${sampleCouriers.length}`);
  console.assert(sampleCouriers.some((c) => c.photos && c.photos.length > 0), 'Sample couriers should include truck photos');

  const sampleParcels = await repo.getParcels();
  console.assert(sampleParcels.length === 8, `Expected 8 sample parcels, got ${sampleParcels.length}`);
  const parcelDates = new Set(sampleParcels.map((p) => p.received_at?.split('T')[0]));
  console.assert(
    parcelDates.size >= 3,
    `Sample parcels must span at least 3 distinct dates, got ${parcelDates.size}: ${Array.from(parcelDates).join(', ')}`
  );
  console.log(`✅ Test 12 Passed: Fresh sample data spanning ${parcelDates.size} dates with photos successfully populated.`);

  // Test 13: Courier Truck Number Editing & Delete Guards
  console.log('Test 13: Courier Truck No Editing & Delete Guards...');
  const newRun = await repo.createCourier({ truck_no: 'TR-INIT' }, logged.id);
  console.assert(newRun.truck_no === 'TR-INIT', 'Truck number should be TR-INIT');
  console.assert(!newRun.dispatch_date, 'New courier run should not have dispatch_date until dispatched');

  // Edit truck number in draft
  const updatedRun = await repo.updateCourierTruckNo(newRun.id, 'TR-EDITED', logged.id);
  console.assert(updatedRun.truck_no === 'TR-EDITED', 'Truck number should be updated to TR-EDITED');

  // Dispatch run -> should set dispatch_date automatically
  const dispatched = await repo.updateCourierStatus(newRun.id, 'in_transit', logged.id);
  console.assert(dispatched.status === 'in_transit', 'Status should be in_transit');
  console.assert(Boolean(dispatched.dispatch_date), 'Dispatch date should be auto-set on dispatch');

  // Edit truck number while in_transit (allowed in all stages)
  const editedInTransit = await repo.updateCourierTruckNo(newRun.id, 'TR-TRANSIT-EDIT', logged.id);
  console.assert(editedInTransit.truck_no === 'TR-TRANSIT-EDIT', 'Truck number can be edited while in transit');

  // Attempt delete while in_transit -> must throw error
  let caughtDeleteError = false;
  try {
    await repo.deleteCourier(newRun.id, logged.id);
  } catch (err: unknown) {
    caughtDeleteError = true;
    console.assert(
      err instanceof Error && err.message.includes('Cannot delete courier truck while in transit'),
      `Expected in transit delete error, got: ${(err as Error).message}`
    );
  }
  console.assert(caughtDeleteError, 'Deleting an in_transit courier must throw error');

  // Revert back to draft and delete should now succeed
  await repo.updateCourierStatus(newRun.id, 'draft', logged.id);
  await repo.deleteCourier(newRun.id, logged.id);
  const checkDeleted = await repo.getCourierById(newRun.id);
  console.assert(checkDeleted === null, 'Courier should be successfully deleted in draft status');
  console.log('✅ Test 13 Passed: Truck number editing and deletion guards verified.');

  // ==========================================
  // Test 14: Return Flow & KPI Tracking
  // ==========================================
  console.log('Test 14: Testing Admin Return Flow and Return KPIs...');
  const retCustomer = await repo.createCustomer({ name: 'Return Test Customer' });
  const retParcel = await repo.createParcel(
    {
      customer_id: retCustomer.id,
      received_at: '2026-11-11',
      items: [
        {
          item_name: 'Wrong Shoes',
          sub_name_id: null,
          name_on_parcel: 'Return Test Customer',
          qty: 2,
          weight_per_piece_kg: 1.5,
          weight_kg: 3.0,
          length_cm: 20,
          width_cm: 20,
          height_cm: 20,
        },
      ],
    },
    logged.id
  );

  // Admin marks as to_be_returned
  const flagged = await repo.updateParcelStatus(retParcel.id, 'to_be_returned', logged.id, 'Wrong sizing arrived');
  console.assert(flagged.status === 'to_be_returned', 'Parcel status should be to_be_returned');

  // Verify KPI reflects to_be_returned
  let kpis = await repo.getAdminKPIs();
  console.assert(kpis.toBeReturnedCount >= 1, 'KPI must track to_be_returned parcels');

  // Staff marks as returned
  const returned = await repo.markParcelAsReturned(retParcel.id, logged.id);
  console.assert(returned.status === 'returned', 'Parcel status should be returned');

  // Verify KPI reflects returned
  kpis = await repo.getAdminKPIs();
  console.assert(kpis.returnedCount >= 1, 'KPI must track returned parcels');
  console.log('✅ Test 14 Passed: Return lifecycle and KPI tracking verified.');

  // ==========================================
  // Test 15: Customer Merging
  // ==========================================
  console.log('Test 15: Testing Customer Merging...');
  const targetCust = await repo.createCustomer({ name: 'Primary Target Cust' });
  const sourceCust = await repo.createCustomer({ name: 'Duplicate Source Cust' });
  const pMoved = await repo.createParcel(
    {
      customer_id: sourceCust.id,
      received_at: '2026-11-11',
      items: [
        {
          item_name: 'Moved Item',
          sub_name_id: null,
          name_on_parcel: 'Duplicate Source Cust',
          qty: 1,
          weight_per_piece_kg: 5.0,
          weight_kg: 5.0,
          length_cm: 10,
          width_cm: 10,
          height_cm: 10,
        },
      ],
    },
    logged.id
  );

  const mergeRes = await repo.mergeCustomers(sourceCust.id, targetCust.id, logged.id);
  console.assert(mergeRes.parcelsMovedCount === 1, 'Should move 1 parcel');

  const checkSourceDeleted = await repo.getCustomerById(sourceCust.id);
  console.assert(checkSourceDeleted === null, 'Source customer should be deleted');

  const checkMovedParcel = await repo.getParcelById(pMoved.id);
  console.assert(checkMovedParcel?.customer_id === targetCust.id, 'Parcel must belong to target customer');
  console.log('✅ Test 15 Passed: Customer merging verified.');

  // ==========================================
  // Test 16: Staff User Management CRUD
  // ==========================================
  console.log('Test 16: Testing Staff User Management CRUD...');
  const newStaff = await repo.createStaffUser({
    username: 'warehouse_intern',
    name: 'Intern Tommy',
    role: 'staff',
    password: 'secret_password',
  });
  console.assert(newStaff.username === 'warehouse_intern', 'Username matches');
  console.assert(newStaff.role === 'staff', 'Role matches');

  const updatedStaff = await repo.updateStaffUser(newStaff.id, {
    name: 'Senior Tommy',
    role: 'admin',
  });
  console.assert(updatedStaff.name === 'Senior Tommy', 'Name updated');
  console.assert(updatedStaff.role === 'admin', 'Role updated to admin');

  await repo.deleteStaffUser(newStaff.id);
  const staffUsers = await repo.getStaffUsers();
  console.assert(!staffUsers.some((u) => u.id === newStaff.id), 'Deleted staff should not exist');
  console.log('✅ Test 16 Passed: Staff user CRUD verified.');

  // ==========================================
  // Test 17: System Audit Logs Stream
  // ==========================================
  console.log('Test 17: Testing System Audit Logs Stream...');
  const auditLogs = await repo.getAllStatusHistory({ limit: 50 });
  console.assert(auditLogs.length > 0, 'Audit logs should contain activity entries');
  console.assert(auditLogs[0].changed_by_name !== undefined, 'Enriched staff name should be present');
  console.log('✅ Test 17 Passed: Audit logs stream verified.');

  console.log('🎉 ALL REPOSITORY TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
