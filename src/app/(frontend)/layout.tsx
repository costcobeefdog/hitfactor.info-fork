import { Divider } from "primereact/divider";

import { Footer } from "../../components/Footer";
import { Navigation } from "../../components/Navigation";
import { Providers } from "../../components/Providers";

import "./frontend.css";

interface FrontendLayoutProps {
  children: React.ReactNode;
}

const FrontendLayout = ({ children }: FrontendLayoutProps) => (
  <Providers>
    <div className="card relative min-h-screen">
      <div style={{ paddingBottom: "13rem" }}>
        <Navigation />
        {children}
        <div className="absolute h-13rem bottom-0 w-full">
          <Divider />
          <Footer />
        </div>
      </div>
    </div>
  </Providers>
);

export default FrontendLayout;
