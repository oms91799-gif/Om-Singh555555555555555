import React, { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, MapPin, Trash2, Edit } from "lucide-react";
import { PageTransition } from "../components/PageTransition";

export function Sites() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "sites")));
      setSites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const divisionsStr = fd.get("divisions") as string;
    const divisions = divisionsStr.split(',').map(d => d.trim()).filter(d => d);
    
    const docId = isEditing || `site_${Date.now()}`;
    
    try {
      await setDoc(doc(db, "sites", docId), {
        name: fd.get("name"),
        type: fd.get("type"), // 'shift' or 'line'
        divisions,
        updatedAt: Timestamp.now(),
        ...(isEditing ? {} : { createdAt: Timestamp.now() })
      }, { merge: true });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error saving site");
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this site?")) return;
    try {
      await deleteDoc(doc(db, "sites", id));
      loadData();
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <PageTransition>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Site Management</h1>
          <p className="text-text-muted text-[13px]">Configure Sites, Shifts & Lines</p>
        </div>
        <button 
          onClick={() => { setIsEditing(null); setShowModal(true); }}
          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Site</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-text-muted">Loading sites...</div>
        ) : sites.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-text-muted bg-white border border-border rounded-[8px]">No sites configured.</div>
        ) : (
          sites.map(site => (
            <div key={site.id} className="bg-white rounded-[8px] border border-border p-5 hover: shadow-sm transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#f8fafc] flex items-center justify-center border border-border">
                     <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-text-main">{site.name}</h3>
                    <p className="text-[12px] text-text-muted uppercase tracking-wider">{site.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(site.id); setShowModal(true); }} className="text-text-muted hover:text-primary transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(site.id)} className="text-text-muted hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-[11px] font-semibold text-text-muted uppercase mb-2">Divisions</p>
                <div className="flex flex-wrap gap-2">
                  {site.divisions?.map((div: string) => (
                    <span key={div} className="px-2 py-1 bg-[#eff6ff] text-primary rounded-[4px] text-[11px] font-medium border border-[#bfdbfe]">
                      {div}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-md p-6 border border-border">
            <h2 className="text-lg font-bold text-text-main mb-4">{isEditing ? "Edit Site" : "Add New Site"}</h2>
            
            {/* Find current site if editing */}
            {(() => {
               const curr = sites.find(s => s.id === isEditing) || {};
               return (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Site Name</label>
                      <input type="text" name="name" defaultValue={curr.name} required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Type</label>
                      <select name="type" required defaultValue={curr.type || "shift"} className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary">
                        <option value="shift">Shift Based</option>
                        <option value="line">Line Based</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Divisions (Comma Separated)</label>
                      <textarea name="divisions" defaultValue={curr.divisions?.join(', ')} placeholder="e.g. Shift A, Shift B, Line 1" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary min-h-[80px]" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                      <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] font-medium text-text-muted hover:bg-gray-50 rounded-[6px]">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-[6px] hover:bg-blue-700">Save Site</button>
                    </div>
                  </form>
               );
            })()}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
