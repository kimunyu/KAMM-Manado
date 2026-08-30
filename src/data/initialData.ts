import { Cabang, Posko, User, MediatorKontrak, FULog, ExCustomer, ExCustomerFULog } from '../types';
import { SEED_USERS, SEED_CABANG, SEED_POSKO } from './seedData';
import { SEED_MEDS_MANADO } from './seedMedsManado';
import { SEED_MEDS_TUMINTING } from './seedMedsTuminting';
import { SEED_EX_CUSTOMERS, SEED_EX_CUSTOMER_FU_LOGS } from './seedExCustomers';

export const INITIAL_CABANG: Cabang[] = SEED_CABANG;

export const INITIAL_POSKO: Posko[] = SEED_POSKO;

export const INITIAL_USERS: User[] = SEED_USERS;

export const INITIAL_MEDIATORS: MediatorKontrak[] = [
  ...SEED_MEDS_MANADO,
  ...SEED_MEDS_TUMINTING
];

export const INITIAL_FU_LOGS: FULog[] = [];

export const INITIAL_EX_CUSTOMERS: ExCustomer[] = SEED_EX_CUSTOMERS;

export const INITIAL_EX_CUSTOMER_FU_LOGS: ExCustomerFULog[] = SEED_EX_CUSTOMER_FU_LOGS;

