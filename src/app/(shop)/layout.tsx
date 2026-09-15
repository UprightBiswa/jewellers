import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { PreviewBanner } from "@/components/storefront/preview-banner";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
