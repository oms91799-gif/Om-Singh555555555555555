import { useState, useEffect } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Download, Building2 } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { useSite } from "../lib/SiteContext";

export function Reports() {
  const { currentSite } = useSite();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "employees"), where("siteId", "==", currentSite.id)));
      const empData = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(empData);

      const pSnap = await getDocs(query(collection(db, "payrolls"), where("month", "==", month)));
      const pData = pSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setPayrolls(pData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, currentSite]);

  // Convert array of objects to CSV download
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return alert("No data available");
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(fieldName => `"${String(row[fieldName] || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dlBankTransfer = () => {
    const data = payrolls.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (!emp) return null;
      return {
        "Account Number": emp.bankAccountNo,
        "Name": emp.name,
        "Net Amount": p.netSalary.toFixed(2),
        "IFSC Code": emp.ifscCode,
        "Bank Name": emp.bankName,
        "Site Location": currentSite?.name || 'N/A'
      };
    }).filter(Boolean);
    downloadCSV(data, `Bank_Transfer_${month}`);
  };

  const dlFormXVII = () => {
    const data = payrolls.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (!emp) return null;
      return {
        "Emp ID": emp.empId,
        "Site Name": currentSite?.name || 'N/A',
        "Name": emp.name,
        "Father Name": emp.fatherName,
        "Designation": emp.designation,
        "UAN": emp.uanNo,
        "ESI No": emp.esiNo,
        "Duties": p.duties || 0,
        "Basic Salary": p.basicSalary,
        "OT (Hrs)": p.incHours || 0,
        "Incentive": p.productionIncentiveAmount,
        "HRA": p.hra,
        "Award": p.attendanceAward || 0,
        "Bonus": p.bonus,
        "Adv": p.advance,
        "Food": p.foodDeduction || 0,
        "Penalty": p.penalty || 0,
        "Other Deduct": p.otherDeduction || 0,
        "EPF Deduct": p.epfDeduction,
        "ESI Deduct": p.esiDeduction,
        "Total Deductions": (p.advance + (p.foodDeduction || 0) + (p.penalty || 0) + (p.otherDeduction || 0) + p.epfDeduction + p.esiDeduction).toFixed(2),
        "Net Paid": p.netSalary.toFixed(2)
      };
    }).filter(Boolean);
    downloadCSV(data, `Form_XVII_Register_${month}`);
  };

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-main tracking-tight">Reports & Downloads</h1>
        <p className="text-text-muted text-[13px]">Export Master Roll and Payroll configurations</p>
      </div>
      
      <div className="bg-white p-5 rounded-[8px] border border-border flex gap-6 items-end mb-6 shadow-sm">
        <div>
          <label className="block text-[13px] font-semibold text-text-muted mb-1.5 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Target Site</label>
          <div className="border border-border rounded-[6px] px-4 py-1.5 text-[13px] font-medium bg-gray-50 text-text-main h-[34px] flex items-center min-w-[200px]">
            {currentSite ? currentSite.name : "None Selected"}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-text-muted mb-1.5">Select Month</label>
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] bg-white text-text-main outline-none focus:border-primary h-[34px]"
          />
        </div>
        <button onClick={loadData} disabled={!currentSite} className="h-[34px] px-4 py-1.5 bg-sidebar border border-border text-text-main text-[13px] font-medium rounded-[6px] hover:bg-gray-50 flex items-center transition disabled:opacity-50">
          Load Payload Data
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Bank Transfer */}
        <div className="bg-white p-6 rounded-[8px] border border-border shadow-sm flex flex-col justify-between items-start h-40">
          <div>
            <h3 className="font-semibold text-[15px] text-text-main">Bank Transfer Sheet</h3>
            <p className="text-[13px] text-text-muted mt-1 leading-relaxed">Excel (CSV) containing Net Amount, A/C No, Name, IFSC Code.</p>
          </div>
          <button onClick={dlBankTransfer} className="flex items-center gap-2 text-primary text-[13px] font-semibold hover:text-blue-700">
            <Download className="w-4 h-4" /> Download Sheet
          </button>
        </div>

        {/* Form XVII */}
        <div className="bg-white p-6 rounded-[8px] border border-border shadow-sm flex flex-col justify-between items-start h-40">
          <div>
            <h3 className="font-semibold text-[15px] text-text-main">Form XVII / Wages Register</h3>
            <p className="text-[13px] text-text-muted mt-1 leading-relaxed">Complete Master Roll with full Payroll additions and deductions.</p>
          </div>
          <button onClick={dlFormXVII} className="flex items-center gap-2 text-primary text-[13px] font-semibold hover:text-blue-700">
            <Download className="w-4 h-4" /> Download Register
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
