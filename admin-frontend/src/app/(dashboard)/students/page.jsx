'use client';
import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Users, AlertCircle, Filter, ChevronDown, Copy, Check, MoreVertical, Upload, FileText, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import { api } from '../../../services/api';

export default function StudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStream, setFilterStream] = useState('All');
  const [filterSem, setFilterSem] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Enroll students state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState({ type: '', message: '' });
  const [previewData, setPreviewData] = useState(null);
  const [headers, setHeaders] = useState([]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseFile = (fileToParse) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const delimiter = fileToParse.name.endsWith('.tsv') ? '\t' : ',';
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const parsedHeaders = lines[0].split(delimiter).map(h => h.trim());
        setHeaders(parsedHeaders);
        
        const dataRows = [];
        for (let i = 1; i < Math.min(lines.length, 51); i++) {
          const values = lines[i].split(delimiter).map(v => v.trim());
          const rowObj = {};
          parsedHeaders.forEach((header, index) => {
            rowObj[header] = values[index] !== undefined ? values[index] : '';
          });
          dataRows.push(rowObj);
        }
        setPreviewData({ rows: dataRows, totalRows: lines.length - 1 });
      }
    };
    reader.readAsText(fileToParse);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.tsv')) {
        setFile(selectedFile);
        setEnrollStatus({ type: '', message: '' });
        parseFile(selectedFile);
      } else {
        setFile(null);
        setPreviewData(null);
        setHeaders([]);
        setEnrollStatus({ type: 'error', message: 'Please upload a valid .csv or .tsv file.' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setEnrollStatus({ type: 'error', message: 'No file selected.' });
      return;
    }

    setIsUploading(true);
    setEnrollStatus({ type: '', message: '' });

    try {
      // Read CSV file as text — backend expects JSON with csv_data string
      const csvText = await file.text();

      const data = await api.admin.enroll(csvText);

      setEnrollStatus({ type: 'success', message: data.message || `Successfully enrolled students.` });
      setFile(null);
      setPreviewData(null);
      setHeaders([]);
      const fileInput = document.getElementById('student-file-upload');
      if (fileInput) fileInput.value = '';

      // Refresh student list
      setTimeout(async () => {
        setShowEnrollModal(false);
        try {
          const refreshed = await api.admin.students();
          setStudents(refreshed);
        } catch (_) {
          window.location.reload();
        }
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      setEnrollStatus({ type: 'error', message: error.message || 'Failed to enroll students.' });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const data = await api.admin.students();
        setStudents(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch student records.');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const streams = useMemo(() => {
    const s = new Set(students.map(st => st.stream).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [students]);

  const semesters = useMemo(() => {
    const s = new Set(students.map(st => st.sem).filter(Boolean));
    return ['All', ...Array.from(s).sort((a,b) => Number(a)-Number(b))];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.roll?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStream = filterStream === 'All' || student.stream === filterStream;
      const matchSem = filterSem === 'All' || student.sem === filterSem;
      return matchSearch && matchStream && matchSem;
    });
  }, [students, searchTerm, filterStream, filterSem]);

  if (loading) {
    return (
      <RoleProtectedRoute requiredRoles={['admin', 'superuser']} routeName="student-records">
        <div className="px-4 py-4 md:px-6 md:py-6 w-full mx-auto space-y-6 font-sans animate-pulse">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-3">
              <div className="h-8 bg-neutral-200 rounded-md w-64"></div>
              <div className="h-4 bg-neutral-200 rounded-md w-80"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-neutral-200 rounded-lg w-64"></div>
              <div className="h-10 bg-neutral-200 rounded-lg w-32"></div>
              <div className="h-10 bg-neutral-200 rounded-lg w-32"></div>
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="h-10 bg-neutral-100 rounded-md w-full"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 py-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0"></div>
                <div className="h-5 bg-neutral-200 rounded-md w-48"></div>
                <div className="h-5 bg-neutral-200 rounded-md w-32 ml-auto"></div>
                <div className="h-5 bg-neutral-200 rounded-md w-24"></div>
                <div className="h-5 bg-neutral-200 rounded-md w-24"></div>
                <div className="h-5 bg-neutral-200 rounded-md w-48"></div>
              </div>
            ))}
          </div>
        </div>
      </RoleProtectedRoute>
    );
  }

  return (
    <RoleProtectedRoute requiredRoles={['admin', 'superuser']} routeName="student-records">
      <div className="px-6 py-6 md:px-8 md:py-8 w-full mx-auto space-y-6 font-sans">
        {/* Header & Filter Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">Student Directory</h1>
            <p className="text-[14px] text-neutral-500 mt-1">Manage and view enrolled student details</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Enroll New Student Button */}
            <button
              onClick={() => setShowEnrollModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"
            >
              <Users className="w-4 h-4" /> Enroll New Student
            </button>

            <div className="relative group w-full sm:w-auto">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 text-[14px] border border-neutral-200 bg-white rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-full sm:w-64 transition-all outline-none text-neutral-900 placeholder-neutral-400 shadow-sm"
              />
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto hover:opacity-90 transition-opacity">
                <select
                  value={filterStream}
                  onChange={(e) => setFilterStream(e.target.value)}
                  className="px-4 py-2.5 text-[14px] border border-neutral-200 bg-white rounded-lg outline-none text-neutral-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-10 w-full font-medium shadow-sm"
                >
                  <option value="All">All Streams</option>
                  {streams.filter(s => s !== 'All').map(stream => (
                    <option key={stream} value={stream}>{stream}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </div>
              </div>

              <div className="relative w-full sm:w-auto hover:opacity-90 transition-opacity">
                <select
                  value={filterSem}
                  onChange={(e) => setFilterSem(e.target.value)}
                  className="px-4 py-2.5 text-[14px] border border-neutral-200 bg-white rounded-lg outline-none text-neutral-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-10 w-full font-medium shadow-sm"
                >
                  <option value="All">All Sems</option>
                  {semesters.filter(s => s !== 'All').map(sem => (
                    <option key={sem} value={sem}>Sem {sem}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] overflow-hidden">
          {error ? (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl m-6 border border-red-100">
              <AlertCircle className="w-8 h-8 mx-auto mb-3" />
              <p>{error}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200 mt-4">
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-neutral-100 rotate-3 transition-transform hover:rotate-6">
                  <Users className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">No students found</h3>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto">We couldn't find any students matching your search criteria. Try adjusting your filters or search terms.</p>
                {(searchTerm || filterStream !== 'All' || filterSem !== 'All') && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStream('All');
                      setFilterSem('All');
                    }}
                    className="mt-6 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500">Name</th>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500">Roll No</th>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500">Stream</th>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500">Semester</th>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500">Email</th>
                      <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider text-neutral-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {filteredStudents.map((student, idx) => {
                      // fallback for initials
                      const initials = student.name 
                        ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                        : 'NA';
                      
                      return (
                      <tr 
                        key={student.uid || student.roll || idx} 
                        className="hover:bg-indigo-50/30 transition-all duration-200 group cursor-default"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[12px] font-bold shrink-0 shadow-sm border border-indigo-100 transition-transform group-hover:scale-105 duration-300">
                                {initials}
                            </div>
                            <span className="font-semibold text-neutral-900 text-[14px] group-hover:text-indigo-700 transition-colors">{student.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleCopy(student.roll, `roll-${idx}`)}
                            className="flex items-center gap-2 group/copy text-left hover:bg-neutral-50 px-2 py-1 -ml-2 rounded-md transition-colors"
                            title="Copy Roll No"
                          >
                            <span className="font-mono text-neutral-700 text-[13px] font-medium group-hover/copy:text-indigo-600 transition-colors">
                              {student.roll || 'N/A'}
                            </span>
                            {copiedId === `roll-${idx}` ? 
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> : 
                              <Copy className="w-3 h-3 text-neutral-400 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            }
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-bold uppercase tracking-wider border border-neutral-200/60 shadow-sm">
                            {student.stream || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center h-6 px-3 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wider border border-emerald-200/60 shadow-sm">
                            Sem {student.sem || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-500 text-[13.5px]">
                          <button 
                            onClick={() => handleCopy(student.email, `email-${idx}`)}
                            className="flex items-center gap-2 group/copy text-left text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 px-2 py-1 -ml-2 rounded-md transition-colors w-full"
                            title="Copy Email"
                          >
                            <span className="truncate max-w-[200px] xl:max-w-none">{student.email || 'N/A'}</span>
                            {copiedId === `email-${idx}` ? 
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : 
                              <Copy className="w-3 h-3 text-neutral-400 shrink-0 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            }
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-all ml-auto block">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
          )}
        </div>

        {/* Enroll Students Modal */}
        <AnimatePresence>
          {showEnrollModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
              onClick={() => setShowEnrollModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 md:px-8 py-6 border-b border-neutral-200 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900">Batch Enroll Students</h2>
                      <p className="text-sm text-neutral-500">Upload a roster to register students into the platform.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEnrollModal(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 md:p-8 space-y-6">
                  <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                    <div className="max-w-xl mx-auto text-center">
                      <label 
                        htmlFor="student-file-upload" 
                        className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          file ? 'border-indigo-400 bg-indigo-50/50' : 'border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {file ? (
                            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                              <FileText className="w-8 h-8 text-indigo-500" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                              <Upload className="w-8 h-8 text-neutral-400" />
                            </div>
                          )}
                          
                          <p className="mb-2 text-base text-neutral-700">
                            {file ? (
                              <span className="font-semibold text-indigo-600">{file.name}</span>
                            ) : (
                              <span><span className="font-semibold text-indigo-600">Click to browse</span> or drag and drop</span>
                            )}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'CSV or TSV format up to 10MB'}
                          </p>
                          
                          {!file && (
                            <p className="text-xs text-neutral-400 mt-2">Required columns: Name, Email, Sem, Stream, Roll</p>
                          )}
                        </div>
                        <input 
                          id="student-file-upload" 
                          type="file" 
                          accept=".csv, .tsv" 
                          className="hidden" 
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>

                      <AnimatePresence>
                        {enrollStatus.message && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className={`overflow-hidden rounded-lg`}
                          >
                            <div className={`p-4 text-sm flex items-center justify-center gap-2 ${
                              enrollStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {enrollStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                              <span>{enrollStatus.message}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="mt-6 flex justify-center">
                        <button
                          className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            !file || isUploading
                              ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          }`}
                          disabled={!file || isUploading}
                          onClick={handleUpload}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                              Uploading & Processing...
                            </>
                          ) : (
                            'Enroll Now'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {previewData && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                    >
                      <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-neutral-500" />
                            Data Preview
                          </h3>
                          <p className="text-sm text-neutral-500 mt-1">
                            Showing {previewData.rows.length} of {previewData.totalRows} expected rows from <span className="font-medium text-neutral-700">{file?.name}</span>
                          </p>
                        </div>
                        <div className="flex action gap-2">
                          {['email', 'name', 'sem', 'stream', 'roll'].map(reqCol => (
                            <span key={reqCol} className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                              headers.map(h => h.toLowerCase()).includes(reqCol)
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {reqCol.charAt(0).toUpperCase() + reqCol.slice(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="lowercase text-neutral-500 bg-neutral-50/80 uppercase tracking-wider font-semibold text-[11px]">
                            <tr>
                              <th className="px-6 py-4 border-b border-neutral-200 w-12 text-center">#</th>
                              {headers.map((header, i) => (
                                <th key={i} className="px-6 py-4 border-b border-neutral-200">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 bg-white">
                            {previewData.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-6 py-3 text-neutral-400 text-center">{i + 1}</td>
                                {headers.map((header, j) => (
                                  <td key={j} className="px-6 py-3 text-neutral-800 font-medium">
                                    {row[header]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {previewData.totalRows > previewData.rows.length && (
                              <tr className="bg-neutral-50/30">
                                <td colSpan={headers.length + 1} className="px-6 py-4 text-center text-neutral-500 text-sm italic">
                                  ... plus {previewData.totalRows - previewData.rows.length} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleProtectedRoute>
  );
}
