import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, FileText, Plus, Save, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Papa from 'papaparse';
import { payslipService } from '../services/payslipService';
import { supabase } from '../lib/supabaseClient';
import { notifyAccountants, notifyBOD } from '../services/notificationService';

interface PayslipInputProps {
  onSuccess?: () => void;
}

export function PayslipInput({ onSuccess }: PayslipInputProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name');
        
        if (error) throw error;
        if (data) setEmployees(data);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    fetchEmployees();
  }, []);

  // Manual entry state
  const [manualEntry, setManualEntry] = useState({
    staffCode: '',
    monthYear: '',
    contract: '',
    bonus: '',
    ot: '',
    commission: '',
    allowance: '',
    otherIncome: '',
    bhxh: '',
    bhyt: '',
    bhtn: '',
    pit: '',
    otherDeduction: '',
    staffReceive: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseNum = (val: any) => {
    if (!val || val === '' || val === '-') return 0;
    return parseFloat(val.toString().replace(/,/g, '').trim()) || 0;
  };

  const formatRowForDB = (row: any) => {
    // 1. Lấy Staff code
    const user_id = row['Staff code'] ? row['Staff code'].toString().trim() : (row.staffCode || null);

    // 2. BỘ LỌC THÉP
    if (!user_id || user_id === "Staff code" || user_id.length < 30) {
      return null; 
    }

    // 3. Xử lý tháng/năm
    let month_text = "";
    let year_int = new Date().getFullYear();
    const monthRaw = row['Month'] || row.monthYear;

    if (monthRaw && monthRaw !== 'Month') {
      const parts = monthRaw.toString().split('/');
      month_text = parts[0].trim();
      if (parts.length > 1) {
        year_int = parseInt(parts[1], 10);
      }
    }

    if (!month_text || month_text === "") {
      return null;
    }

    // 4. Tính toán tiền tệ
    const total_insurance = parseNum(row['BHXH (8%)'] || row['BHXH'] || row.bhxh || 0) + 
                           parseNum(row['BHYT (1.5%)'] || row['BHYT'] || row.bhyt || 0) + 
                           parseNum(row['BHTN (1%)'] || row['BHTN'] || row.bhtn || 0);
    
    const total_allowance = parseNum(row['Allowance'] || row['Phụ cấp'] || row.allowance || 0) + 
                           parseNum(row['Parking allowance'] || row['Gửi xe'] || 0);

    // Thưởng hiệu suất bây giờ CHỈ CÒN cột performance
    const performance_bonus_total = parseNum(row['performance'] || row['Performance Bonus'] || row['Thưởng hiệu suất'] || row.bonus || 0);

    // Tách riêng khoản Khấu trừ khác (Hỗ trợ cả tên cột Others hoặc others_)
    const other_deduction = parseNum(row['Others'] || row['Khác'] || row.others || 0) + 
                           parseNum(row['others_'] || row.otherDeduction || 0); 

    const status_val = row['STATUS'] || row['Status'] || row['Trạng thái'] || row.status || 'Pending';
    const approval_val = 'pending'; // Mặc định luôn là pending khi upload mới

    return {
      user_id: user_id,
      month: month_text.toString(),
      year: year_int,
      base_salary: parseNum(row['GROSS'] || row['Contract'] || row['Base Salary'] || row['Lương cơ bản'] || row.contract || 0),
      commission: parseNum(row['Commission'] || row['Hoa hồng'] || row.commission || 0),
      ot_amount: parseNum(row['OT'] || row['Overtime'] || row['Tăng ca'] || row.ot || 0),
      performance_bonus_total: performance_bonus_total,
      allowance: total_allowance,
      other_deduction: other_deduction,
      total_insurance: total_insurance,
      tax_amount: parseNum(row['PIT'] || row['Thuế TNCN'] || row.pit || 0),
      net_salary: parseNum(row['Staff Receive'] || row['Net Salary'] || row['Thực nhận'] || row.staffReceive || 0),
      status: status_val.toString().trim(),
      approval: approval_val
    };
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      // Find the header row (the one containing "Staff code")
      let headerIndex = -1;
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        if (lines[i].includes('Staff code')) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex !== -1) {
        text = lines.slice(headerIndex).join('\n');
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const formattedData = data
            .map(row => formatRowForDB(row))
            .filter(item => item !== null);

          setParsedData(formattedData);
          if (data.length > formattedData.length) {
            setError(`Warning: ${data.length - formattedData.length} rows were skipped due to invalid Staff code or Month.`);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
        }
      });
    };
    reader.readAsText(file);
  };

  const processAndSave = async (dataToSave: any[]) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Data is already formatted if coming from CSV, but manual entry needs formatting
      const processedData = dataToSave.map(row => {
        // If it has user_id, it's likely already formatted from CSV
        if (row.user_id && row.month && row.year) return row;
        return formatRowForDB(row);
      }).filter(item => item !== null);

      // Ensure uniqueness in the batch to avoid upsert conflicts within the same request
      const uniqueDataMap = new Map();
      processedData.forEach(item => {
        const key = `${item.user_id}-${item.month}-${item.year}`;
        uniqueDataMap.set(key, item);
      });
      const finalData = Array.from(uniqueDataMap.values());

      if (finalData.length === 0) {
        throw new Error('No valid data found after processing filters.');
      }

      // Validate that all user_ids exist in the profiles table
      const employeeIds = new Set(employees.map(e => e.id));
      const invalidIds = finalData
        .filter(item => !employeeIds.has(item.user_id))
        .map(item => item.user_id);

      if (invalidIds.length > 0) {
        throw new Error(`The following Staff IDs do not exist in the system: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}. Please ensure all employees are created first.`);
      }

      const result = await payslipService.savePayslips(finalData);
      
      if (result.success) {
        setSuccess('Payslips saved successfully!');
        
        // Notify Approvers (Accountants and BOD)
        const monthYear = finalData[0]?.month + '/' + finalData[0]?.year;
        const count = finalData.length;
        
        await notifyAccountants(
          'New Payslips Uploaded',
          `${count} new payslips for ${monthYear} have been uploaded and are pending approval.`,
          'payslip'
        );
        
        await notifyBOD(
          'New Payslips Uploaded',
          `${count} new payslips for ${monthYear} have been uploaded and are pending approval.`,
          'payslip'
        );

        setParsedData([]);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setManualEntry({
          staffCode: '', monthYear: '', contract: '', bonus: '', ot: '', 
          commission: '', allowance: '', otherIncome: '', 
          bhxh: '', bhyt: '', bhtn: '', pit: '', otherDeduction: '', staffReceive: ''
        });
        if (onSuccess) onSuccess();
      } else {
        console.error('Full database error object:', result.error);
        const errorMsg = result.error?.message || 'Unknown database error';
        const errorDetails = result.error?.details ? ` (${result.error.details})` : '';
        const errorHint = result.error?.hint ? ` Hint: ${result.error.hint}` : '';
        
        if (errorMsg.includes('row-level security policy')) {
          setError(`Security Error: You do not have permission to save payslips. Please check your Supabase RLS policies for the 'payslips' table.`);
        } else {
          setError(`Failed to save payslips: ${errorMsg}${errorDetails}${errorHint}`);
        }
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(`An error occurred: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadSubmit = () => {
    if (parsedData.length === 0) {
      setError('No valid data to upload. Please check your CSV file.');
      return;
    }
    processAndSave(parsedData);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.staffCode || !manualEntry.monthYear) {
      setError('Staff code and Month/Year are required.');
      return;
    }
    processAndSave([manualEntry]);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Payslip Input</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'upload' 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload CSV
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'manual' 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] relative overflow-hidden">
        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-white font-bold animate-pulse">Processing & Uploading Data...</p>
          </div>
        )}

        {activeTab === 'upload' ? (
          <div className="space-y-6">
            <div 
              className="border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Upload C&B Data</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-6">
                Click to browse or drag and drop your CSV file here. Make sure it follows the standard C&B format.
              </p>
              
              <button 
                type="button"
                className="px-6 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4" />
                Select CSV File
              </button>

              {file && (
                <div className="mt-6 flex flex-col items-center gap-4">
                  <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-blue-300 font-medium">
                    {file.name}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadSubmit();
                    }}
                    disabled={isUploading}
                    className="px-12 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {parsedData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Preview Data ({parsedData.length} records)</h3>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-[10px] text-slate-300 border-collapse">
                    <thead className="bg-white/[0.03] text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-3 border-b border-white/10 w-16">Staff ID</th>
                        <th className="px-2 py-3 border-b border-white/10">Month</th>
                        <th className="px-2 py-3 border-b border-white/10">Base</th>
                        <th className="px-2 py-3 border-b border-white/10">Comm.</th>
                        <th className="px-2 py-3 border-b border-white/10">OT</th>
                        <th className="px-2 py-3 border-b border-white/10">Perf.</th>
                        <th className="px-2 py-3 border-b border-white/10">Allow.</th>
                        <th className="px-2 py-3 border-b border-white/10">Insur.</th>
                        <th className="px-2 py-3 border-b border-white/10">Tax</th>
                        <th className="px-2 py-3 border-b border-white/10">Other Ded.</th>
                        <th className="px-2 py-3 border-b border-white/10 text-emerald-400">Net</th>
                        <th className="px-2 py-3 border-b border-white/10">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-2 py-3 font-mono text-[9px] truncate max-w-[60px]" title={row.user_id}>
                            {row.user_id.substring(0, 8)}...
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            {(() => {
                              const monthInt = parseInt(row.month);
                              if (isNaN(monthInt)) return row.month;
                              const date = new Date();
                              date.setMonth(monthInt - 1);
                              return date.toLocaleString('en-US', { month: 'short' });
                            })()} {row.year}
                          </td>
                          <td className="px-2 py-3">{row.base_salary.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.commission.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.ot_amount.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.performance_bonus_total.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.allowance.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.total_insurance.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.tax_amount.toLocaleString()}</td>
                          <td className="px-2 py-3">{row.other_deduction.toLocaleString()}</td>
                          <td className="px-2 py-3 text-emerald-400 font-bold">{row.net_salary.toLocaleString()}</td>
                          <td className="px-2 py-3">
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${
                              row.status.toLowerCase() === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 10 && (
                    <div className="px-4 py-3 text-center text-[10px] text-slate-500 bg-white/[0.02] border-t border-white/10">
                      Showing 10 of {parsedData.length} records. All will be uploaded.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Employee *</label>
                <select 
                  required
                  value={manualEntry.staffCode}
                  onChange={e => setManualEntry({...manualEntry, staffCode: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">Select an employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                      {emp.full_name || 'Unknown'} ({emp.id.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Month/Year *</label>
                <input 
                  type="text" 
                  required
                  value={manualEntry.monthYear}
                  onChange={e => setManualEntry({...manualEntry, monthYear: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 12/2025"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Contract (Base Salary)</label>
                <input 
                  type="text" 
                  value={manualEntry.contract}
                  onChange={e => setManualEntry({...manualEntry, contract: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 10,000,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Bonus</label>
                <input 
                  type="text" 
                  value={manualEntry.bonus}
                  onChange={e => setManualEntry({...manualEntry, bonus: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 1,500,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">OT Amount</label>
                <input 
                  type="text" 
                  value={manualEntry.ot}
                  onChange={e => setManualEntry({...manualEntry, ot: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Commission</label>
                <input 
                  type="text" 
                  value={manualEntry.commission}
                  onChange={e => setManualEntry({...manualEntry, commission: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Allowance</label>
                <input 
                  type="text" 
                  value={manualEntry.allowance}
                  onChange={e => setManualEntry({...manualEntry, allowance: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 1,000,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Other Income</label>
                <input 
                  type="text" 
                  value={manualEntry.otherIncome}
                  onChange={e => setManualEntry({...manualEntry, otherIncome: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 500,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">BHXH (8%)</label>
                <input 
                  type="text" 
                  value={manualEntry.bhxh}
                  onChange={e => setManualEntry({...manualEntry, bhxh: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 800,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">BHYT (1.5%)</label>
                <input 
                  type="text" 
                  value={manualEntry.bhyt}
                  onChange={e => setManualEntry({...manualEntry, bhyt: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 150,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">BHTN (1%)</label>
                <input 
                  type="text" 
                  value={manualEntry.bhtn}
                  onChange={e => setManualEntry({...manualEntry, bhtn: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 100,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">PIT</label>
                <input 
                  type="text" 
                  value={manualEntry.pit}
                  onChange={e => setManualEntry({...manualEntry, pit: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 78,947"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Others (Deduction)</label>
                <input 
                  type="text" 
                  value={manualEntry.otherDeduction}
                  onChange={e => setManualEntry({...manualEntry, otherDeduction: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 0"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-300">Staff Receive (Net Salary)</label>
                <input 
                  type="text" 
                  value={manualEntry.staffReceive}
                  onChange={e => setManualEntry({...manualEntry, staffReceive: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 placeholder:text-slate-500 font-bold focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  placeholder="e.g. 12,500,000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={isUploading}
                className="flex items-center gap-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                {isUploading ? 'Saving...' : 'Save Payslip'}
                <Save className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
