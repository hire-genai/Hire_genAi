'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // If we have a return session, delegate to the return handler
    if (sessionId) {
      router.replace(`/payment/return?session_id=${sessionId}${status ? `&status=${status}` : ''}`);
    } else {
      router.replace('/pricing');
    }
  }, [sessionId, status, router]);

  // Show error message while redirecting, so tests can detect it
  if (status === 'failed' || status === 'cancel') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03110A' }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
          <p style={{ color: '#ef4444', fontSize: '18px', marginBottom: '16px' }}>
            Payment was not completed. Please try again.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03110A' }}>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
        Redirecting...
      </div>
    </div>
  );
}
