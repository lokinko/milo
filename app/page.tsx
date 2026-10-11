import Dashboard from './dashboard';
import { requireUser } from '../lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home(){ await requireUser(); return <Dashboard/>; }
