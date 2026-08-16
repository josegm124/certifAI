import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import RequireIntake from "./components/RequireIntake";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DimensionDetail from "./pages/DimensionDetail";
import CertificationDetail from "./pages/CertificationDetail";
import Start from "./pages/Start";
import Assess from "./pages/Assess";
import Results from "./pages/Results";
import Upgrade from "./pages/Upgrade";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Evidence from "./pages/Evidence";
import { getActiveAssessment, getMe } from "./lib/api";
import { useStore } from "./store/useStore";

export default function App() {
  const { setAuth, setAssessment } = useStore();
  useEffect(() => {
    let active = true;
    getMe().then(async ({ profile }) => {
      if (!active) return;
      setAuth(profile);
      const response = await getActiveAssessment();
      if (active) setAssessment(response.assessment);
    }).catch(() => { if (active) setAuth(null); });
    return () => { active = false; };
  }, [setAuth, setAssessment]);
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<RequireIntake><Profile /></RequireIntake>} />
        <Route path="/dashboard" element={<RequireIntake><Dashboard /></RequireIntake>} />
        <Route path="/dimensions/:dimId" element={<RequireIntake assessment><DimensionDetail /></RequireIntake>} />
        <Route path="/certifications/:certId" element={<RequireIntake assessment><CertificationDetail /></RequireIntake>} />
        <Route path="/start" element={<RequireIntake><Start /></RequireIntake>} />
        <Route path="/assess" element={<RequireIntake assessment><Assess /></RequireIntake>} />
        <Route path="/results" element={<RequireIntake assessment><Results /></RequireIntake>} />
        <Route path="/upgrade" element={<RequireIntake><Upgrade /></RequireIntake>} />
        <Route path="/evidence/:id" element={<RequireIntake><Evidence /></RequireIntake>} />
      </Routes>
      <Footer />
    </div>
  );
}
