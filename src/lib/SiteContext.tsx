import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export interface Site {
  id: string;
  name: string;
  type: string;
  divisions: string[];
}

interface SiteContextType {
  sites: Site[];
  currentSite: Site | null;
  setCurrentSite: (site: Site) => void;
  loading: boolean;
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "sites")));
      const fetchedSites = snap.docs.map(d => ({ id: d.id, ...d.data() } as Site));
      setSites(fetchedSites);

      // Load saved site from localStorage if it exists and is valid
      const savedSiteId = localStorage.getItem("kps_current_site_id");
      if (savedSiteId) {
        const found = fetchedSites.find(s => s.id === savedSiteId);
        if (found) {
          setCurrentSite(found);
        }
      }
    } catch (e) {
      console.error("Error fetching sites:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [user]);

  const handleSetSite = (site: Site) => {
    setCurrentSite(site);
    localStorage.setItem("kps_current_site_id", site.id);
  };

  return (
    <SiteContext.Provider value={{ sites, currentSite, setCurrentSite: handleSetSite, loading, refreshSites: fetchSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}
