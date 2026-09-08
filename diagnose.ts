import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './src/services/firebase';
import { DatabaseService } from './src/services/storage';

async function main() {
  try {
    console.log('Signing in as KAPOS kptm02...');
    await signInWithEmailAndPassword(auth!, 'kptm02@kamm-manado.internal', 'test1234');

    // Wait for storage initialization
    await DatabaseService.initializeAsync();

    console.log('\n--- Testing DatabaseService.assignExCustomer as KAPOS ---');
    const assignRes = await DatabaseService.assignExCustomer('08360070', 'USR-161899', 'COLDRY MALENDES');
    console.log('assignExCustomer result:', assignRes);

    console.log('\n--- Testing DatabaseService.unassignExCustomer as KAPOS ---');
    const unassignRes = await DatabaseService.unassignExCustomer('08360070');
    console.log('unassignExCustomer result:', unassignRes);

    console.log('\n--- Testing DatabaseService.assignExCustomer for 17550279 ---');
    const assignRes2 = await DatabaseService.assignExCustomer('17550279', 'USR-161899', 'COLDRY MALENDES');
    console.log('assignExCustomer result 2:', assignRes2);

  } catch (err: any) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
