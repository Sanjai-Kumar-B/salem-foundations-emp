import { redirect } from 'next/navigation';

export default function StaffPortalRootRedirect() {
    redirect('/login');
}
