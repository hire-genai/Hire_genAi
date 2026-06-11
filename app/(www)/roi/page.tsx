'use client';

import { WwwNavbar } from '@/components/layout/www-nav';
import WwwFooter from '@/components/layout/www-footer';
import { ROISimulator } from '@/components/layout/www-sections';

export default function ROIPage() {
  return (
    <main className="min-h-screen" style={{ background: '#03110A', color: '#fff' }}>
      <WwwNavbar />
      <div style={{ paddingTop: '68px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, color: '#fff', padding: '32px 24px 0', margin: 0 }}>ROI Calculator</h1>
        <ROISimulator />
      </div>
      <WwwFooter />
    </main>
  );
}
