"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Search, Filter } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import { Button } from '../../../components/UI/Button';
import { api } from '../../../services/api';

export default function EnrollStudentsPage() {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [previewData, setPreviewData] = useState(null);
  const [headers, setHeaders] = useState([]);

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
        setStatus({ type: '', message: '' });
        parseFile(selectedFile);
      } else {
        setFile(null);
        setPreviewData(null);
        setHeaders([]);
        setStatus({ type: 'error', message: 'Please upload a valid .csv or .tsv file.' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'No file selected.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    try {
      // Read CSV file as text — backend expects JSON with csv_data string
      const csvText = await file.text();

      const data = await api.admin.enroll(csvText);

      setStatus({ type: 'success', message: data.message || `Successfully enrolled students.` });
      setFile(null);
      setPreviewData(null);
      setHeaders([]);
      const fileInput = document.getElementById('student-file-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to enroll students.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleProtectedRoute requiredRoles={['admin', 'superuser']} routeName="enroll-students">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center action gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800">Batch Enroll Students</h1>
                  <p className="text-sm text-neutral-500">Upload a roster to register students into the knowledge platform.</p>
                </div>
              </div>
            </div>
            <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
              Download Template
            </a>
          </div>

          <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
            <div className="max-w-2xl mx-auto text-center">
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
                {status.message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className={`overflow-hidden rounded-lg`}
                  >
                    <div className={`p-4 text-sm flex items-center justify-center gap-2 ${
                      status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <span>{status.message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex justify-center">
                <Button
                  className="px-8 py-2.5 shadow-sm"
                  disabled={!file || isUploading}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading & Processing...
                    </>
                  ) : (
                    'Enroll Now'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {previewData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
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
              <div className="flex gap-2">
                {['email', 'name', 'sem', 'stream'].map(reqCol => (
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
    </RoleProtectedRoute>
  );
}
