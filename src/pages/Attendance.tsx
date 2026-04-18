import React, { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, Timestamp, where, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { Plus, CheckCircle, Clock, Building2 } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { useSite } from "../lib/SiteContext";

export function Attendance() {
  const { appUser } = useAuth();
  const { currentSite } = useSite();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "employees"), where("siteId", "==", currentSite.id)));
      setEmployees(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const q = query(
        collection(db, "attendances"), 
        where("date", "==", date),
        where("siteId", "==", currentSite.id)
      );
      const snap = await getDocs(q);
      setAttendances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const adminSnap = await getDocs(query(collection(db, "users")));
      const uMap: Record<string, string> = {};
      adminSnap.docs.forEach(u => uMap[u.id] = u.data().name);
      setUsers(uMap);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, currentSite]);

  const handleMark = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appUser || !currentSite) return;
    const fd = new FormData(e.currentTarget);
    const empId = fd.get("employeeId") as string;
    
    // We generate a unique ID based on date + employee to avoid duplicates easily
    const attendanceId = `${date}_${empId}`;
    
    try {
      await setDoc(doc(db, "attendances", attendanceId), {
        employeeId: empId,
        date,
        siteId: currentSite.id,
        division: fd.get("division"),
        duty: Number(fd.get("duty")),
        productionIncentiveHours: Number(fd.get("productionIncentiveHours")),
        status: appUser.role === 'admin' ? 'approved' : 'pending',
        markedBy: appUser.uid,
        approvedBy: appUser.role === 'admin' ? appUser.uid : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error marking attendance");
    }
  };

  const handleApprove = async (id: string) => {
    if (appUser?.role !== 'admin') return;
    try {
      await setDoc(doc(db, "attendances", id), {
        status: 'approved',
        approvedBy: appUser.uid,
        updatedAt: Timestamp.now()
      }, { merge: true });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Attendance</h1>
          <p className="text-text-muted text-[13px]">Mark & Approve Daily Logs</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] bg-white outline-none focus:border-primary"
          />
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-border flex flex-col flex-1 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div className="font-semibold text-[15px] text-text-main flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {currentSite?.name} - Daily Records
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[13px] text-text-main border-collapse">
            <thead className="bg-[#f8fafc] text-text-muted font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Employee</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Shift/Line</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Duty</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Incentive (Hrs)</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Marked By</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-text-muted">Loading...</td></tr>
              ) : attendances.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-text-muted">No attendance marked for this date.</td></tr>
              ) : (
                attendances.map(att => {
                  const emp = employees.find(e => e.id === att.employeeId);
                  return (
                    <tr key={att.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 whitespace-nowrap font-medium text-text-main">
                        {emp?.name || att.employeeId} <span className="text-text-muted text-[11px] ml-2">({emp?.empId})</span>
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">{att.division}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">{att.duty === 2 ? 'Double' : 'Single'}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">{att.productionIncentiveHours}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap text-[12px]">
                        {users[att.markedBy] || "Unknown"}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        {att.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded-full text-[11px] font-medium tracking-wide">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fef3c7] text-[#92400e] rounded-full text-[11px] font-medium tracking-wide">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        {appUser?.role === 'admin' && att.status === 'pending' && (
                          <button 
                            onClick={() => handleApprove(att.id)}
                            className="text-[11px] bg-primary text-white font-medium px-2 py-1 rounded-[4px] hover:bg-blue-700"
                          >
                            Approve
                          </button>
                        )}
                        {att.status === 'approved' && att.approvedBy && (
                          <div className="text-[10px] text-text-muted uppercase tracking-wide">
                            by {users[att.approvedBy] || "Admin"}
                          </div>
                        )}
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
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-lg p-6 border border-border">
            <h2 className="text-lg font-bold text-text-main mb-4">Mark Attendance</h2>
            <form onSubmit={handleMark} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Employee</label>
                <select name="employeeId" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary">
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Duty Type</label>
                  <select name="duty" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary">
                    <option value="1">Single Duty</option>
                    <option value="2">Double Duty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Prod. Incentive (Hrs)</label>
                  <input type="number" name="productionIncentiveHours" defaultValue="0" min="0" step="0.5" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Shift / Line</label>
                <select name="division" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary">
                  <option value="">Select Division...</option>
                  {currentSite?.divisions?.map((div: string) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] font-medium text-text-muted hover:bg-gray-50 rounded-[6px]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-[6px] hover:bg-blue-700">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
