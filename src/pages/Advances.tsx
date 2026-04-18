import React, { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, Timestamp, where, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { Plus, Trash2, Building2, Calendar as CalendarIcon, User as UserIcon } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { useSite } from "../lib/SiteContext";

export function Advances() {
  const { appUser } = useAuth();
  const { currentSite } = useSite();
  const [advances, setAdvances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEmpId, setFormEmpId] = useState('');
  const [formAmount, setFormAmount] = useState('');

  const loadData = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "employees"), where("siteId", "==", currentSite.id)));
      setEmployees(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const q = query(
        collection(db, "advances"), 
        where("siteId", "==", currentSite.id),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const snap = await getDocs(q);
      
      const advData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort advances chronologically
      advData.sort((a: any, b: any) => a.date.localeCompare(b.date));
      setAdvances(advData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, currentSite]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appUser || !currentSite) return;
    
    if (!formEmpId || !formAmount || !formDate) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const newRef = doc(collection(db, "advances"));
      await setDoc(newRef, {
        employeeId: formEmpId,
        siteId: currentSite.id,
        date: formDate,
        amount: Number(formAmount),
        createdAt: Timestamp.now()
      });
      setShowModal(false);
      setFormAmount('');
      setFormEmpId('');
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error saving advance");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advance entry?")) return;
    try {
      await deleteDoc(doc(db, "advances", id));
      loadData();
    } catch (e) {
      console.log(e);
      alert("Delete failed");
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Advances</h1>
          <p className="text-text-muted text-[13px]">Track advance payments distributed to employees</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] bg-white outline-none focus:border-primary"
          />
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Pay Advance</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-border flex flex-col flex-1 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div className="font-semibold text-[15px] text-text-main flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {currentSite?.name} - Advance History
          </div>
          <div className="text-[13px] font-semibold text-primary/80 bg-blue-50 px-3 py-1 rounded-[4px] border border-blue-100">
            Total Distributed: ₹ {advances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)}
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[13px] text-text-main border-collapse">
            <thead className="bg-[#f8fafc] text-text-muted font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Date</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Employee</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Emp ID</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Amount (₹)</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-text-muted">Loading...</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-text-muted">No advances recorded for this month.</td></tr>
              ) : (
                advances.map(adv => {
                  const emp = employees.find(e => e.id === adv.employeeId);
                  return (
                    <tr key={adv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-text-muted">
                        {new Date(adv.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-text-main flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-text-muted/70" />
                        {emp?.name || adv.employeeId}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-mono text-[12px] text-text-muted">
                        {emp?.empId || '-'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-semibold text-[#b45309]">
                        ₹ {adv.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <button onClick={() => handleDelete(adv.id)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-sm p-6 border border-border">
            <h2 className="text-lg font-bold text-text-main mb-4">Pay Advance</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Date</label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="date" 
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-[6px] text-[13px] focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Employee</label>
                <select 
                  required
                  value={formEmpId}
                  onChange={e => setFormEmpId(e.target.value)}
                  className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary bg-white"
                >
                  <option value="" disabled>Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Advance Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] font-medium text-text-main focus:outline-none focus:border-primary" 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] font-medium text-text-muted hover:bg-gray-50 rounded-[6px]">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-[6px] hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
