import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DimensionDetail from "./pages/DimensionDetail";
import CertificationDetail from "./pages/CertificationDetail";
import Start from "./pages/Start";
import Assess from "./pages/Assess";
import Results from "./pages/Results";

export default function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dimensions/:dimId" element={<DimensionDetail />} />
        <Route path="/certifications/:certId" element={<CertificationDetail />} />
        <Route path="/start" element={<Start />} />
        <Route path="/assess" element={<Assess />} />
        <Route path="/results" element={<Results />} />
      </Routes>
      <Footer />
    </div>
  );
}
