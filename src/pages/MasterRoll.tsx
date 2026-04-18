import React, { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, Timestamp, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Search, Building2 } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { useSite } from "../lib/SiteContext";

export function MasterRoll() {
  const { currentSite } = useSite();
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadEmployees = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), where("siteId", "==", currentSite.id));
      const snapshot = await getDocs(q);
      setEmployees(snapshot.docs.map(t => ({ id: t.id, ...t.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [currentSite]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentSite) return alert("Please select a site first.");
    
    const fd = new FormData(e.currentTarget);
    const id = fd.get("empId") as string;
    
    try {
      await setDoc(doc(db, "employees", id), {
        empId: id,
        siteId: currentSite.id,
        name: fd.get("name"),
        fatherName: fd.get("fatherName"),
        uanNo: fd.get("uanNo"),
        aadharNo: fd.get("aadharNo"),
        mobile: fd.get("mobile"),
        esiNo: fd.get("esiNo"),
        bankAccountNo: fd.get("bankAccountNo"),
        ifscCode: fd.get("ifscCode"),
        bankName: fd.get("bankName"),
        gender: fd.get("gender"),
        dailyRate: Number(fd.get("dailyRate")),
        epfApplicable: fd.get("epfApplicable") === 'true',
        esiApplicable: fd.get("esiApplicable") === 'true',
        designation: fd.get("designation"),
        productionIncentiveRate: Number(fd.get("productionIncentiveRate")),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setShowModal(false);
      loadEmployees();
    } catch (err) {
      console.error(err);
      alert("Error saving employee");
    }
  };

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.empId.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Master Roll</h1>
          <p className="text-text-muted text-[13px]">Employee Master & Details Review</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-[8px] border border-border flex flex-col flex-1 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div className="font-semibold text-[15px] text-text-main flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {currentSite?.name} - Employees
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search by Emp ID or Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-[6px] border border-border text-[13px] focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[13px] text-text-main border-collapse">
            <thead className="bg-[#f8fafc] text-text-muted font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Emp ID</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Employee Name</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Designation</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Daily Rate</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Bank A/c</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-text-muted">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-text-muted">No employees found.</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 whitespace-nowrap font-medium">{emp.empId}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div>{emp.name}</div>
                      <div className="text-[11px] text-text-muted">{emp.mobile}</div>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{emp.designation}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">₹{emp.dailyRate}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div>{emp.bankAccountNo}</div>
                      <div className="text-[11px] text-text-muted">{emp.bankName}</div>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded-full text-[11px] font-medium tracking-wide">Approved</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-4xl p-6 my-8 border border-border">
            <h2 className="text-lg font-bold text-text-main mb-4">Add New Employee</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Emp ID (Punching ID)*</label><input required name="empId" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Name*</label><input required name="name" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Father Name*</label><input required name="fatherName" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Gender*</label>
                <select name="gender" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary bg-white">
                  <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Aadhar No*</label><input required name="aadharNo" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Mobile No*</label><input required name="mobile" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Bank Name*</label><input required name="bankName" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Account No*</label><input required name="bankAccountNo" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">IFSC Code*</label><input required name="ifscCode" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">UAN No</label><input name="uanNo" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">ESI No</label><input name="esiNo" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Designation*</label><input required name="designation" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>

              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Daily Rate (₹)*</label><input required type="number" step="0.01" name="dailyRate" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">Prod. Incentive Rate (₹/hr)*</label><input required type="number" step="0.01" name="productionIncentiveRate" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary" /></div>
              
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">EPF Applicable?*</label>
                <select name="epfApplicable" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary bg-white"><option value="true">Yes</option><option value="false">No</option></select>
              </div>
              <div><label className="block text-[13px] font-semibold text-text-muted mb-1.5">ESI Applicable?*</label>
                <select name="esiApplicable" required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-primary bg-white"><option value="true">Yes</option><option value="false">No</option></select>
              </div>

              <div className="col-span-full mt-4 pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] font-medium text-text-muted hover:bg-gray-50 rounded-[6px]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-[6px] hover:bg-blue-700">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
