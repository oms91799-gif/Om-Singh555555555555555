import { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, Timestamp, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RefreshCw, Save, Building2 } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { useSite } from "../lib/SiteContext";

export function Payroll() {
  const { currentSite } = useSite();
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<Record<string, any>>({});
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      // Get all employees for this site
      const eSnap = await getDocs(query(collection(db, "employees"), where("siteId", "==", currentSite.id)));
      const empData = eSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setEmployees(empData);

      // We should sum up attendances for the selected month to prefill if payroll doesn't exist
      // Since querying by prefix isn't standard in Firestore without >= and <=, we fetch all for month using date bounds
      const startDate = `${month}-01`;
      const endDate = `${month}-31`; // good enough for string comparison
      
      const attSnap = await getDocs(query(
        collection(db, "attendances"), 
        where("date", ">=", startDate), 
        where("date", "<=", endDate),
        where("status", "==", "approved"),
        where("siteId", "==", currentSite.id)
      ));
      
      const attendanceSummary: Record<string, { duties: number, incHours: number }> = {};
      attSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!attendanceSummary[data.employeeId]) {
          attendanceSummary[data.employeeId] = { duties: 0, incHours: 0 };
        }
        attendanceSummary[data.employeeId].duties += data.duty;
        attendanceSummary[data.employeeId].incHours += data.productionIncentiveHours;
      });

      // Sum logic: Fetch advances for the month
      const advSnap = await getDocs(query(
        collection(db, "advances"),
        where("siteId", "==", currentSite.id),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      ));
      const advanceSummary: Record<string, number> = {};
      advSnap.docs.forEach(doc => {
        const data = doc.data();
        advanceSummary[data.employeeId] = (advanceSummary[data.employeeId] || 0) + data.amount;
      });

      // Fetch saved payrolls for the month
      const pSnap = await getDocs(query(collection(db, "payrolls"), where("month", "==", month)));
      const pData: Record<string, any> = {};
      pSnap.docs.forEach(doc => {
        const data = doc.data();
        pData[data.employeeId] = { id: doc.id, ...data };
      });

      // Merge defaults for those who don't have payrolls yet
      const mergedPayrolls: Record<string, any> = {};
      empData.forEach(emp => {
        const summary = attendanceSummary[emp.id] || { duties: 0, incHours: 0 };
        const calculatedAdvance = advanceSummary[emp.id] || 0;
        
        if (pData[emp.id]) {
          mergedPayrolls[emp.id] = {
            ...pData[emp.id],
            duties: pData[emp.id].duties ?? summary.duties,
            incHours: pData[emp.id].incHours ?? summary.incHours,
            advance: pData[emp.id].status === 'draft' ? calculatedAdvance : pData[emp.id].advance
          };
          // Recalculate net if draft is inheriting a new dynamic advance
          if (pData[emp.id].status === 'draft') {
            const p = mergedPayrolls[emp.id];
            p.netSalary = p.basicSalary + p.productionIncentiveAmount + p.hra + p.attendanceAward + p.bonus 
                        - p.epfDeduction - p.esiDeduction - p.advance - p.foodDeduction - p.penalty - p.otherDeduction;
          }
        } else {
          const basicSalary = summary.duties * emp.dailyRate;
          const productionIncentiveAmount = summary.incHours * emp.productionIncentiveRate;
          
          const epfDeduction = emp.epfApplicable ? basicSalary * 0.12 : 0;
          const esiDeduction = emp.esiApplicable ? (basicSalary + productionIncentiveAmount) * 0.0075 : 0;

          mergedPayrolls[emp.id] = {
            employeeId: emp.id,
            month,
            duties: summary.duties,
            incHours: summary.incHours,
            basicSalary,
            productionIncentiveAmount,
            advance: calculatedAdvance,
            foodDeduction: 0,
            penalty: 0,
            otherDeduction: 0,
            hra: 0,
            attendanceAward: 0,
            bonus: 0,
            epfDeduction,
            esiDeduction,
            netSalary: basicSalary + productionIncentiveAmount - epfDeduction - esiDeduction - calculatedAdvance,
            status: "draft"
          };
        }
      });
      
      setPayrolls(mergedPayrolls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, currentSite]);

  const handleChange = (empId: string, field: string, value: string) => {
    setPayrolls(prev => {
      const p = { ...prev[empId] };
      const emp = employees.find(e => e.id === empId);
      if (!emp) return prev;
      
      p[field] = Number(value) || 0;
      
      if (field === 'duties') {
        p.basicSalary = p.duties * emp.dailyRate;
      }
      if (field === 'incHours') {
        p.productionIncentiveAmount = p.incHours * emp.productionIncentiveRate;
      }
      
      if (['duties', 'incHours', 'basicSalary', 'productionIncentiveAmount'].includes(field)) {
        p.epfDeduction = emp.epfApplicable ? p.basicSalary * 0.12 : 0;
        p.esiDeduction = emp.esiApplicable ? (p.basicSalary + p.productionIncentiveAmount) * 0.0075 : 0;
      }
      
      // Recalculate Net Salary
      p.netSalary = p.basicSalary + p.productionIncentiveAmount + p.hra + p.attendanceAward + p.bonus 
                  - p.epfDeduction - p.esiDeduction - p.advance - p.foodDeduction - p.penalty - p.otherDeduction;
                  
      return { ...prev, [empId]: p };
    });
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      const batch = Object.values(payrolls).map(async (p: any) => {
        const pid = p.id || `${month}_${p.employeeId}`;
        await setDoc(doc(db, "payrolls", pid), {
          ...p,
          status: "finalized",
          createdAt: p.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
      await Promise.all(batch);
      alert("Payroll Saved Successfully!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error saving payroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">Payroll Generation</h1>
          <p className="text-text-muted text-[13px]">Calculate & Finalize Monthly Salaries based on Approved Attendance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] bg-white outline-none focus:border-primary"
          />
          <button 
            onClick={loadData}
            className="bg-white border border-border text-text-muted px-3 py-1.5 rounded-[6px] hover:bg-gray-50 transition flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSaveAll}
            className="bg-primary hover:bg-blue-700 text-white px-4 py-1.5 rounded-[6px] text-[13px] font-medium flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save All</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-border flex flex-col flex-1 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50/50">
          <div className="font-semibold text-[15px] text-text-main flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {currentSite?.name} - Payroll Table
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[13px] text-text-main border-collapse whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-text-muted font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold sticky left-0 bg-[#f8fafc] z-10 border-r border-border drop-shadow-sm">Employee</th>
                <th className="px-5 py-3 font-semibold text-primary">Duties</th>
                <th className="px-5 py-3 font-semibold">Basic (₹)</th>
                <th className="px-5 py-3 font-semibold text-primary">OT (Hrs)</th>
                <th className="px-5 py-3 font-semibold">OT (₹)</th>
                <th className="px-5 py-3 font-semibold">HRA</th>
                <th className="px-5 py-3 font-semibold">Award</th>
                <th className="px-5 py-3 font-semibold">Bonus</th>
                <th className="px-5 py-3 font-semibold text-warning">Advance</th>
                <th className="px-5 py-3 font-semibold text-warning">Food</th>
                <th className="px-5 py-3 font-semibold text-warning">Penalty</th>
                <th className="px-5 py-3 font-semibold text-warning">Other</th>
                <th className="px-5 py-3 font-semibold text-warning">EPF (12%)</th>
                <th className="px-5 py-3 font-semibold text-warning">ESI (0.75%)</th>
                <th className="px-5 py-3 font-semibold text-primary">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={13} className="px-5 py-8 text-center text-text-muted">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={13} className="px-5 py-8 text-center text-text-muted">No employees found.</td></tr>
              ) : (
                employees.map(emp => {
                  const p = payrolls[emp.id];
                  if (!p) return null;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-medium text-text-main sticky left-0 bg-white border-r border-border">
                        <div className="font-semibold">{emp.name}</div>
                        <div className="text-[11px] text-text-muted text-left">ID: {emp.empId}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.5" value={p.duties} onChange={e => handleChange(emp.id, 'duties', e.target.value)} className="w-[64px] border border-primary/30 bg-blue-50/50 rounded-[4px] px-2 py-1 text-center text-[13px] font-semibold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="px-5 py-2.5 text-text-muted">{p.basicSalary.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.5" value={p.incHours} onChange={e => handleChange(emp.id, 'incHours', e.target.value)} className="w-[64px] border border-primary/30 bg-blue-50/50 rounded-[4px] px-2 py-1 text-center text-[13px] font-semibold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="px-5 py-2.5 text-text-muted">{p.productionIncentiveAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.hra} onChange={e => handleChange(emp.id, 'hra', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.attendanceAward} onChange={e => handleChange(emp.id, 'attendanceAward', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.bonus} onChange={e => handleChange(emp.id, 'bonus', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary" />
                      </td>
                      
                      <td className="px-3 py-2">
                        <input type="number" value={p.advance} onChange={e => handleChange(emp.id, 'advance', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary text-warning" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.foodDeduction} onChange={e => handleChange(emp.id, 'foodDeduction', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary text-warning" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.penalty} onChange={e => handleChange(emp.id, 'penalty', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary text-warning" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={p.otherDeduction} onChange={e => handleChange(emp.id, 'otherDeduction', e.target.value)} className="w-[72px] border border-border rounded-[4px] px-2 py-1 text-right text-[13px] outline-none focus:border-primary text-warning" />
                      </td>
                      
                      <td className="px-5 py-2.5 text-warning">{p.epfDeduction.toFixed(2)}</td>
                      <td className="px-5 py-2.5 text-warning">{p.esiDeduction.toFixed(2)}</td>
                      
                      <td className="px-5 py-2.5 font-bold text-[#166534] bg-[#dcfce7]/30">
                        ₹ {p.netSalary.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
