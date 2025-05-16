import { setupTestData } from './testSetup';

export async function setup() {
  console.log('Setting up test environment...');
  await setupTestData();
  console.log('Test environment setup complete.');
}

setup().catch(console.error);