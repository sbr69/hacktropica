"use client";

import React, { useState, useEffect } from 'react';
import RoleProtectedRoute from '../../../components/RoleProtectedRoute';
import { motion } from 'framer-motion';
import { api } from '../../../services/api';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
};

const MOCK_QUERY_DATA = {
  total_queries: 12450,
  total_students: 450,
  at_risk_students: [
    { name: "Rahul Sharma", roll: "CS2101", total_queries: 85, top_subjects: ["data_structures", "algorithms"] },
    { name: "Priya Varma", roll: "CS2124", total_queries: 72, top_subjects: ["operating_systems"] },
    { name: "Amit Patel", roll: "CS2145", total_queries: 64, top_subjects: ["dbms"] }
  ],
  at_risk_count: 3,
  weak_domains: [
    { subject: "Data Structures", proficiency: 42, struggling_students: ["Rahul Sharma", "Amit Patel"] },
    { subject: "Operating Systems", proficiency: 58 },
    { subject: "Algorithms", proficiency: 48, struggling_students: ["Rahul Sharma"] }
  ],
  weekly_data: [
    { date: "28/03", queries: 120 },
    { date: "29/03", queries: 150 },
    { date: "30/03", queries: 90 },
    { date: "31/03", queries: 200 },
    { date: "01/04", queries: 180 },
    { date: "02/04", queries: 220 },
    { date: "03/04", queries: 160 }
  ],
  stream: "Computer Science"
};

export default function QueryAnalytics() {
  const [data, setData] = useState(MOCK_QUERY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.analytics.overview()
      .then(result => {
        setData(result || MOCK_QUERY_DATA);
        setLoading(false);
      })
      .catch(err => {
        // Fallback to mock data on error for demo purposes
        setData(MOCK_QUERY_DATA);
        setLoading(false);
      });
  }, []);

  const totalQueries = data?.total_queries || 0;
  const totalStudents = data?.total_students || 0;
  const atRiskStudents = data?.at_risk_students || [];
  const atRiskCount = data?.at_risk_count || 0;
  const weakDomains = data?.weak_domains || [];
  const weeklyData = data?.weekly_data || [];
  const stream = data?.stream || 'N/A';

  return (
    <RoleProtectedRoute routeName="query-analytics">
    <motion.div 
      className="p-6 md:p-8 min-h-full font-['Space_Grotesk'] text-[#2c2f30]"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-neutral-200 pb-6">
        <div>
          <span className="uppercase tracking-widest text-[12px] font-bold text-primary-600 mb-1 block">
            Analytics
          </span>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Query Analytics Overview</h1>
          <p className="text-sm text-neutral-500 mt-2 font-medium">
            Monitor student query patterns, at-risk students, and weak domains for <span className="uppercase font-bold text-neutral-700">{stream}</span> stream.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-neutral-400">Loading analytics...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-red-300 mb-2">error</span>
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Queries */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex items-start justify-between relative">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-neutral-500">Total Queries</span>
                <span className="material-symbols-outlined text-primary-600 text-xl">forum</span>
              </div>
              <div className="flex items-baseline gap-2 relative">
                <span className="text-3xl font-black tracking-tight">{totalQueries.toLocaleString()}</span>
                <span className="text-xs text-neutral-500 font-medium">All Time</span>
              </div>
            </div>

            {/* At-Risk Students */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex items-start justify-between relative">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-neutral-500">At-Risk Students</span>
                <span className="material-symbols-outlined text-red-600 text-xl">warning</span>
              </div>
              <div className="flex items-baseline gap-2 relative">
                <span className="text-3xl font-black tracking-tight text-red-600">{atRiskCount}</span>
                <span className="text-xs text-red-400 font-bold">Needs Attention</span>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex items-start justify-between relative">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-neutral-500">Students Tracked</span>
                <span className="material-symbols-outlined text-emerald-600 text-xl">school</span>
              </div>
              <div className="flex items-baseline gap-2 relative">
                <span className="text-3xl font-black tracking-tight">{totalStudents}</span>
                <span className="text-xs text-emerald-600 font-bold uppercase">{stream} stream</span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Weekly Activity Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-6 lg:p-8 border border-neutral-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-neutral-900 tracking-wider uppercase">Weekly Query Activity</h3>
                <span className="material-symbols-outlined text-neutral-400">bar_chart</span>
              </div>
              
              {weeklyData.length > 0 ? (
                <div className="flex items-end gap-3 h-48">
                  {weeklyData.map((day, idx) => {
                    const maxVal = Math.max(...weeklyData.map(d => d.queries), 1);
                    const height = Math.max((day.queries / maxVal) * 100, 4);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-neutral-600">{day.queries}</span>
                        <div 
                          className="w-full bg-primary-500 rounded-t-lg transition-all duration-500 hover:bg-primary-600"
                          style={{ height: `${height}%`, minHeight: '8px' }}
                        ></div>
                        <span className="text-[10px] font-medium text-neutral-400">{day.date.split('/').slice(0, 2).join('/')}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-neutral-400 font-medium">No weekly data available yet.</p>
                </div>
              )}
            </div>

            {/* Weak Domains Card */}
            <div className="bg-white rounded-xl p-6 lg:p-8 border border-neutral-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-neutral-900 tracking-wider uppercase">WEAK DOMAINS</h3>
                <span className="material-symbols-outlined text-neutral-400 text-lg">analytics</span>
              </div>
              
              {weakDomains.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-neutral-400 font-medium">No weak domains detected yet.</p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-center">
                  {weakDomains.map((domain, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-sm font-bold text-neutral-900 capitalize">{domain.subject}</span>
                          {domain.struggling_students && domain.struggling_students.length > 0 && (
                            <p className="text-[10px] text-neutral-500 mt-1 font-medium">
                              Struggling: {domain.struggling_students.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-bold ${domain.proficiency < 50 ? 'text-red-600' : 'text-primary-600'}`}>
                          {domain.proficiency}% Proficiency
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${domain.proficiency < 50 ? 'bg-red-500' : 'bg-primary-600'}`} 
                          style={{ width: `${domain.proficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* At-Risk Students List */}
          <div className="bg-white rounded-xl p-6 lg:p-8 border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-neutral-900 tracking-wider uppercase">AT-RISK STUDENTS</h3>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Students with unusually high query counts
              </span>
            </div>
            
            {atRiskStudents.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-300 mb-2">verified</span>
                  <p className="text-sm text-emerald-600 font-medium">No at-risk students detected!</p>
                  <p className="text-xs text-neutral-400 mt-1">All students are within normal query ranges.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {atRiskStudents.map((student, idx) => (
                  <div key={student.uid || idx} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 border-2 border-white shadow-sm">
                        {student.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 text-sm">{student.name}</h4>
                        <p className="text-[10px] font-medium text-neutral-500">
                          Roll: {student.roll} • {student.total_queries} queries
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {student.top_subjects && student.top_subjects.length > 0 && (
                        <div className="hidden sm:flex gap-2">
                          {student.top_subjects.slice(0, 2).map((subj, sIdx) => (
                            <span key={sIdx} className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-1 rounded capitalize">
                              {subj.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        student.total_queries > 50 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {student.total_queries > 50 ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </motion.div>
    </RoleProtectedRoute>
  );
}
