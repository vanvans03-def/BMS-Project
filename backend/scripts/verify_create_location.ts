import { location } from '../src/db' // Wait, need to use fetch or service directly?
// Better to use fetch if I want to test the full route, but service is faster for logic check.
// Let's use the service directly to avoid needing a running server.
import { locationsService } from '../src/services/locations.service';
import { sql } from '../src/db';

async function test() {
    console.log('Testing Location Creation and Retrieval...');

    // 1. Create a root building
    const uniqueName = `Test Building ${Date.now()}`;
    const newLocation = await locationsService.createLocation({
        name: uniqueName,
        type: 'Building',
        description: 'Auto-generated test building',
        parent_id: null
    });
    console.log('✅ Created:', newLocation);

    // 2. Create a floor inside it
    const newFloor = await locationsService.createLocation({
        name: 'Floor 1',
        type: 'Floor',
        description: 'First Floor',
        parent_id: newLocation.id
    });
    console.log('✅ Created Child:', newFloor);

    // 3. Fetch all
    const all = await locationsService.getAllLocations();
    console.log(`ℹ️ Total Locations: ${all.length}`);

    // 4. Verify our new ones are there
    const foundParent = all.find(l => l.id === newLocation.id);
    const foundChild = all.find(l => l.id === newFloor.id);

    if (foundParent && foundChild) {
        console.log('✅ Both locations found in getAllLocations()');
        if (foundChild.parent_id === foundParent.id) {
            console.log('✅ Parent-Child relationship preserved');
        } else {
            console.error('❌ Parent-Child relationship mismatch');
        }
    } else {
        console.error('❌ Failed to find created locations');
    }

    process.exit(0);
}

test().catch(console.error);
