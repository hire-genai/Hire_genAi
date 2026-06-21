import { WwwNavbar } from '@/components/layout/www-nav';
import { Hero, ProductPreview, TrustBar, Metrics, Features, DemoSection, ROISimulator, ROIAssessment, Pricing, TrustBanner, Testimonials, LinkedInPost, Company, FinalCTA, RevealObserver } from '@/components/layout/www-sections';
import WwwFooter from '@/components/layout/www-footer';

export default function HomePage() {
  return (
    <>
      <RevealObserver />
      <WwwNavbar />
      {/* offset for fixed navbar height */}
      <div style={{ paddingTop: '68px' }}>
        <Hero />
        <ProductPreview />
        <TrustBar />
        <Metrics />
        <Features />
        <DemoSection />
        <ROISimulator />
        <LinkedInPost />
        <ROIAssessment />
        <Pricing />
        <Testimonials />
        <Company />
        <FinalCTA />
        <WwwFooter />
      </div>
    </>
  );
}
